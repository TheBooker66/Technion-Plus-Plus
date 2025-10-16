(async function () { //PANOPTO UPDATE. Fixes the entirety of issue #7.
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
		downloadAllButton.setAttribute("class", "maor_panopto_action css-fehuet");
		downloadSelectedButton.setAttribute("class", "maor_panopto_action css-fehuet");
		const pollingInterval = setInterval(() => {
			if ((document.getElementById("loadingMessage") as HTMLElement).style.display === "none" &&
				document.querySelectorAll(".thumbnail-link").length > 0 &&
				(document.querySelector(".thumbnail-link") as HTMLElement).style.display !== "none") {
				clearInterval(pollingInterval);
				const tableRows = (document.getElementById("listViewContainer") as HTMLTableElement).querySelectorAll("tr");
				for (let i = 0; i < tableRows.length - 1; i++) {
					const titleElement = tableRows[i].querySelector(".item-title") as HTMLElement;
					if (titleElement.querySelectorAll(".maor_download").length !== 0) continue;

					const downloadLink = document.createElement("a");
					downloadLink.setAttribute("class", "maor_download");
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
					checkboxLabel.setAttribute("class", "maor_download");
					checkboxLabel.textContent = "בחר";
					checkbox.setAttribute("type", "checkbox");
					checkbox.className = "maor_check";
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
			actionHeaderDiv = document.querySelector("#actionHeader > div") as HTMLDivElement;

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
				if (!(listRows[i].querySelector(".maor_check") as HTMLInputElement).checked) continue;
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

			(document.getElementById("m_cant_download") as HTMLDivElement).classList.add("maor_hidden");
			const downloadButton = document.getElementById(`m_download_mp${downloadType as "3" | "4"}`) as HTMLAnchorElement;
			downloadButton.classList.remove("maor_hidden");
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
			videoSelectionContainer.className = "maor_hidden";
			(document.getElementById("maor_menu") as HTMLDivElement).classList.remove("start", "overlaid");
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
				(document.getElementById("maor_menu") as HTMLDivElement).classList.add("start", "overlaid");
				videoSelectionContainer.className = "maor_persist";
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
					(document.getElementById("secondaryScreen") as HTMLDivElement)
						.insertBefore(newWindowMessageDiv, (document.getElementById("secondaryScreen") as HTMLDivElement).childNodes[0]);
					const expandButton = document.getElementById("m_expand") as HTMLAnchorElement,
						videoElements = document.querySelectorAll(".video-js") as NodeListOf<HTMLVideoElement>,
						secondaryVideoElements = videoElements[videoElements.length - 1] as HTMLVideoElement,
						toggleSecondaryVideoDisplay = (HideVideoEh: boolean) => {
							secondaryVideoElements.style.display = HideVideoEh ? "none" : "block";
							newWindowMessageDiv.style.display = HideVideoEh ? "block" : "none";
							expandButton.style.opacity = HideVideoEh ? "0.3" : "1.0";
						};
					expandButton.classList.remove("maor_hidden");
					expandButton.addEventListener("click", () => {
						if (expandButton.style.opacity === "0.3") return;

						toggleSecondaryVideoDisplay(true);
						const newWindow = window.open("", "Technion", "width=830,height=655,menubar=no,statusbar=no,titlebar=no,toolbar=no") as Window;
						newWindow.document.title = "Technion - " + document.title;
						newWindow.document.body.setAttribute("style", "{text-align: center; background: #000; font-family: arial,serif; direction: rtl; font-size: 11px; color: #f9f9fa;}".replace(/[{}]/g, ''));
						const newWindowCanvas = document.createElement("canvas");
						newWindow.document.body.appendChild(newWindowCanvas);
						newWindowCanvas.height = secondaryVideoElements.videoHeight;
						newWindowCanvas.width = secondaryVideoElements.videoWidth;
						newWindowCanvas.setAttribute("style", "{max-width: 800px; border: 1px solid #fff; margin: auto; display: block;}".replace(/[{}]/g, ''));
						newWindowCanvas.getContext("2d")!.drawImage(secondaryVideoElements, 0, 0);
						const drawVideoFrame = () => {
							if (secondaryVideoElements.paused || secondaryVideoElements.ended) return;
							newWindowCanvas.height = secondaryVideoElements.videoHeight;
							newWindowCanvas.width = secondaryVideoElements.videoWidth;
							newWindowCanvas.getContext("2d")!.drawImage(secondaryVideoElements, 0, 0);
							setTimeout(drawVideoFrame, 1E3 / 60);
						};
						drawVideoFrame();
						secondaryVideoElements.addEventListener("play", drawVideoFrame);
						const fullscreenButton = document.createElement("button"),
							instructionsSpan = document.createElement("span");
						let NewWindowFullscreenEh = false;
						fullscreenButton.textContent = "מסך מלא";
						fullscreenButton.style.margin = "8px";
						fullscreenButton.style.cursor = "pointer";
						instructionsSpan.textContent = "ניתן לגרור את החלון למסך שני וכך לצפות בווידאו במצב מסך מלא בשני המסכים.";
						newWindow.document.addEventListener("dblclick", () => {
							if (!NewWindowFullscreenEh) return;
							// @ts-ignore
							"function" === typeof newWindow.document.mozCancelFullScreen ? newWindow.document.mozCancelFullScreen() : newWindow.document.webkitExitFullscreen();
							NewWindowFullscreenEh = false;
						});
						fullscreenButton.addEventListener("click", () => {
							// @ts-ignore
							"function" === typeof newWindowCanvas.mozRequestFullScreen ? newWindowCanvas.mozRequestFullScreen() : newWindowCanvas.webkitRequestFullscreen();
							NewWindowFullscreenEh = true;
						});
						newWindow.document.body.appendChild(fullscreenButton);
						newWindow.onbeforeunload = () => toggleSecondaryVideoDisplay(false);
						newWindow.document.body.appendChild(fullscreenButton);
					});

					observer.disconnect();
					return;
				}
		})).observe((document.getElementById("viewerContent") as HTMLElement), {childList: true, subtree: true});
	}

	function toggleDarkMode(styleSheet: CSSStyleSheet) {
		if (styleSheet.cssRules.length === 1)
			["#viewer {background-color: #000 !important;}",
				"#viewerHeader, .transport-button, #timeElapsed, #timeRemaining, #positionControl, .viewer .transport-button .clicked, #volumeFlyout, #playSpeedExpander, #qualityButton, #qualityExpander, #inlineMessageLetterbox, .next-delivery-thumb, #thumbnailList, #thumbnailList img, .thumbnail-timestamp {filter:invert(1);}",
				"#leftPane aside {background-color: #eee; filter: invert(1);}",
				"#leftPane {background-color: #111;}",
				"#playControlsWrapper {background-color: #000;}",
				"#playControls {background-color: #000; border-top: 1px solid #555; opacity: 0.8;}",
				"#playControls:hover, #playControls:focus {opacity: 1;}",
				"#thumbnailList {background-color: #eee;}",
				"#leftPane #eventTabs #eventTabControl .event-tab-header{filter:invert(0.05);}",
				"#leftPane #searchRegion input {background-color: transparent}",
				"#transportControls {background-color: transparent !important; border-left-color: #0c0c0d !important;}",
				"#playSpeedExpander > div, #qualityExpander > div {filter: none !important;}",
				"#thumbnailList img {opacity: 0.5;}",
				"#thumbnailList img:hover{opacity:1}",
			].forEach(cssRule => styleSheet.insertRule(cssRule, 0));
		else while (styleSheet.cssRules.length > 1) styleSheet.deleteRule(0);
	}

	async function saveSetting(settingsKey: "showhide" | "darkmode" | "speed" | "settings") {
		const settingsObj: { [key: string]: string | boolean | number } = {};
		switch (settingsKey) {
			case "showhide":
				settingsObj.panopto_hide = "true" !== (document.getElementById("toggleThumbnailsButton") as HTMLElement).getAttribute("aria-expanded");
				break;
			case "darkmode":
				settingsObj.panopto_light = (document.getElementById("m_darkmode") as HTMLInputElement).checked;
				break;
			case "speed":
				settingsObj.panopto_speed = (document.querySelector(".play-speed .selected") as HTMLDivElement).id;
				break;
			case "settings":
				settingsObj.panopto_save = (document.getElementById("m_save") as HTMLInputElement).checked;
		}
		await chrome.storage.local.set(settingsObj);
		if (chrome.runtime.lastError) console.error("TE_panopto: " + chrome.runtime.lastError.message);
	}

	async function copyTimestampedURL(markdownLinkEh: boolean) {
		const url = document.URL, startPos = url.indexOf("&");
		const parsedURL = startPos === -1 ? url : url.substring(0, startPos);

		const videoElement =
			document.querySelector("video#secondaryVideo") as HTMLVideoElement || // Dual player
			document.querySelector("video#primaryVideo") as HTMLVideoElement; // Single player
		const timestampUrl = `${parsedURL}&start=${videoElement.currentTime}`;

		if (!markdownLinkEh) {
			await navigator.clipboard.writeText(timestampUrl);
			window.alert("הקישור הועתק ללוח!");
		} else {
			let resultText = "";
			const LEVEL_CONNECTION_SYMBOL = "→",
				tabTitle = document.title,
				parentName = document.querySelector("#parentName")?.textContent,
				videoSectionName = document.querySelector(".index-event.highlighted .event-text span")?.textContent;

			if (parentName) resultText += `${parentName} ${LEVEL_CONNECTION_SYMBOL} `;
			if (videoSectionName) resultText += ` ${LEVEL_CONNECTION_SYMBOL} ${videoSectionName}`;
			resultText += tabTitle;

			const mdLink = `[${resultText}](${timestampUrl})`;
			await navigator.clipboard.writeText(mdLink);
			window.alert("הקישור הועתק ללוח!");
		}
	}

	function changeRealTime(wrongTimeElement: HTMLDivElement, newTimeElement: HTMLDivElement) {
		const playbackRate = (document.getElementById("primaryVideo") as HTMLVideoElement).playbackRate || 1;
		const timeString = wrongTimeElement.textContent.trim();
		if (!timeString) return;

		const cleanedTimeString = timeString.startsWith('-') ? timeString.substring(1) : timeString;
		const timeParts = cleanedTimeString.split(':').map(part => parseInt(part, 10));

		// Handle different time formats (e.g. 'MM:SS' or 'HH:MM:SS')
		let totalSeconds = 0;
		if (timeParts.length === 3) {
			totalSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
		} else if (timeParts.length === 2) {
			totalSeconds = timeParts[0] * 60 + timeParts[1];
		} else {
			console.error("TE_panopto_real_time: Invalid time format in the source element.");
			return;
		}

		if (timeParts.some(isNaN)) return;

		const adjustedSeconds = totalSeconds / playbackRate;
		const hours = Math.floor(adjustedSeconds / 3600),
			minutes = Math.floor((adjustedSeconds % 3600) / 60),
			seconds = Math.floor(adjustedSeconds % 60);

		const formattedMinutes = String(minutes).padStart(2, '0'),
			formattedSeconds = String(seconds).padStart(2, '0');

		const rateText = ` (x${playbackRate})`;
		const timeText = (hours > 0 ? `${String(hours).padStart(2, '0')}:` : '') + `${formattedMinutes}:${formattedSeconds}`;
		newTimeElement.textContent = `-${timeText}`;

		const rateSpan = document.createElement('small');
		rateSpan.textContent = rateText;
		newTimeElement.prepend(rateSpan);
	}

	function setupMenu() {
		const menu = (new DOMParser).parseFromString(`
<div id="maor_menu_container">
    <div id="maor_menu" class="start">
        <div id="maor_content">
            <div id="maor_overlay"></div>
            <div id="m_cant_download"><a><i>הורדת ההקלטה נחסמה על ידי צוות הקורס</i></a></div>
            <a id="m_download_mp4" class="maor_hidden">הורדת הקלטה</a>
            <a id="m_download_mp3" class="maor_hidden">הורדת שמע</a>
            <div id="m_vid_list" class="maor_hidden">
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
            <a id="m_expand" class="maor_hidden">פצל לשני מסכים</a>
            <a id="m_float" class="maor_hidden">פתח בחלון צף</a>
            <a id="m_speed">
                <div><span>2.25</span><span>2.5</span><span>2.75</span><span>3</span></div>
                <span style="display: block">מהירויות נוספות</span>
            </a>
            <a id="m_sound">שיפורי שמע</a>
            <label for="m_darkmode"><a>מצב לילה<input id="m_darkmode" type="checkbox" /></a></label>
            <label for="m_save"><a>זכור הגדרות<input id="m_save" type="checkbox" /></a></label>
        </div>
        <div id="maor_koteret">Technion<sup>++</sup></div>
    </div>
    <div id="maor_sound">
        <div class="m_header">
            שיפורי שמע <sup>BETA</sup>
            <span id="maor_sound_close">סגור</span>
        </div>

        <div class="m_grid">
            <div>
                השימוש באפקטים הבאים עלול להגביר רעשי רקע.
                <span style="display: none"><br />בדפדפן פיירפוקס, השימוש באפקטים הנ"ל ינעל את הרצת הווידאו למהירות x1. כדי לבטל נעילה זו יש לרענן את הדף.</span>
            </div>
            <div>
                <b>רמת סינון רעשי רקע</b><br />
                סינון בסיסי, שימושי למשל עבור הקלטות עם "זמזום חשמלי" ברקע.
            </div>
            <div>
                <select id="maor_sound_noise">
                    <option selected value="0">ללא</option>
                    <option value="1">נמוכה</option>
                    <option value="2">בינונית</option>
                    <option value="3">גבוהה</option>
                </select>
            </div>
            <div>
                <b>תוספת ווליום</b><br />
                שימושי כאשר עוצמת השמע של ההקלטה נמוכה מאוד.
            </div>
            <div>
                <select id="maor_sound_volume">
                    <option selected value="0">ללא</option>
                    <option value="1">נמוכה</option>
                    <option value="2">בינונית</option>
                    <option value="3">גבוהה</option>
                </select>
            </div>
            <div>
                <b>איזון צלילים</b><br />
                מגביר צלילים נמוכים ומנמיך צלילים גבוהים מאוד. שימושי כאשר איכות ההקלטה לא אחידה.
            </div>
            <div>
                <select id="maor_sound_compressor">
                    <option selected value="0">כבוי</option>
                    <option value="1">פעיל</option>
                </select>
            </div>
        </div>
        <div class="m_grid" style="display: none">
            עקב מגבלות טכניות לא ניתן להשתמש בשיפורי שמע עבור הקלטה זו.
        </div>
    </div>
</div>
`, "text/html").getElementById("maor_menu_container") as HTMLDivElement;
		for (let menuButton of menu.querySelectorAll("a"))
			if (menuButton.id)
				menuButton.style.backgroundImage = `url(${chrome.runtime.getURL("icons/panopto/" + menuButton.id.replace(/_mp[34]/, "") + ".svg")})`;

		const bigBossElement = document.getElementById("transportControls") as HTMLDivElement;
		bigBossElement.appendChild(document.createElement("div")).classList.add("maor_menu_divider", "transport-button");
		bigBossElement.appendChild(menu);
		(document.getElementById("maor_koteret") as HTMLDivElement).style.backgroundImage = `url(${chrome.runtime.getURL("../icons/technion_plus_plus/logo.svg").toString()})`;

		setupVideoDownloadButtons();
		snapshotHandler();

		(document.getElementById("m_save") as HTMLAnchorElement).addEventListener("change", () => saveSetting("settings"));

		if (document.pictureInPictureEnabled && !(document.querySelector(".video-js") as HTMLVideoElement).disablePictureInPicture) {
			const floatyButton = document.getElementById("m_float") as HTMLAnchorElement;
			floatyButton.classList.remove("maor_hidden");
			floatyButton.addEventListener("click", async () => {
				if (!document.pictureInPictureElement)
					await (document.querySelector(".video-js") as HTMLVideoElement).requestPictureInPicture();
			});
		}

		const wrongTime = document.getElementById("timeRemaining") as HTMLDivElement,
			realTime = document.createElement("div") as HTMLDivElement;
		realTime.id = "ethan_realtimeRemaining";
		realTime.setAttribute("style", "{vertical-align: middle; width: 44px; font-size: 0.95em; color: #fff;}".replace(/[{}]/g, ''));
		bigBossElement.insertBefore(realTime, document.getElementById("liveButton"));
		const observer = new MutationObserver(_ => changeRealTime(wrongTime, realTime));
		setTimeout(() => observer.observe(wrongTime, {
			characterData: false, attributes: false, childList: true, subtree: false,
		}), 1E3);

		for (const span of document.querySelectorAll("#m_speed span"))
			span.addEventListener("click", () => {
				for (const speedButton of document.querySelectorAll(".video-js"))
					(speedButton as HTMLVideoElement).playbackRate = parseInt(span.textContent);
				let selectedElement = document.querySelector(".maor_selected");
				if (selectedElement) selectedElement.classList.remove("maor_selected");
				span.classList.add("maor_selected");
			});

		(document.getElementById("m_sound") as HTMLAnchorElement).style.display = "none";

		const timestampSpans = document.querySelectorAll("#m_timestamp span");
		timestampSpans[0].addEventListener("click", () => copyTimestampedURL(false));
		timestampSpans[1].addEventListener("click", () => copyTimestampedURL(true));
	}


	if (window.location.href.includes("List.aspx"))
		await setupFolderDownloadButtons();
	else if (window.location.href.includes("Viewer.aspx")) {
		setupMenu();
		const darkModeStyle = document.head.appendChild(document.createElement("style")).sheet as CSSStyleSheet;
		darkModeStyle.insertRule(".player {background-color: #000 !important;}", 0);
		(document.getElementById("m_darkmode") as HTMLInputElement).addEventListener("change", async () => {
			toggleDarkMode(darkModeStyle);
			await saveSetting("darkmode");
		});

		const storageData = await chrome.storage.local.get({
			panopto_speed: "Normal", panopto_light: false, panopto_hide: false, panopto_save: true,
		});
		if (chrome.runtime.lastError) console.error("TE_panopto: " + chrome.runtime.lastError.message);
		if (storageData.panopto_save) {
			(document.getElementById("m_save") as HTMLInputElement).checked = storageData.panopto_save;
			if (storageData.panopto_light) toggleDarkMode(darkModeStyle);
			(document.getElementById("m_darkmode") as HTMLInputElement).checked = storageData.panopto_light;
			const controlsCheckInterval = setInterval(() => {
				if (document.getElementById("Faster")) {
					clearInterval(controlsCheckInterval);
					const thumbnailsButton = document.getElementById("toggleThumbnailsButton") as HTMLElement;
					if (storageData.panopto_hide && thumbnailsButton.style.display !== "none") thumbnailsButton.click();
					(document.getElementById(storageData.panopto_speed) as HTMLDivElement).click();
					for (let speed of document.querySelectorAll(".play-speed"))
						speed.addEventListener("click", () => {
							saveSetting("speed");
							const selectedElement = document.querySelector(".maor_selected");
							if (selectedElement) selectedElement.classList.remove("maor_selected");
						});
					thumbnailsButton.addEventListener("click", () => saveSetting("showhide"));
				}
			}, 2E3);
		}

		setupDetachableVideoPlayer();
		setTimeout(() => (document.getElementById("maor_menu") as HTMLDivElement).classList.remove("start"), 1500);
	}
})();
