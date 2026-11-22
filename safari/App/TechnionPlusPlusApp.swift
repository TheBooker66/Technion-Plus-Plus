import SafariServices
import SwiftUI
import UserNotifications

@main
struct TechnionPlusPlusApp: App {
    var body: some Scene {
        Window("Technion++ for Safari", id: "setup") {
            SetupView()
        }
        .windowResizability(.contentSize)
    }
}

private struct SetupView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var notifications: UNAuthorizationStatus = .notDetermined
    @State private var errorMessage: String?
    private let extensionID = "org.technionplusplus.safari.Extension"

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                Image(nsImage: NSApp.applicationIconImage)
                    .resizable()
                    .frame(width: 54, height: 54)
                Text("Technion++ for Safari")
                    .font(.title.bold())
            }
            Text("To use Technion++ only in Personal, manage the default profile in Safari Settings → Extensions. Manage each additional profile in Profiles → Extensions. Safari lists the active profiles when you select the extension.")
            Button("Open Safari Settings") {
                SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionID) { error in
                    if let error {
                        DispatchQueue.main.async { errorMessage = error.localizedDescription }
                    }
                }
            }
            .buttonStyle(.borderedProminent)
            Divider()
            Text("Assignment and download notifications")
                .font(.headline)
            switch notifications {
            case .authorized, .provisional, .ephemeral:
                Text("Notifications are enabled.").foregroundStyle(.secondary)
            case .denied:
                Text("Allow notifications for Technion++ in System Settings → Notifications.")
                    .foregroundStyle(.secondary)
            default:
                Button("Allow Notifications…") {
                    Task {
                        do {
                            _ = try await UNUserNotificationCenter.current()
                                .requestAuthorization(options: [.alert, .sound])
                            await refreshNotifications()
                        } catch {
                            errorMessage = error.localizedDescription
                        }
                    }
                }
            }
            if let errorMessage {
                Text(errorMessage).foregroundStyle(.secondary).textSelection(.enabled)
            }
        }
        .padding(28)
        .frame(width: 430, alignment: .leading)
        .fixedSize(horizontal: true, vertical: true)
        .task { await refreshNotifications() }
        .onChange(of: scenePhase) {
            if scenePhase == .active { Task { await refreshNotifications() } }
        }
    }

    private func refreshNotifications() async {
        notifications = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }
}
