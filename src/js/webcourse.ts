(function () {
	function createDownloadButton(fileLinks: string[][], parentContainer: HTMLDivElement, buttonText: string, index: number) {
		if (0 >= fileLinks.length) return;
		const downloadButton = document.createElement("a");
		downloadButton.setAttribute("class", "tplus_download");
		downloadButton.addEventListener("click", async () => {
			const pagePrefix = window.location.href.includes("ho_") ? decodeURIComponent(decodeURIComponent(window.location.href.split("ho_")[1].split(".html")[0])).replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "").trim() + "/" : "",
				downloadChunk: { sys: number, sub_pre: string, list: { [key: string]: string }[] } = {
					sys: 1, sub_pre: "", list: [],
				};
			const courseTitleElement = document.querySelector(".titlebarname span") as HTMLSpanElement;
			let courseTitle = courseTitleElement.querySelector(".lang-en") ? courseTitleElement.querySelector(".lang-en")!.textContent.trim() : courseTitleElement.textContent.trim();
			courseTitle = courseTitle !== "" ? courseTitle : document.querySelector("html")!.getAttribute("data-course")!.trim();
			courseTitle = courseTitle.replace(/\./g, " ").replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "");
			const webcourseEh = window.location.hostname.includes("webcourse");
			for (let i = 0; i < fileLinks.length; i++) {
				const subdirectory = (document.getElementById("tplus_sub_" + index) as HTMLInputElement).checked ? fileLinks[i][1].replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "").trim() + "/" : "";
				let downloadItem: { [key: string]: string } = {};
				if (webcourseEh) {
					const urlParts = fileLinks[i][0].split("/");
					downloadItem.n = courseTitle + "/" + pagePrefix + subdirectory + decodeURIComponent(urlParts[urlParts.length - 1].split("?")[0]).replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_. ]/g, "").trim();
					downloadItem.u = fileLinks[i][0];
				} else {
					downloadItem.n = courseTitle + "/" + pagePrefix + subdirectory + decodeURIComponent(fileLinks[i][0].split("/WCFiles/")[1]).replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_. ]/g, "").trim();
					downloadItem.u = decodeURIComponent(fileLinks[i][0]).split("/WCFiles/")[1];
				}
				downloadChunk.list.push(downloadItem);
			}
			downloadChunk.sub_pre = webcourseEh ? "" : decodeURIComponent(fileLinks[0][0]).split("?")[1].split("/WCFiles/")[0] + "/WCFiles/";
			downloadChunk.sys = webcourseEh ? 3 : 2;
			await chrome.runtime.sendMessage({mess_t: "multi_download", chunk: downloadChunk});
		});
		downloadButton.textContent = "הכל" === buttonText ? "הורדת כל הקבצים " : "הורדת קבצי " + buttonText + " ";
		const spanElement = document.createElement("span");
		spanElement.style.display = "inline-block";
		spanElement.textContent = " (" + fileLinks.length + ")";
		downloadButton.appendChild(spanElement);
		parentContainer.appendChild(downloadButton);
	}

	let allLinks = document.querySelectorAll("a");
	for (let i = 0; i < allLinks.length; i++)
		allLinks[i].getAttribute("target") === "wc_output" && allLinks[i].setAttribute("target", "_blank");
	if (window.location.href.includes("ho.html") || window.location.href.search("ho_.*.html") !== -1)
		for (let ticketContainers = document.querySelectorAll(".tickets"), i = 0; i < ticketContainers.length; i++) {
			let pdfLinks = [], pptLinks = [], docLinks = [], zipLinks = [], otherLinks = [],
				ticketItems = ticketContainers[i].querySelectorAll(".ticket");
			for (let j = 0; j < ticketItems.length; j++) {
				const fileAnchors = ticketItems[j].querySelectorAll("a"),
					ticketTitle = ticketItems[j].querySelector("h2")!.textContent;
				for (let k = 0; k < fileAnchors.length; k++) {
					const fileURL = fileAnchors[k].getAttribute("href") as string;
					if (/Spring|Summer|Winter/i.test(fileURL)) {
						if (/\.pdf$/i.test(fileURL))
							pdfLinks.push([fileURL, ticketTitle]);
						else if (/\.(ppt|pptx|pps|ppsx)$/i.test(fileURL))
							pptLinks.push([fileURL, ticketTitle]);
						else if (/\.(doc|docx)$/i.test(fileURL))
							docLinks.push([fileURL, ticketTitle]);
						else if (/\.zip$/i.test(fileURL))
							zipLinks.push([fileURL, ticketTitle]);
						else
							otherLinks.push([fileURL, ticketTitle]);
					}
				}
			}
			const allLinks = pdfLinks.concat(pptLinks, docLinks, zipLinks, otherLinks);
			if (allLinks.length <= 0) continue;

			const fieldset = document.createElement("fieldset"),
				downloadButtonsContainer = document.createElement("div");
			fieldset.appendChild(document.createElement("legend")).textContent = "Technion";
			downloadButtonsContainer.className = "tplus_flex";
			if (allLinks.length > pdfLinks.length && allLinks.length > pptLinks.length && allLinks.length > docLinks.length && allLinks.length > zipLinks.length)
				createDownloadButton(allLinks, downloadButtonsContainer, "הכל", i);
			createDownloadButton(pdfLinks, downloadButtonsContainer, "PDF", i);
			createDownloadButton(pptLinks, downloadButtonsContainer, "PowerPoint", i);
			createDownloadButton(docLinks, downloadButtonsContainer, "Word", i);
			createDownloadButton(zipLinks, downloadButtonsContainer, "ZIP", i);
			const checkboxLabel = document.createElement("label"),
				checkboxDiv = document.createElement("div"),
				checkboxInput = document.createElement("input"),
				checkboxText = document.createElement("span");
			checkboxLabel.className = "tplus_download";
			checkboxInput.setAttribute("type", "checkbox");
			checkboxInput.id = "tplus_sub_" + i;
			checkboxText.textContent = "הורד כל כותרת לתיקיה נפרדת";
			checkboxDiv.appendChild(checkboxInput);
			checkboxDiv.appendChild(checkboxText);
			checkboxLabel.appendChild(checkboxDiv);
			downloadButtonsContainer.appendChild(checkboxLabel);
			fieldset.appendChild(downloadButtonsContainer);
			(ticketContainers[i].insertBefore(document.createElement("div").appendChild(fieldset).parentNode as Node, ticketContainers[i].firstChild) as HTMLElement)
				.className = "tplus_fieldset";
		}
})();
