let speed = 1.0;

(async function () {
	async function setupListDownloadButtons(downloadAllButton: HTMLAnchorElement, downloadSelectedButton: HTMLAnchorElement) {
		downloadAllButton.setAttribute("class", "hidden-command-button");
		downloadSelectedButton.setAttribute("class", "hidden-command-button");
		if (!window.location.href.includes("folderID")) return;
		const folderId = decodeURIComponent(window.location.href).split('folderID="')[1].split('"')[0];
		const response = await fetch(`https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Podcast.ashx?courseid=${folderId}&type=mp4`);
		const html = (new DOMParser).parseFromString(await response.text(), "text/xml");
		if (html.querySelectorAll("item").length === 0) return;

		downloadAllButton.style.marginRight = "8px";
		downloadSelectedButton.style.marginRight = "8px";
		downloadAllButton.setAttribute("class", "tplus_download tplus_panopto_action");
		downloadSelectedButton.setAttribute("class", "tplus_download tplus_panopto_action");
		const pollingInterval = setInterval(() => {
			if ((document.getElementById("loadingMessage") as HTMLElement).style.display === "none" &&
				document.querySelectorAll(".thumbnail-link").length > 0 &&
				(document.querySelector(".thumbnail-link") as HTMLElement).style.display !== "none") {
				clearInterval(pollingInterval);
				const tableRows = (document.getElementById("listViewContainer") as HTMLTableElement).querySelectorAll("tr");
				for (let i = 0; i < tableRows.length - 1; i++) {
					const titleElement = tableRows[i].querySelector(".item-title") as HTMLElement;
					if (titleElement.querySelectorAll(".tplus_download").length !== 0) continue;

					const downloadLink = document.createElement("a");
					downloadLink.setAttribute("class", "tplus_download");
					downloadLink.textContent = "הורדה";
					downloadLink.addEventListener("click", async () => {
						await chrome.runtime.sendMessage({
							mess_t: "single_download",
							link: "https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/" + tableRows[i].getAttribute("id") + ".mp4",
							name: titleElement.textContent.trim().replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4",
						});
					});
					titleElement.appendChild(document.createElement("br"));
					titleElement.appendChild(downloadLink);
					if (!window.location.href.includes("folderID")) continue;

					const checkboxLabel = document.createElement("label"),
						checkbox = document.createElement("input");
					checkboxLabel.setAttribute("class", "tplus_download");
					checkboxLabel.textContent = "בחר";
					checkbox.setAttribute("type", "checkbox");
					checkbox.className = "tplus_check";
					checkboxLabel.appendChild(checkbox);
					titleElement.appendChild(checkboxLabel);
				}
			}
		}, 2E3);
	}

	async function setupFolderDownloadButtons() {
		if (window.location.href.includes("query=")) return;

		const downloadAllLink = document.createElement("a") as HTMLAnchorElement,
			downloadSelectedLink = document.createElement("a") as HTMLAnchorElement,
			actionHeaderDiv = document.querySelectorAll("#actionHeader > div")[1] as HTMLDivElement;

		downloadAllLink.textContent = "הורד את כל הקורס";
		downloadAllLink.addEventListener("click", async () => {
			const folderId = decodeURIComponent(window.location.href).split('folderID="')[1].split('"')[0],
				courseTitle = document.getElementById("contentHeaderText")?.textContent
					.replace(/[0-9]{4,}[swi]: /, "").replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "") + "/";

			const response = await fetch(`https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Podcast.ashx?courseid=${folderId}&type=mp4`);
			if (200 !== response.status) {
				window.alert("שגיאה בניסיון הורדת הקורס, אנא נסה שנית מאוחר יותר.");
				return;
			}

			const xml = (new DOMParser).parseFromString(await response.text(), "text/xml");
			const xmlItems = xml.querySelectorAll("item"),
				downloadChunk: { sys: number, sub_pre: string, list: { [key: string]: string }[] } = {
					sys: 1, sub_pre: "", list: [],
				};
			for (let i = 0; i < xmlItems.length; i++) {
				let downloadItem: { [key: string]: string } = {};
				downloadItem.u = xmlItems[i].querySelector("guid")!.textContent.split("/Syndication/")[1];
				downloadItem.n = courseTitle + xmlItems[i].querySelector("title")!.textContent
					.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4";
				downloadChunk.list.push(downloadItem);
			}
			if (downloadChunk.list.length > 0) await chrome.runtime.sendMessage({
				mess_t: "multi_download", chunk: downloadChunk,
			});
		});

		downloadSelectedLink.textContent = "הורד פריטים שנבחרו";
		downloadSelectedLink.addEventListener("click", async () => {
			const listRows = document.querySelectorAll("#listViewContainer tr.list-view-row"),
				courseTitle = document.getElementById("contentHeaderText")?.textContent
					.replace(/[0-9]{4,}[swi]: /, "").replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "") + "/",
				downloadChunk: DownloadItem = {sys: 1, sub_pre: "", list: []};
			for (let i = 0; i < listRows.length; i++) {
				if (!(listRows[i].querySelector(".tplus_check") as HTMLInputElement).checked) continue;
				let downloadItem = {
					u: listRows[i].id + ".mp4",
					n: courseTitle + listRows[i].querySelector("a.detail-title")?.textContent.trim().replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4",
				};
				downloadChunk.list.push(downloadItem);
			}
			if (downloadChunk.list.length > 0)
				await chrome.runtime.sendMessage({
					mess_t: "multi_download", chunk: downloadChunk,
				});
		});

		actionHeaderDiv.insertBefore(downloadAllLink, actionHeaderDiv.childNodes[0]);
		actionHeaderDiv.insertBefore(downloadSelectedLink, actionHeaderDiv.childNodes[1]);
		await setupListDownloadButtons(downloadAllLink, downloadSelectedLink);
		window.addEventListener("hashchange", async () => {
			await setupListDownloadButtons(downloadAllLink, downloadSelectedLink);
		});
	}

	function setupVideoDownloadButtons() {
		const videoID = window.location.href.split("?")[1].split("id=")[1].split("&")[0],
			videoTitle = document.title.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, ""),
			downloads = {
				"3": { // short for mp3
					url: `https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/${videoID}.mp4?mediaTargetType=audioPodcast`,
					name: videoTitle + "_voice.mp4",
				},
				"4": { // short for mp4
					url: `https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/${videoID}.mp4`,
					name: videoTitle + ".mp4",
				},
			};
		Object.keys(downloads).forEach(async downloadType => {
			const response = await fetch(downloads[downloadType as "3" | "4"].url, {method: "head", mode: "no-cors"});
			if (response.status !== 0) return;

			(document.getElementById("m_cant_download") as HTMLDivElement).classList.add("tplus_hidden");
			const downloadButton = document.getElementById(`m_download_mp${downloadType as "3" | "4"}`) as HTMLAnchorElement;
			downloadButton.classList.remove("tplus_hidden");
			downloadButton.addEventListener("click", async () => {
				await chrome.runtime.sendMessage({
					mess_t: "single_download", link: downloads[downloadType as "3" | "4"].url,
					name: downloads[downloadType as "3" | "4"].name,
				});
			});
		});
	}

	function snapshotHandler() {
		const snapshotButton = document.getElementById("m_snapshot") as HTMLAnchorElement,
			videoSelectionContainer = document.getElementById("m_vid_list") as HTMLDivElement,
			previewCanvases = videoSelectionContainer?.querySelectorAll("canvas") as NodeListOf<HTMLCanvasElement>,
			videoElements = document.querySelectorAll(".video-js") as NodeListOf<HTMLVideoElement>,
			drawPreviewThumbnail = (i: 0 | 1) => {
				previewCanvases[i].width = 28 / videoElements[i].videoHeight * videoElements[i].videoWidth;
				previewCanvases[i].height = 28;
				previewCanvases[i].getContext("2d")?.drawImage(videoElements[i], 0, 0, videoElements[i].videoWidth, videoElements[i].videoHeight, 0, 0, previewCanvases[i].width, previewCanvases[i].height);
			};
		videoSelectionContainer.querySelectorAll("span")[2].addEventListener("click", () => {
			videoSelectionContainer.className = "tplus_hidden";
			(document.getElementById("tplus_menu") as HTMLDivElement).classList.remove("start", "overlaid");
		});
		const canvas = document.createElement("canvas"),
			downloadAnchors = [document.createElement("a"), document.createElement("a")],
			clickEvent = new MouseEvent("click", {bubbles: true, cancelable: true, view: window});
		const takeAndDownloadSnapshot = (i: 0 | 1) => {
			canvas.width = videoElements[i].videoWidth;
			canvas.height = videoElements[i].videoHeight;
			canvas.getContext("2d")?.drawImage(videoElements[i], 0, 0);
			try {
				downloadAnchors[i].href = canvas.toDataURL("image/png");
			} catch (err: any) {
				if (err.name === "SecurityError")
					return window.alert("לא ניתן לצלם תמונה מהווידאו עקב הגנות דפדפן. נסו לעשות צילום מסך עם win+shift+s.");
			}
			downloadAnchors[i].download = "snapshot_" + Date.now() + ".png";
			downloadAnchors[i].dispatchEvent(clickEvent);
		};
		previewCanvases[0].addEventListener("click", () => takeAndDownloadSnapshot(0));
		previewCanvases[1].addEventListener("click", () => takeAndDownloadSnapshot(1));
		snapshotButton.addEventListener("click", () => {
			drawPreviewThumbnail(0);
			if (videoElements.length === 2) {
				(document.getElementById("tplus_menu") as HTMLDivElement).classList.add("start", "overlaid");
				videoSelectionContainer.className = "tplus_persist";
				drawPreviewThumbnail(1);
			} else takeAndDownloadSnapshot(0);
		});
	}

	function setupDetachableVideoPlayer() {
		(new MutationObserver((records, observer) => {
			for (const record of records)
				for (let i = 0; i < record.addedNodes.length; i++) {
					let node = record.addedNodes[i] as HTMLElement;
					if (!("function" === typeof node.querySelector && !document.getElementById("new_win") &&
						node.classList.contains("player") && document.querySelectorAll(".video-js").length === 2))
						continue;

					const newWindowMessageDiv = (new DOMParser).parseFromString(`
<div style="color: #777; font-style: italic; z-index:1; width: 250px; margin:auto; padding: 10px; line-height:1; position: relative;text-align: center; direction: rtl; display: none">
<h4 dir="ltr">Technion<sup>++</sup></h4>
הוידאו נפתח לתצוגה בחלון חדש, יש לסגור את החלון החדש כדי לחזור ולצפות בווידאו כאן.
</div>`, "text/html").querySelector("div") as HTMLDivElement;
					const secondaryScreen = document.getElementById("secondaryScreen") as HTMLDivElement;
					secondaryScreen.insertBefore(newWindowMessageDiv, secondaryScreen.childNodes[0]);
					const expandButton = document.getElementById("m_expand") as HTMLAnchorElement,
						videoElements = document.querySelectorAll(".video-js") as NodeListOf<HTMLVideoElement>,
						secondaryVideoElement = videoElements[videoElements.length - 1] as HTMLVideoElement,
						toggleSecondaryVideoDisplay = (HideVideoEh: boolean) => {
							secondaryVideoElement.style.display = HideVideoEh ? "none" : "block";
							newWindowMessageDiv.style.display = HideVideoEh ? "block" : "none";
							expandButton.style.opacity = HideVideoEh ? "0.3" : "1.0";
						};
					expandButton.classList.remove("tplus_hidden");
					expandButton.addEventListener("click", () => {
						if (expandButton.style.opacity === "0.3") return;

						toggleSecondaryVideoDisplay(true);
						const newWindow = window.open("", "Technion", "width=830,height=655,menubar=no,statusbar=no,titlebar=no,toolbar=no") as Window;
						const newDocument = newWindow.document;
						newDocument.title = "Technion - " + document.title;
						newDocument.body.setAttribute("style", "{text-align: center; background: #000; font-family: arial,serif; direction: rtl; font-size: 11px; color: #f9f9fa;}".replace(/[{}]/g, ''));
						const newWindowCanvas = document.createElement("canvas");
						newDocument.body.appendChild(newWindowCanvas);
						newWindowCanvas.height = secondaryVideoElement.videoHeight;
						newWindowCanvas.width = secondaryVideoElement.videoWidth;
						newWindowCanvas.setAttribute("style", "{max-width: 800px; border: 1px solid #fff; margin: auto; display: block;}".replace(/[{}]/g, ''));
						newWindowCanvas.getContext("2d")!.drawImage(secondaryVideoElement, 0, 0);
						const drawVideoFrame = () => {
							if (secondaryVideoElement.paused || secondaryVideoElement.ended) return;
							newWindowCanvas.height = secondaryVideoElement.videoHeight;
							newWindowCanvas.width = secondaryVideoElement.videoWidth;
							newWindowCanvas.getContext("2d")!.drawImage(secondaryVideoElement, 0, 0);
							setTimeout(drawVideoFrame, 1E3 / 60);
						};
						drawVideoFrame();
						secondaryVideoElement.addEventListener("play", drawVideoFrame);
						const fullscreenButton = document.createElement("button"),
							instructionsSpan = document.createElement("span");
						let NewWindowFullscreenEh = false;
						fullscreenButton.textContent = "מסך מלא";
						fullscreenButton.style.margin = "8px";
						fullscreenButton.style.cursor = "pointer";
						instructionsSpan.textContent = "ניתן לגרור את החלון למסך שני וכך לצפות בווידאו במצב מסך מלא בשני המסכים.";
						newDocument.addEventListener("dblclick", () => {
							if (!NewWindowFullscreenEh) return;
							newDocument.exitFullscreen();
							NewWindowFullscreenEh = false;
						});
						fullscreenButton.addEventListener("click", () => {
							newWindowCanvas.requestFullscreen();
							NewWindowFullscreenEh = true;
						});
						newDocument.body.appendChild(fullscreenButton);
						newWindow.onbeforeunload = () => toggleSecondaryVideoDisplay(false);
						newDocument.body.appendChild(fullscreenButton);
					});

					observer.disconnect();
					return;
				}
		})).observe((document.getElementById("viewerContent") as HTMLElement), {childList: true, subtree: true});
	}

	function toggleDarkMode(styleSheet: CSSStyleSheet) {
		if (!styleSheet.cssRules.length)
			[
				".player, #viewer, #playControlsWrapper {background-color: #000 !important;}",
				"#viewerHeader, .transport-button, #timeElapsed, #timeRemaining, #tplusRealTime, #positionControl, .viewer .transport-button .clicked, #volumeFlyout, #playSpeedExpander, #qualityButton, #qualityExpander, #inlineMessageLetterbox, .next-delivery-thumb, #thumbnailList, #thumbnailList img, .thumbnail-timestamp {filter:invert(1);}",
				"#leftPane aside, #header {background-color: #eee; filter: invert(1);}",
				"#leftPane, #pageBody, .top-level-items > div, .top-level-items > ul {background-color: #111;}",
				"#playControls {background-color: #000; border-top: 1px solid #555; opacity: 0.8;}",
				"#playControls:hover, #playControls:focus {opacity: 1;}",
				"#thumbnailList {background-color: #eee;}",
				"#leftPane #eventTabs #eventTabControl .event-tab-header {filter:invert(0.05);}",
				"#leftPane #searchRegion input {background-color: transparent}",
				"#transportControls {background-color: transparent !important; border-left-color: #0c0c0d !important;}",
				"#playSpeedExpander > div, #qualityExpander > div {filter: none !important;}",
				"#thumbnailList img {opacity: 0.5;}",
				"#thumbnailList img:hover{opacity: 1}",
				".top-level-items {background: linear-gradient(transparent, transparent) padding-box, #111 content-box !important; background-clip: padding-box !important; border-width: 1px 1px 0 0; border-style: solid; border-color: #444;}",
				"#playlistContainer > div:not(:first-child) {background-image: none;}",
			].forEach(cssRule => styleSheet.insertRule(cssRule, 0));
		else while (styleSheet.cssRules.length > 0) styleSheet.deleteRule(0);
	}

	async function saveSetting(settingsKey: "dark_mode" | "speed" | "return_backwards" | "floating_speed" | "scroll_volume" | "settings" | "show_hide_thumbnails" | "show_hide_sidebar") {
		const settingsObj: Partial<StorageData> = {};
		switch (settingsKey) {
			case "dark_mode":
				settingsObj.panopto_dark_mode = (document.getElementById("m_dark_mode") as HTMLInputElement).checked;
				break;
			case "speed":
				settingsObj.panopto_speed = (document.getElementById("primaryVideo") as HTMLVideoElement).playbackRate;
				break;
			case "return_backwards":
				settingsObj.panopto_return_backwards = (document.getElementById("m_return_backwards") as HTMLInputElement).checked;
				break;
			case "floating_speed":
				settingsObj.panopto_floating_speed = (document.getElementById("m_floating_speed") as HTMLInputElement).checked;
				break;
			case "scroll_volume":
				settingsObj.panopto_scroll_volume = (document.getElementById("m_scroll_volume") as HTMLInputElement).checked;
				break;
			case "settings":
				settingsObj.panopto_save = (document.getElementById("m_save") as HTMLInputElement).checked;
				break;
			// weird race conditions in the next two, but it works :/
			case "show_hide_thumbnails": {
				const attr = (document.getElementById("toggleThumbnailsButton") as HTMLDivElement).getAttribute("aria-expanded");
				settingsObj.panopto_hide_thumbnails = attr === null || attr === "true";
				break;
			}
			case "show_hide_sidebar": {
				const attr = (document.querySelector("#eventsExpanderButton > div[role=button]") as HTMLDivElement).getAttribute("aria-expanded");
				settingsObj.panopto_hide_sidebar = attr === null || attr === "true";
				break;
			}
		}
		await chrome.storage.local.set(settingsObj);
		if (chrome.runtime.lastError) console.error("TE_panopto: " + chrome.runtime.lastError.message);
	}

	async function copyTimestampedURL(markdownLinkEh: boolean) {
		const url = document.URL, startPos = url.indexOf("&");
		const parsedURL = startPos === -1 ? url : url.substring(0, startPos),
			currentTime = (document.getElementById("primaryVideo") as HTMLVideoElement).currentTime;
		const timestampUrl = `${parsedURL}&start=${currentTime}`;

		if (!markdownLinkEh)
			await navigator.clipboard.writeText(timestampUrl);
		else {
			let resultText = "";
			const LEVEL_CONNECTION_SYMBOL = "→",
				tabTitle = document.title,
				parentName = document.querySelector("#parentName")?.textContent,
				videoSectionName = document.querySelector(".index-event.highlighted .event-text span")?.textContent;

			if (parentName) resultText += `${parentName} ${LEVEL_CONNECTION_SYMBOL} `;
			if (videoSectionName) resultText += `${videoSectionName} ${LEVEL_CONNECTION_SYMBOL} `;
			resultText += tabTitle;

			const mdLink = `[${resultText}](${timestampUrl})`;
			await navigator.clipboard.writeText(mdLink);
		}
		window.alert("הקישור הועתק ללוח!");
	}

	function updateRealTime() {
		const falseTimeElement = document.getElementById("timeRemaining") as HTMLDivElement,
			trueTimeElement = document.getElementById("tplusRealTime") as HTMLDivElement;
		const playbackRate = (document.getElementById("primaryVideo") as HTMLVideoElement).playbackRate || 1;
		if (playbackRate === 1) {
			falseTimeElement.style.display = "table-cell";
			trueTimeElement.style.display = "none";
			return;
		}

		falseTimeElement.style.display = "none";
		trueTimeElement.style.display = "table-cell";

		const videoElement = document.getElementById("primaryVideo") as HTMLVideoElement;
		const falseTimeRemaining = videoElement.duration - videoElement.currentTime;
		const trueTimeRemaining = falseTimeRemaining / playbackRate;
		const timeString = new Date(trueTimeRemaining * 1000).toISOString().slice(11, 19);
		if (trueTimeRemaining >= 3600)
			(document.getElementById("tplusRealTimeRemaining") as HTMLDivElement).textContent = timeString;
		else
			(document.getElementById("tplusRealTimeRemaining") as HTMLDivElement).textContent = timeString.slice(3);
		(document.getElementById("tplusRealTimeRate") as HTMLSpanElement).textContent = `\t(x${playbackRate}, `;
	}

	function setupTimer() {
		const newTimeElement = document.createElement("div") as HTMLDivElement;
		newTimeElement.id = "tplusRealTime";
		newTimeElement.setAttribute("style", "{vertical-align: middle; width: 50px; font-size: 0.95em;}".replace(/[{}]/g, ''));
		newTimeElement.style.display = "none";

		const realTime = document.createElement("div"),
			extraText = document.createElement('small'),
			rateInfo = document.createElement('span'),
			extensionInfo = document.createElement('span'),
			literalBracket = document.createElement('span');
		realTime.id = "tplusRealTimeRemaining";
		rateInfo.textContent = `\t(x1, `;
		rateInfo.id = "tplusRealTimeRate";
		extensionInfo.textContent = `T++`;
		extensionInfo.style.color = "var(--sec-light)";
		literalBracket.textContent = `)`;
		extraText.append(rateInfo, extensionInfo, literalBracket);
		newTimeElement.append(realTime, extraText);

		(document.getElementById("transportControls") as HTMLDivElement)
			.insertBefore(newTimeElement, document.getElementById("liveButton"));
		(document.getElementById("primaryVideo") as HTMLVideoElement)
			.addEventListener("timeupdate", () => updateRealTime());
	}

	function applyCustomSpeed(speedValue: string) {
		const parsedSpeed = parseFloat(speedValue);
		if (isNaN(parsedSpeed) || parsedSpeed < 0.1 || parsedSpeed > 6.7) {
			window.alert("הכנסת ערך לא חוקי, אנא נסה שנית.");
			return;
		}
		for (const video of document.querySelectorAll(".video-js"))
			(video as HTMLVideoElement).playbackRate = parsedSpeed;
	}

	function setupMenu() {
		const menu = (new DOMParser).parseFromString(`
<div id="tplus_menu_container">
    <div id="tplus_menu" class="start">
        <div id="tplus_content">
            <div id="tplus_overlay"></div>
            <div id="m_cant_download"><a><i>הורדת ההקלטה נחסמה על ידי צוות הקורס</i></a></div>
            <a id="m_download_mp4" class="tplus_hidden">הורדת הקלטה</a>
            <a id="m_download_mp3" class="tplus_hidden">הורדת שמע</a>
            <div id="m_vid_list" class="tplus_hidden">
                <div>בחר וידאו: </div>
                <span><canvas></canvas></span>
                <span><canvas></canvas></span>
                <span>סגור</span>
            </div>
            <a id="m_snapshot">צלם תמונה</a>
            <a id="m_timestamp">
                <div><span>העתק קישור פשוט</span><span>העתק קישור מעוצב</span></div>
                <span style="display: block">העתק קישור כעת</span>
            </a>
            <a id="m_expand" class="tplus_hidden">פצל לשני מסכים</a>
            <a id="m_float" class="tplus_hidden">פתח בחלון צף</a>
            <a id="m_speed">
                <div><span>2.25</span><span>2.5</span><span>2.75</span><span>3</span>
                <div id="custom_speed">מהירות מותאמת אישית</div></div>
                <span style="display: block">מהירויות נוספות</span>
            </a>
            <label for="m_floating_speed"><a>חלונית שליטת מהירויות צפה<input id="m_floating_speed" type="checkbox" /></a></label>
            <label for="m_scroll_volume"><a>שינוי עוצמה שמע עם גלגלת העכבר<input id="m_scroll_volume" type="checkbox" /></a></label>
            <label for="m_return_backwards"><a>חזרה אחורה בזמן לאחר ירידת מהירות<input id="m_return_backwards" type="checkbox" /></a></label>
            <label for="m_dark_mode"><a>מצב לילה<input id="m_dark_mode" type="checkbox" /></a></label>
            <label for="m_save"><a>זכור הגדרות<input id="m_save" type="checkbox" /></a></label>
        </div>
        <div id="tplus_koteret">Technion<sup>++</sup></div>
    </div>
</div>
`, "text/html").getElementById("tplus_menu_container") as HTMLDivElement;
		for (let menuButton of menu.querySelectorAll("a"))
			if (menuButton.id)
				menuButton.style.backgroundImage = `url(${chrome.runtime.getURL("icons/panopto/" + menuButton.id.replace(/_mp[34]/, "") + ".svg")})`;

		const bigBossElement = document.getElementById("transportControls") as HTMLDivElement;
		bigBossElement.appendChild(document.createElement("div")).classList.add("tplus_menu_divider", "transport-button");
		bigBossElement.appendChild(menu);
		(document.getElementById("tplus_koteret") as HTMLDivElement).style.backgroundImage = `url(${chrome.runtime.getURL("../icons/technion_plus_plus/logo.svg").toString()})`;

		setupVideoDownloadButtons();
		snapshotHandler();

		(document.getElementById("m_dark_mode") as HTMLInputElement).addEventListener("change", async () => {
			toggleDarkMode(darkModeStyle);
			await saveSetting("dark_mode");
		});

		(document.getElementById("m_floating_speed") as HTMLInputElement).addEventListener("change", () => {
			if ((document.getElementById("m_floating_speed") as HTMLInputElement).checked)
				setupFloatingSpeedController(document.fullscreenElement ? document.fullscreenElement as HTMLElement : document.body);
			else
				document.getElementById("tplus_floating_speed_controller")?.remove();
			saveSetting("floating_speed");
		});

		(document.getElementById("m_return_backwards") as HTMLInputElement)
			.addEventListener("change", () => saveSetting("return_backwards"));
		(document.getElementById("m_scroll_volume") as HTMLInputElement)
			.addEventListener("change", () => saveSetting("scroll_volume"));
		(document.getElementById("m_save") as HTMLInputElement)
			.addEventListener("change", () => saveSetting("settings"));

		if (document.pictureInPictureEnabled && !(document.querySelector(".video-js") as HTMLVideoElement).disablePictureInPicture) {
			const floatyButton = document.getElementById("m_float") as HTMLInputElement;
			floatyButton.classList.remove("tplus_hidden");
			floatyButton.addEventListener("click", async () => {
				if (!document.pictureInPictureElement)
					await (document.querySelector(".video-js") as HTMLVideoElement).requestPictureInPicture();
			});
		}

		for (const speedButton of document.querySelectorAll("#m_speed span"))
			speedButton.addEventListener("click", () => {
				for (const video of document.querySelectorAll(".video-js"))
					(video as HTMLVideoElement).playbackRate = parseFloat(speedButton.textContent);
			});

		(document.querySelector("#custom_speed") as HTMLDivElement).addEventListener("click", () => {
			const userSpeed = prompt("הכנס מהירות נגן מותאמת אישית (לדוגמה: 1.25, 1.5, 2, וכו'):", "1.0");
			if (userSpeed === null) return;
			applyCustomSpeed(userSpeed);
		});

		const timestampSpans = document.querySelectorAll("#m_timestamp span");
		timestampSpans[0].addEventListener("click", () => copyTimestampedURL(false));
		timestampSpans[1].addEventListener("click", () => copyTimestampedURL(true));
	}

	function setupFloatingSpeedController(parentElement: HTMLElement = document.body) {
		const floatingPanel = document.createElement('div');
		floatingPanel.id = 'tplus_floating_speed_controller';
		parentElement.appendChild(floatingPanel);

		const speedInput = document.createElement('input');
		Object.assign(speedInput, {
			type: 'number',
			min: '0.1',
			max: '6.7',
			step: '0.1',
			value: '1.0',
			title: "הכנס מהירות נגן מותאמת אישית (לדוגמה: 1.25, 1.5, 2, וכו') ואז לחץ על אנטר במקלדת או עם העכבר מחוץ לחלונית הצפה.",
		});
		floatingPanel.appendChild(speedInput);
		speedInput.addEventListener('change', () => applyCustomSpeed(speedInput.value));
		speedInput.addEventListener('keyup', (event) => {
			if (event.key === 'Enter') {
				applyCustomSpeed(speedInput.value);
				speedInput.blur();
			}
		});

		let isDragging = false;
		let startX: number, startY: number, initialPanelX: number, initialPanelY: number;

		floatingPanel.addEventListener('mousedown', (event) => {
			if (event.target === speedInput) {
				return;
			}
			if (event.button !== 0) return;
			event.preventDefault();
			isDragging = true;

			startX = event.clientX;
			startY = event.clientY;

			const rect = floatingPanel.getBoundingClientRect();
			initialPanelX = rect.left;
			initialPanelY = rect.top;

			floatingPanel.style.cursor = 'grabbing';
		});

		document.addEventListener('mousemove', (event) => {
			if (!isDragging) return;

			const deltaX = event.clientX - startX;
			const deltaY = event.clientY - startY;
			floatingPanel.style.left = `${initialPanelX + deltaX}px`;
			floatingPanel.style.top = `${initialPanelY + deltaY}px`;
		});

		document.addEventListener('mouseup', () => {
			if (isDragging) {
				isDragging = false;
				floatingPanel.style.cursor = 'grab';
			}
		});
	}

	function changeVolume(delta: number) {
		const videoElement = document.getElementById("primaryVideo") as HTMLVideoElement;
		if (!videoElement) return;

		const volumeStep = 0.05;
		let newVolume = videoElement.volume;
		if (delta < 0) newVolume = Math.min(1.0, newVolume + volumeStep);
		else if (delta > 0) newVolume = Math.max(0.0, newVolume - volumeStep);
		else return;
		videoElement.volume = newVolume;

		const muteButton = document.getElementById('muteButton') as HTMLDivElement;
		if (newVolume > 0 && videoElement.muted) {
			videoElement.muted = false;
			muteButton.classList.remove('muted');
		} else if (newVolume === 0 && !videoElement.muted) {
			videoElement.muted = true;
			muteButton.classList.add('muted');
		}

		const volumeLevelBar = document.getElementById('volumeLevel') as HTMLDivElement,
			volumeHandle = document.querySelector('#volumeSlider a[role="slider"]') as HTMLAnchorElement;
		const volumePercent = Math.round(newVolume * 100);
		volumeHandle.style.bottom = `${volumePercent}%`;
		volumeLevelBar.style.height = `${volumePercent}%`;
		volumeHandle.setAttribute('aria-valuenow', volumePercent.toString());
		volumeHandle.setAttribute('aria-valuetext', `${volumePercent} percent`);
	}

	function fullScreenToggleHandler(event: KeyboardEvent) {
		if (event.code !== 'KeyF' && event.key !== 'F' && event.key !== 'f') return;
		event.preventDefault();

		const mainElement = document.getElementById("primaryScreen") as HTMLVideoElement;
		if (document.fullscreenElement)
			document.exitFullscreen();
		else
			mainElement.dispatchEvent(new MouseEvent("dblclick", {bubbles: true, cancelable: true, view: window}));
	}

	const storageData = await chrome.storage.local.get({
		panopto_speed: 1.0, panopto_dark_mode: false, panopto_return_backwards: false, panopto_floating_speed: false,
		panopto_scroll_volume: false, panopto_save: true, panopto_hide_thumbnails: false, panopto_hide_sidebar: false,
	}) as StorageData;
	if (chrome.runtime.lastError) console.error("TE_panopto: " + chrome.runtime.lastError.message);

	const darkModeStyle = document.head.appendChild(document.createElement("style")).sheet as CSSStyleSheet;
	if (storageData.panopto_save && storageData.panopto_dark_mode) toggleDarkMode(darkModeStyle);

	if (window.location.href.includes("List.aspx"))
		await setupFolderDownloadButtons();
	else if (window.location.href.includes("Viewer.aspx")) {
		setupDetachableVideoPlayer();
		setupTimer();
		setupMenu();
		document.addEventListener('keydown', (event) => fullScreenToggleHandler(event));

		if (storageData.panopto_save) {
			(document.getElementById("m_save") as HTMLInputElement).checked = storageData.panopto_save;
			(document.getElementById("m_dark_mode") as HTMLInputElement).checked = storageData.panopto_dark_mode;
			(document.getElementById("m_return_backwards") as HTMLInputElement).checked = storageData.panopto_return_backwards;
			(document.getElementById("m_floating_speed") as HTMLInputElement).checked = storageData.panopto_floating_speed;
			(document.getElementById("m_scroll_volume") as HTMLInputElement).checked = storageData.panopto_scroll_volume;

			const thumbnailsButton = document.getElementById("toggleThumbnailsButton") as HTMLDivElement,
				sidebarButton = document.querySelector("#eventsExpanderButton > div[role=button]") as HTMLDivElement;
			thumbnailsButton?.addEventListener("click",
				async () => await saveSetting("show_hide_thumbnails"));
			sidebarButton?.addEventListener("click",
				async () => await saveSetting("show_hide_sidebar"));
			setTimeout(() => {
				if (storageData.panopto_hide_thumbnails && thumbnailsButton?.style.display !== "none")
					thumbnailsButton.click();
				if (storageData.panopto_hide_sidebar && sidebarButton?.parentElement!.style.visibility !== "hidden" &&
					sidebarButton.ariaExpanded === 'true')
					sidebarButton.click();

				(document.getElementById("tplus_menu") as HTMLDivElement).classList.remove("start");
			}, 2E3);

			const videoElement = document.getElementById("primaryVideo") as HTMLVideoElement;
			videoElement.addEventListener("ratechange", async () => {
				if ((document.getElementById("m_return_backwards") as HTMLInputElement).checked && videoElement.playbackRate < speed) {
					videoElement.currentTime = Math.max(0, videoElement.currentTime - 10);
				}
				speed = videoElement.playbackRate;
				updateRealTime();
				await saveSetting("speed");

				const checkmarkDiv = document
					.querySelector("#captionSettings > div > ul > li > div:nth-of-type(2)") as HTMLDivElement;
				if (checkmarkDiv) checkmarkDiv.style.display = "none";
			});

			for (const video of document.querySelectorAll(".video-js"))
				(video as HTMLVideoElement).addEventListener("loadedmetadata",
					() => (video as HTMLVideoElement).playbackRate = storageData.panopto_speed);

			if (storageData.panopto_floating_speed) setupFloatingSpeedController();
			document.addEventListener("fullscreenchange", () => {
				const floatingController = document.getElementById("tplus_floating_speed_controller");
				if (!floatingController) return;

				const fullscreenParent = document.fullscreenElement
					? document.fullscreenElement as HTMLElement : document.body;
				fullscreenParent.appendChild(floatingController);
			});

			document.addEventListener('wheel', (event) => {
				if ((document.getElementById("m_scroll_volume") as HTMLInputElement).checked)
					changeVolume(event.deltaY);
			});
		}
	}
})();
