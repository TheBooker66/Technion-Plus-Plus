import Darwin
import Foundation
import SafariServices
import UserNotifications

private struct BridgeError: LocalizedError {
    let errorDescription: String?
    init(_ text: String) { errorDescription = text }
}

// Safari fetches authenticated resources within the profile. Only file contents
// cross this bridge; the native extension never receives cookies or account data.
struct DownloadFiles {
    let staging: URL
    let downloads: URL
    private let files = FileManager.default

    private func temporaryFile(_ token: String) throws -> URL {
        guard let id = UUID(uuidString: token) else { throw BridgeError("Invalid transfer ID.") }
        return staging.appendingPathComponent(id.uuidString)
    }

    private func receipt(_ token: String) throws -> URL {
        try temporaryFile(token).appendingPathExtension("saved")
    }

    func alreadySaved(_ token: String) throws -> Bool {
        files.fileExists(atPath: try receipt(token).path)
    }

    func acknowledge(_ token: String) throws {
        if try alreadySaved(token) { try files.removeItem(at: receipt(token)) }
    }

    func begin(_ token: String) throws {
        try files.createDirectory(at: staging, withIntermediateDirectories: true)
        try Data().write(to: temporaryFile(token), options: .atomic)
    }

    func append(_ token: String, at offset: Int, encoded: String) throws {
        guard offset >= 0, encoded.utf8.count <= 1_000_000, let data = Data(base64Encoded: encoded) else {
            throw BridgeError("Invalid transfer data.")
        }
        let file = try FileHandle(forWritingTo: temporaryFile(token))
        defer { try? file.close() }
        guard try file.seekToEnd() == UInt64(offset) else { throw BridgeError("Unexpected transfer offset.") }
        try file.write(contentsOf: data)
    }

    func discard(_ token: String) throws {
        let url = try temporaryFile(token)
        if files.fileExists(atPath: url.path) { try files.removeItem(at: url) }
    }

    func finish(_ token: String, filename: String, size: Int) throws {
        let source = try temporaryFile(token)
        let parts = filename.components(separatedBy: "/")
        guard let leaf = parts.last, parts.count <= 32, parts.allSatisfy({
            !$0.isEmpty && !$0.hasPrefix(".") && !$0.contains(":") &&
                !$0.contains("\\") && $0.utf8.count <= 255 &&
                $0.rangeOfCharacter(from: .controlCharacters) == nil
        }) else { throw BridgeError("Invalid download filename.") }
        let input = try FileHandle(forReadingFrom: source)
        defer { try? input.close() }
        guard size >= 0, try input.seekToEnd() == UInt64(size) else { throw BridgeError("Incomplete download.") }
        try input.seek(toOffset: 0)

        // Use directory descriptors so existing links in Downloads cannot redirect a write.
        var directory = open(downloads.path, O_RDONLY | O_DIRECTORY)
        guard directory >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
        defer { close(directory) }
        for part in parts.dropLast() {
            if mkdirat(directory, part, 0o755) != 0 && errno != EEXIST {
                throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
            }
            let child = openat(directory, part, O_RDONLY | O_DIRECTORY | O_NOFOLLOW)
            guard child >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
            close(directory)
            directory = child
        }
        let hidden = ".technion-\(UUID().uuidString).download"
        let output = openat(directory, hidden, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0o644)
        guard output >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
        defer { close(output); unlinkat(directory, hidden, 0) }
        guard fcopyfile(input.fileDescriptor, output, nil, copyfile_flags_t(COPYFILE_DATA)) == 0 else {
            throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
        }
        // Tag the published inode so a retry can also recognize a completed rename
        // if the extension process exited before writing its private receipt.
        let attribute = "org.technionplusplus.download-id"
        let tag = Array(token.utf8)
        _ = tag.withUnsafeBytes { fsetxattr(output, attribute, $0.baseAddress, $0.count, 0, 0) }
        let name = leaf as NSString
        var attempt = 0
        while true {
            let suffix = name.pathExtension.isEmpty ? "" : ".\(name.pathExtension)"
            let candidate = attempt == 0 ? leaf : "\(name.deletingPathExtension) (\(attempt))\(suffix)"
            if renameatx_np(directory, hidden, directory, candidate, UInt32(RENAME_EXCL)) == 0 { break }
            guard errno == EEXIST else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
            let previous = openat(directory, candidate, O_RDONLY | O_NONBLOCK | O_NOFOLLOW)
            if previous >= 0 {
                var stored = [UInt8](repeating: 0, count: tag.count)
                let count = stored.withUnsafeMutableBytes { fgetxattr(previous, attribute, $0.baseAddress, $0.count, 0, 0) }
                close(previous)
                if count == tag.count && stored == tag { break }
            }
            attempt += 1
        }
        try Data().write(to: receipt(token), options: .atomic)
        try? files.removeItem(at: source)
    }
}

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems.first as? NSExtensionItem
        let message = item?.userInfo?[SFExtensionMessageKey] as? [String: Any] ?? [:]
        let profile: String
        if #available(macOS 14, *), let id = item?.userInfo?[SFExtensionProfileKey] as? UUID {
            profile = id.uuidString
        } else {
            profile = "Default"
        }
        Task {
            let response = NSExtensionItem()
            do {
                let saved = try await Self.handle(message, profile: profile)
                response.userInfo = [SFExtensionMessageKey: ["ok": true, "alreadySaved": saved]]
            } catch {
                response.userInfo = [SFExtensionMessageKey: ["ok": false, "error": error.localizedDescription]]
            }
            context.completeRequest(returningItems: [response])
        }
    }

    private static func handle(_ message: [String: Any], profile: String) async throws -> Bool {
        if message["action"] as? String == "notify" {
            guard let body = message["body"] as? String else { throw BridgeError("Missing notification body.") }
            let center = UNUserNotificationCenter.current()
            let settings = await center.notificationSettings()
            guard [.authorized, .provisional].contains(settings.authorizationStatus) else { return false }
            let content = UNMutableNotificationContent()
            content.title = "Technion++"
            content.body = body
            let supplied = message["id"] as? String ?? ""
            let id = profile + "." + (supplied.isEmpty ? UUID().uuidString : supplied)
            center.removeDeliveredNotifications(withIdentifiers: [id])
            try await center.add(UNNotificationRequest(identifier: id, content: content, trigger: nil))
            return false
        }
        guard let token = message["id"] as? String else { throw BridgeError("Missing transfer ID.") }
        let manager = FileManager.default
        let staging = try manager.url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("TechnionDownloads", isDirectory: true)
            .appendingPathComponent(profile, isDirectory: true)
        let downloads = try manager.url(for: .downloadsDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
        let files = DownloadFiles(staging: staging, downloads: downloads)
        switch message["action"] as? String {
        case "begin":
            if try files.alreadySaved(token) { return true }
            try files.begin(token)
        case "acknowledge": try files.acknowledge(token)
        case "append":
            guard let offset = message["offset"] as? Int, let data = message["data"] as? String else {
                throw BridgeError("Missing transfer data.")
            }
            try files.append(token, at: offset, encoded: data)
        case "finish":
            guard let filename = message["filename"] as? String, let size = message["size"] as? Int else {
                throw BridgeError("Missing download details.")
            }
            try files.finish(token, filename: filename, size: size)
        case "discard": try files.discard(token)
        default: throw BridgeError("Unknown operation.")
        }
        return false
    }
}
