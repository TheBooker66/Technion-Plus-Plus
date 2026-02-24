(function () {
	function createDownloadButton(fileLinks: string[][], parentContainer: HTMLDivElement, buttonText: string, index: number) {
		if (0 >= fileLinks.length) return;
		const downloadButton = document.createElement("a");
		downloadButton.setAttribute("class", "tplus_download");
		downloadButton.addEventListener("click", async () => {
			const webcourseEh = window.location.hostname.includes("webcourse");
			const pagePrefix = window.location.href.includes("ho_") ? decodeURIComponent(decodeURIComponent(window.location.href.split("ho_")[1].split(".html")[0])).replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "").trim() + "/" : "",
				downloadChunk: { sys: number, sub_pre: string, list: { [key: string]: string }[] } = {
					sys: 1, sub_pre: "", list: [],
				};

			const courseTitleElement = document.querySelector(".titlebarname span") as HTMLSpanElement;
			let courseTitle = courseTitleElement.querySelector(".lang-en") ? courseTitleElement.querySelector(".lang-en")!.textContent.trim() : courseTitleElement.textContent.trim();
			courseTitle = courseTitle ?? document.querySelector("html")!.getAttribute("data-course")!.trim();
			courseTitle = courseTitle.replace(/\./g, " ").replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "");

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

	document.querySelectorAll('a[target="wc_output"]')
		.forEach(a => (a as HTMLAnchorElement).target = "_blank");

	if (!/h[ow](_.*)?\.html/.test(window.location.href)) return;

	const ticketContainers = document.querySelectorAll(".tickets");
	for (let i = 0; i < ticketContainers.length; i++) {
		let pdfLinks = [], pptLinks = [], docLinks = [], zipLinks = [], otherLinks = [];
		for (let ticket of ticketContainers[i].querySelectorAll(".ticket")) {
			const ticketTitle = ticket.querySelector("h2")!.textContent;
			for (const link of ticket.querySelectorAll("a")) {
				const fileURL = link.getAttribute("href") as string;
				switch (true) {
					case /\.pdf&COOKIE=.+$/i.test(fileURL):
						pdfLinks.push([fileURL, ticketTitle]);
						break;
					case /\.(ppt|pptx|pps|ppsx)&COOKIE=.+$/i.test(fileURL):
						pptLinks.push([fileURL, ticketTitle]);
						break;
					case /\.(doc|docx)&COOKIE=.+$/i.test(fileURL):
						docLinks.push([fileURL, ticketTitle]);
						break;
					case /\.zip&COOKIE=.+$/i.test(fileURL):
						zipLinks.push([fileURL, ticketTitle]);
						break;
					case /\/WCFiles\/.+&COOKIE=.+$/i.test(fileURL):
						otherLinks.push([fileURL, ticketTitle]);
						break;
				}
			}
		}

		const allLinks = pdfLinks.concat(pptLinks, docLinks, zipLinks, otherLinks);
		if (allLinks.length <= 0) continue;

		const groups = [
			{links: pdfLinks, label: "PDF"},
			{links: pptLinks, label: "PowerPoint"},
			{links: docLinks, label: "Word"},
			{links: zipLinks, label: "ZIP"},
		];

		const wrapper = new DOMParser().parseFromString(`
				    <div class="tplus_fieldset">
				        <fieldset>
				            <legend>Technion</legend>
				            <div class="tplus_flex">
				                <label class="tplus_download">
				                    <div>
				                        <input type="checkbox" id="tplus_sub_${i}">
				                        <span>הורד כל כותרת לתיקיה נפרדת</span>
				                    </div>
				                </label>
				            </div>
				        </fieldset>
				    </div>`, "text/html").body.firstChild as HTMLDivElement;
		const container = wrapper.querySelector(".tplus_flex") as HTMLDivElement;
		const checkbox = container.lastElementChild as HTMLSpanElement;

		if (allLinks.length > Math.max(...groups.map(g => g.links.length)))
			createDownloadButton(allLinks, container, "הכל", i);
		groups.forEach(g => createDownloadButton(g.links, container, g.label, i));

		container.appendChild(checkbox);
		ticketContainers[i].prepend(wrapper);
	}
})();
