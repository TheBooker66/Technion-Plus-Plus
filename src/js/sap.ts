(function () {
	async function show_histograms(src: HTMLDivElement, course: string) {
		src.setAttribute("data-course", course);

		const expand = src.querySelectorAll(
				".TP_expand",
			) as NodeListOf<HTMLDivElement>,
			iframe = src.querySelectorAll(
				"iframe",
			) as NodeListOf<HTMLIFrameElement>;
		for (let i = 0; i < expand.length; i++)
			expand[i].addEventListener("click", () => {
				if ("false" === expand[i].getAttribute("data-expanded")) {
					iframe[i].style.height = "600px";
					expand[i].setAttribute("data-expanded", "true");
				} else {
					iframe[i].style.height = "";
					expand[i].setAttribute("data-expanded", "false");
				}
			});

		const tpBlock = src.querySelector(
				"#TP_infobox > div",
			) as HTMLDivElement,
			checkbox = src.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement,
			toggleHists = (histsEh: boolean) => {
				checkbox.checked = histsEh;
				if (histsEh) {
					tpBlock.style.display = "block";
					iframe[0].src = `https://cheesefork.cf/course-widget-histograms.html?course=${course}`;
					iframe[1].src = `https://cheesefork.cf/course-widget-comments.html?course=${course}`;
				} else {
					tpBlock.style.display = "none";
					iframe[0].src = "";
					iframe[1].src = "";
				}
			};
		checkbox.addEventListener("change", async () => {
			toggleHists(checkbox.checked);
			await chrome.storage.local.set({ sap_hist: checkbox.checked });
		});
		const storageData = (await chrome.storage.local.get({
			sap_hist: false,
		})) as StorageData;
		toggleHists(storageData.sap_hist);
	}

	async function handlePageChange() {
		// Check if the current page matches the general format
		const father = document.querySelector(
			".sapUxAPObjectPageSectionContainer",
		);
		if (!father) return;
		// Check if the current page is a course page and if the main tab is focused
		const tab =
			(
				document.querySelector(
					"#__xmlview1--objectPageLayout-anchBar-__xmlview1--objectPageLayout-0-anchor-internalSplitBtn",
				) ??
				document.querySelector(
					"#__xmlview1--objectPageLayout-anchBar-__xmlview1--objectPageLayout-0-anchor",
				)
			)?.getAttribute("aria-checked") === "true";
		const course = /([0-9]+)/.exec(
			(
				document.querySelectorAll(".sapMObjectNumberUnit")?.[1] ??
				document.querySelector("#__layout0-0header-content-0-0")
			)?.textContent,
		)?.[0];
		if (!tab || !course) return;

		// Check if the element already exists and if the course is the same
		const existingElement = father.querySelector("#TP_bigbox");
		if (
			existingElement &&
			existingElement.getAttribute("data-course") === course
		)
			return;

		// If all checks pass, insert the new element into the DOM
		const src = new DOMParser().parseFromString(
			`
<div id="TP_bigbox" data-course="">
<h3 class="card-title">היסטוגרמות וחוות דעת</h3>
<div id="TP_histograms" class="card-body collapse show">
<div id="TP_infobox">
<div style="display: none">
<div class="properties-section">
היסטוגרמות משנים קודמות
<div class="TP_expand" data-expanded="false"><i class="icon-resize-full icon-white"></i></div>
</div>
<iframe src=""></iframe>
<div class="properties-section">
חוות דעת סטודנטים
<div class="TP_expand" data-expanded="false"><i class="icon-resize-full icon-white"></i></div>
</div>
<iframe src=""></iframe>
</div>
<div class="properties-section" style="font-size: 0.8em; text-align: left; font-weight: 400">
<label><input type="checkbox" /> הצג היסטוגרמות וחוות דעת</label>
המידע מובא באדיבות CheeseFork על ידי <span style="unicode-bidi: plaintext">Technion<sup>++</sup></span>
</div>
</div>
</div>
</div>`,
			"text/html",
		).body.firstChild as HTMLDivElement;
		father.insertBefore(
			src,
			father.querySelector("#__xmlview1--objectPageLayout-0-1"),
		);
		await show_histograms(src, course);

		// Add the CSS because for some reason loading it normally fails
		const styleLink = document.createElement("link") as HTMLLinkElement;
		styleLink.rel = "stylesheet";
		styleLink.type = "text/css";
		styleLink.href = chrome.runtime.getURL("../css/sap.css");

		document.head.appendChild(styleLink);
	}

	const observer = new MutationObserver(handlePageChange);
	observer.observe(document, { childList: true, subtree: true });
})();
