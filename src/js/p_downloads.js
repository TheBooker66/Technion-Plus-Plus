'use strict';
import {CommonPopup} from './common_popup.js';

(function () {
	function updateTextContent(element, newText) {
		if (element.textContent === newText) return;
		element.textContent = newText;
	}

	function updateProgressDisplay(element, percentage) {
		if (element.textContent === percentage + "%") return;
		element.textContent = percentage + "%";
		document.documentElement.style.setProperty("--prog", percentage);
	}

	function updateCurrentDownload() {
		chrome.storage.local.get({dl_current: 0}, storageData => {
			if (storageData.dl_current !== 0)
				chrome.downloads.search({id: storageData.dl_current}, downloads => {
					if (document.getElementById("myform").style.display === "block")
						document.getElementById("myform").style.display = "block";
					if (downloads[0].filename) {
						updateTextContent(currentDownloadElements[0], downloads[0].filename);
						let statusText = downloads[0].paused ? "מושהה" : "פעיל";
						updateTextContent(currentDownloadElements[1], statusText);
						if (0 < downloads[0].totalBytes) {
							statusText += " - " + (downloads[0].bytesReceived / 1048576).toFixed(1) + "/" + (downloads[0].totalBytes / 1048576).toFixed(1) + "MB";
							updateTextContent(currentDownloadElements[1], statusText);
							downloads = (100 * downloads[0].bytesReceived / downloads[0].totalBytes).toFixed(1);
							updateProgressDisplay(currentDownloadElements[2], downloads);
						} else updateProgressDisplay(currentDownloadElements[2], 0);
					}
				});
			else {
				if (document.getElementById("myform").style.display !== "none")
					document.getElementById("myform").style.display = "none";
				updateTextContent(currentDownloadElements[0], "אין קבצים בהורדה על ידי התוסף.");
				updateTextContent(currentDownloadElements[1], "");
				updateProgressDisplay(currentDownloadElements[2], 0);
			}
		});
	}

	function updateDownloadQueue() {
		while (queueList.firstChild) queueList.removeChild(queueList.lastChild);
		chrome.storage.local.get({dl_queue: []}, storageData => {
			let itemCount = 0;
			storageData.dl_queue.forEach(downloadEntry => {
				for (let i = 0; i < downloadEntry.list.length; i++) {
					let file = downloadEntry.list[i],
						listItem = itemTemplate.cloneNode(true).querySelector(".list_item");
					listItem.querySelector(".dl_name").textContent = file.n;
					listItem.querySelector(".dl_from").src = "../icons/" + ["moodle.svg", "panopto.ico", "grpp.ico", "grpp.ico"][downloadEntry.sys];
					listItem.querySelector(".remove").addEventListener("click", () => {
						let fileIndex = downloadEntry.list.indexOf(file);
						downloadEntry.list.splice(fileIndex, 1);
						if (downloadEntry.list.length === 0)
							storageData.dl_queue.splice(storageData.dl_queue.indexOf(downloadEntry), 1);
						void chrome.storage.local.set({dl_queue: storageData.dl_queue});
						listItem.remove();
						if (!queueList.firstChild) {
							queueList.appendChild(document.createElement("span")).textContent = "אין קבצים בהמתנה להורדה על ידי התוסף.";
							queueList.firstChild.style.padding = "8px";
						}
					});
					queueList.appendChild(listItem);
					itemCount++;
				}
			});
			if (itemCount === 0) {
				queueList.appendChild(document.createElement("span")).textContent = "אין קבצים בהמתנה להורדה על ידי התוסף.";
				queueList.firstChild.style.padding = "8px";
			}
		});
	}

	const popup = new CommonPopup;
	popup.title = "מנהל הורדות";
	popup.css_list = ["downloads"];
	popup.popupWrap();
	const currentDownloadElements = document.querySelectorAll("#current span"),
		queueList = document.getElementById("queue"),
		itemTemplate = popup.loadTemplate("dl_item");
	updateCurrentDownload();
	setInterval(updateCurrentDownload, 350);
	updateDownloadQueue();
	chrome.downloads.onCreated.addListener(_ => setTimeout(updateDownloadQueue, 1E3));
	chrome.downloads.onChanged.addListener(changes => {
		if (changes.state || changes.paused) updateDownloadQueue();
	});
	document.getElementById("pause").addEventListener("click", () => {
		chrome.storage.local.get({dl_current: 0}, storageData => {
			if (storageData.dl_current !== 0) void chrome.downloads.search({id: storageData.dl_current}, downloads => {
				if (!downloads[0]) return;
				downloads[0].paused ? void chrome.downloads.resume(storageData.dl_current) : void chrome.downloads.pause(storageData.dl_current);
			});
		});
	});
	document.getElementById("cancel").addEventListener("click", () => {
		chrome.storage.local.get({dl_current: 0}, storageData => {
			if (storageData.dl_current !== 0) void chrome.downloads.cancel(storageData.dl_current);
		});
	});
	document.getElementById("cancelAll").addEventListener("click", () => {
		chrome.storage.local.get({dl_current: 0}, storageData => {
			chrome.storage.local.set({
				dl_current: 0,
				dl_queue: [],
			}, () => {
				if (storageData.dl_current !== 0) void chrome.downloads.cancel(storageData.dl_current);
				void chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"});
			});
		});
	});
})();
