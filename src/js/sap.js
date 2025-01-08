'use strict';

(function () {
	function show_histograms(src, course) {
		if (course.length === 8) course = course.slice(1, 4) + course.slice(5, 8);
		const expand = src.getElementsByClassName("TP_expand"),
			iframe = src.getElementsByTagName("iframe");
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
		const tpBlock = src.querySelector("#TP_infobox > div"), checkbox = src.querySelector("input[type='checkbox']"),
			toggleHists = histsEh => {
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
			await chrome.storage.local.set({sap_hist: checkbox.checked});
		});
		chrome.storage.local.get({sap_hist: false}, a => toggleHists(a.sap_hist));
	}

	setTimeout(() => {
		if (!/SM\/([0-9]+)/g.test(window.location.hash)) return;
		const url = /SM\/([0-9]+)/g.exec(window.location.hash);
		let course = url ? url[1] : false; ///([0-9]+)/.exec(document.getElementsByClassName("sapMObjectNumberUnit")?.[1].innerText)[0]
		const src = (new DOMParser).parseFromString(`
<div id="TP_bigbox">
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
</div>`, "text/html").body.firstChild;
		const father = document.getElementsByClassName("sapUxAPObjectPageSectionContainer")[0];
		father.insertBefore(src, father.querySelector("#__xmlview1--objectPageLayout-0-1"));
		show_histograms(src, course);
	}, 5000);
})();