export {isSafariExtension as safariTransfers} from "./utils.js";
const managerURL = chrome.runtime.getURL("html/p_downloads.html") + "#transfer";
const prefixes = [
	"https://moodle26.technion.ac.il/blocks/material_download/download_materialien.php?courseid=",
	"https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/",
	"https://grades.cs.technion.ac.il/fetch/file?",
	"https://webcourse.cs.technion.ac.il/",
];

export type SafariJob = {id: string; url: string; filename: string; system: number};
type Active = SafariJob & {paused: boolean; cancelled: boolean};
type Queue = {safari_jobs: SafariJob[]; safari_active: Active | null};
export const readQueue = (): Promise<Queue> => chrome.storage.local.get({safari_jobs: [], safari_active: null});
const queueLock = <T>(action: () => Promise<T>) => navigator.locks.request("technion-download-queue", action);

export async function nativeRequest(message: Record<string, unknown>) {
	const result = await browser.runtime.sendNativeMessage("org.technionplusplus.safari", message);
	if (!result?.ok) throw new Error(result?.error || "The Technion++ native extension did not respond.");
	return result as {alreadySaved?: boolean};
}

function newJob(url: string, filename: string, system: number): SafariJob {
	const source = new URL(url);
	if (source.protocol !== "https:" || !prefixes.some((prefix) => new URL(prefix).origin === source.origin)) {
		throw new Error("Unknown download source");
	}
	return {id: crypto.randomUUID(), url: source.href, filename, system};
}

export async function enqueueSafariFiles(chunk: DownloadItem | {link: string; name: string}, windowId?: number) {
	const jobs =
		"link" in chunk
			? [newJob(chunk.link, chunk.name, 1)]
			: chunk.list.map((item) => {
					if (!prefixes[chunk.sys]) throw new Error("Unknown download source");
					const url =
						chunk.sys === 3
							? new URL(item.u, prefixes[3]).href
							: prefixes[chunk.sys] + chunk.sub_pre + item.u;
					return newJob(url, item.n, chunk.sys);
				});
	await queueLock(async () => {
		const queue = await readQueue();
		await chrome.storage.local.set({safari_jobs: queue.safari_jobs.concat(jobs), safari_download_error: ""});
	});
	await ensureSafariTransferTab(windowId);
}

export async function ensureSafariTransferTab(windowId?: number) {
	await navigator.locks.request("technion-transfer-tab", async () => {
		const {safari_jobs, safari_active} = await readQueue();
		if (!safari_jobs.length && !safari_active) return;
		const tabs = await chrome.tabs.query({});
		if (!tabs.some((tab) => tab.url === managerURL || tab.pendingUrl === managerURL)) {
			await chrome.tabs.create({url: managerURL, active: false, ...(windowId === undefined ? {} : {windowId})});
		}
	});
}

export async function controlSafariDownload(command: "pause" | "cancel" | "cancelAll" | "remove", id?: string) {
	await queueLock(async () => {
		const {safari_jobs, safari_active} = await readQueue();
		if (command === "remove") {
			await chrome.storage.local.set({safari_jobs: safari_jobs.filter((job) => job.id !== id)});
			return;
		}
		if (safari_active) {
			if (command === "pause") safari_active.paused = !safari_active.paused;
			else safari_active.cancelled = true;
		}
		await chrome.storage.local.set({
			safari_active,
			...(command === "cancelAll" ? {safari_jobs: []} : {}),
		});
	});
}

async function claimFile() {
	return queueLock(async () => {
		const {safari_active, safari_jobs} = await readQueue();
		if (safari_active) return safari_active;
		const next = safari_jobs.shift();
		if (!next) return null;
		const active = {...next, paused: false, cancelled: false};
		await chrome.storage.local.set({safari_active: active, safari_jobs, dl_current: 1, safari_progress: null});
		return active;
	});
}

function encode(bytes: Uint8Array) {
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 8192) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
	}
	return btoa(binary);
}

async function transfer(job: Active) {
	const controller = new AbortController();
	let wake: (() => void) | undefined;
	let paused = job.paused;
	const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
		if (!changes.safari_active) return;
		const active = changes.safari_active.newValue as Active | null;
		if (active?.id !== job.id || active.cancelled) controller.abort();
		paused = !!active?.paused;
		wake?.();
	};
	async function waitIfPaused() {
		while (paused && !controller.signal.aborted)
			await new Promise<void>((done) => {
				wake = done;
			});
		controller.signal.throwIfAborted();
	}
	chrome.storage.onChanged.addListener(onChange);
	try {
		const {safari_active} = await readQueue();
		onChange({safari_active: {newValue: safari_active}});
		await waitIfPaused();
		const {alreadySaved} = await nativeRequest({action: "begin", id: job.id});
		if (alreadySaved) return;
		const response = await fetch(job.url, {credentials: "include", signal: controller.signal});
		if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
		if (new URL(response.url).hostname === "login.microsoftonline.com") throw new Error("נדרשת התחברות לטכניון");
		const reader = response.body.getReader();
		const totalBytes = Number(response.headers.get("Content-Length")) || 0;
		// Bound memory for large recordings, and avoid one native call per network packet.
		const buffer = new Uint8Array(512 * 1024);
		let filled = 0,
			written = 0,
			lastUpdate = 0;
		async function flush() {
			await waitIfPaused();
			await nativeRequest({
				action: "append",
				id: job.id,
				offset: written,
				data: encode(buffer.subarray(0, filled)),
			});
			written += filled;
			filled = 0;
			if (Date.now() - lastUpdate >= 350) {
				await chrome.storage.local.set({safari_progress: {id: job.id, bytesReceived: written, totalBytes}});
				lastUpdate = Date.now();
			}
		}
		while (true) {
			await waitIfPaused();
			const {done, value} = await reader.read();
			if (done) break;
			let offset = 0;
			while (offset < value.length) {
				const count = Math.min(buffer.length - filled, value.length - offset);
				buffer.set(value.subarray(offset, offset + count), filled);
				offset += count;
				filled += count;
				if (filled === buffer.length) await flush();
			}
		}
		if (filled) await flush();
		await waitIfPaused();
		await nativeRequest({action: "finish", id: job.id, filename: job.filename, size: written});
	} catch (error) {
		controller.abort();
		await nativeRequest({action: "discard", id: job.id}).catch(console.error);
		const {safari_active} = await readQueue();
		if (!safari_active?.cancelled) {
			const body = `ההורדה של ${job.filename} נכשלה. ${error instanceof Error ? error.message : error}`;
			await chrome.storage.local.set({safari_download_error: body});
			await nativeRequest({action: "notify", id: "download-error", body}).catch(console.error);
		}
	} finally {
		chrome.storage.onChanged.removeListener(onChange);
	}
}

export async function runSafariTransfers() {
	// A dedicated, inactive tab keeps long recordings alive when Safari unloads its event page.
	await navigator.locks.request("technion-transfer-worker", async () => {
		while (true) {
			const job = await claimFile();
			if (job) {
				await transfer(job);
				await queueLock(async () => {
					await chrome.storage.local.set({safari_active: null, dl_current: 0, safari_progress: null});
				});
				await nativeRequest({action: "acknowledge", id: job.id}).catch(console.error);
				continue;
			}
			const finished = await navigator.locks.request("technion-transfer-tab", async () => {
				const queue = await readQueue();
				if (queue.safari_jobs.length || queue.safari_active) return false;
				const tab = await chrome.tabs.getCurrent();
				if (tab?.id !== undefined && tab.url === managerURL) await chrome.tabs.remove(tab.id);
				return true;
			});
			if (finished) return;
		}
	});
}
