import {CommonPopup} from './common_popup.js';

(async function () {
	function updateTextContent(element: HTMLElement, newText: string) {
		if (element.textContent === newText) return;
		element.textContent = newText;
	}

	function updateProgressDisplay(element: HTMLElement, percentage: string) {
		if (element.textContent === percentage + "%") return;
		element.textContent = percentage + "%";
		document.documentElement.style.setProperty("--prog", percentage);
	}

	async function updateCurrentDownload() {
		const storageData = await chrome.storage.local.get({dl_current: 0}) as StorageData;
		if (storageData.dl_current !== 0)
			chrome.downloads.search({id: storageData.dl_current}, downloads => {
				if (downloads[0].filename) {
					updateTextContent(currentDownloadElements[0], downloads[0].filename);
					let statusText = downloads[0].paused ? "מושהה" : "פעיל";
					updateTextContent(currentDownloadElements[1], statusText);
					if (0 < downloads[0].totalBytes) {
						statusText += " - " + (downloads[0].bytesReceived / 1048576).toFixed(1) + "/" + (downloads[0].totalBytes / 1048576).toFixed(1) + "MB";
						updateTextContent(currentDownloadElements[1], statusText);
						updateProgressDisplay(currentDownloadElements[2], (100 * downloads[0].bytesReceived / downloads[0].totalBytes).toFixed(1));
					} else updateProgressDisplay(currentDownloadElements[2], "0");
				}
			});
		else {
			const form = document.getElementById("myform") as HTMLFormElement;
			if (form.style.display !== "none") form.style.display = "none";

			updateTextContent(currentDownloadElements[0], "אין קבצים בהורדה על ידי התוסף.");
			updateTextContent(currentDownloadElements[1], "");
			updateProgressDisplay(currentDownloadElements[2], "0");
		}
	}

	async function updateDownloadQueue() {
		while (queueList.firstChild) queueList.removeChild(queueList.lastChild as Node);
		const storageData = await chrome.storage.local.get({dl_queue: []}) as StorageData;
		let itemCount = 0;
		storageData.dl_queue.forEach((downloadEntry: DownloadItem) => {
			for (let i = 0; i < downloadEntry.list.length; i++) {
				let file = downloadEntry.list[i],
					listItem = (popup.loadTemplate("dl_item").cloneNode(true) as HTMLElement).querySelector(".list_item") as HTMLDivElement;
				(listItem.querySelector(".dl_name") as HTMLElement).textContent = file.n;
				(listItem.querySelector(".dl_from") as HTMLImageElement).src = "../icons/" + ["moodle.svg", "panopto.svg", "cs.png", "cs.png"][downloadEntry.sys];
				(listItem.querySelector(".remove") as HTMLImageElement).addEventListener("click", async () => {
					let fileIndex = downloadEntry.list.indexOf(file);
					downloadEntry.list.splice(fileIndex, 1);
					if (downloadEntry.list.length === 0)
						storageData.dl_queue.splice(storageData.dl_queue.indexOf(downloadEntry), 1);
					await chrome.storage.local.set({dl_queue: storageData.dl_queue});
					listItem.remove();
					if (!queueList.firstChild) {
						queueList.appendChild(document.createElement("span")).textContent = "אין קבצים בהמתנה להורדה על ידי התוסף.";
						(queueList.firstChild! as HTMLElement).style.padding = "8px";
					}
				});
				queueList.appendChild(listItem);
				itemCount++;
			}
		});
		if (itemCount === 0) {
			queueList.appendChild(document.createElement("span")).textContent = "אין קבצים בהמתנה להורדה על ידי התוסף.";
			(queueList.firstChild! as HTMLElement).style.padding = "8px";
		}
	}

	const popup = new CommonPopup("מנהל הורדות", ["downloads"], document.title);
	const currentDownloadElements = document.querySelectorAll("#current span") as NodeListOf<HTMLSpanElement>,
		queueList = document.getElementById("queue") as HTMLDivElement;
	await updateCurrentDownload();
	setInterval(updateCurrentDownload, 350);
	await updateDownloadQueue();
	chrome.downloads.onCreated.addListener(_ => setTimeout(updateDownloadQueue, 1E3));
	chrome.downloads.onChanged.addListener(changes => {
		if (changes.state || changes.paused) updateDownloadQueue();
	});
	(document.getElementById("pause") as HTMLInputElement).addEventListener("click", async () => {
		const storageData = await chrome.storage.local.get({dl_current: 0}) as StorageData;
		if (storageData.dl_current === 0) return;

		const downloads = await chrome.downloads.search({id: storageData.dl_current});
		if (!downloads[0]) return;
		downloads[0].paused ?
			await chrome.downloads.resume(storageData.dl_current) : await chrome.downloads.pause(storageData.dl_current);
	});
	(document.getElementById("cancel") as HTMLInputElement).addEventListener("click", async () => {
		const storageData = await chrome.storage.local.get({dl_current: 0}) as StorageData;
		if (storageData.dl_current !== 0) await chrome.downloads.cancel(storageData.dl_current);
	});
	(document.getElementById("cancelAll") as HTMLInputElement).addEventListener("click", async () => {
		const storageData = await chrome.storage.local.get({dl_current: 0}) as StorageData;
		await chrome.storage.local.set({dl_current: 0, dl_queue: []});
		if (storageData.dl_current !== 0) await chrome.downloads.cancel(storageData.dl_current);
		await chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-128.png"});
	});
})();
