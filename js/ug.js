'use strict';

(function () {
	let c = (new URL(window.location)).searchParams.get("MK"), b = window.location.pathname.split("rishum/course/")[1],
		d = (b = b ? b.split("/")[0] : b) ? b : c;
	6 > d.length && (d = "0" + d);
	if (d) {
		c = (new DOMParser).parseFromString('\n    <div id="TP_infobox">\n        <div style="display: none">\n            <div class="properties-section">\n                \u05d4\u05d9\u05e1\u05d8\u05d5\u05d2\u05e8\u05de\u05d5\u05ea \u05de\u05e9\u05e0\u05d9\u05dd \u05e7\u05d5\u05d3\u05de\u05d5\u05ea\n                <div class="TP_expand" data-expanded="false"><i class="icon-resize-full icon-white"></i></div>\n            </div>\n            <iframe src=""></iframe>\n            <div class="properties-section">\n                \u05d7\u05d5\u05d5\u05ea \u05d3\u05e2\u05ea \u05e1\u05d8\u05d5\u05d3\u05e0\u05d8\u05d9\u05dd\n                <div class="TP_expand" data-expanded="false"><i class="icon-resize-full icon-white"></i></div>\n            </div>\n            <iframe src=""></iframe>\n        </div>\n        <div class="properties-section" style="font-size: 0.8em; text-align: left; font-weight: 400">\n        <label><input type="checkbox" /> \u05d4\u05e6\u05d2 \u05d4\u05d9\u05e1\u05d8\u05d5\u05d2\u05e8\u05de\u05d5\u05ea \u05d5\u05d7\u05d5\u05d5\u05ea \u05d3\u05e2\u05ea</label>\n        \u05d4\u05de\u05d9\u05d3\u05e2 \u05de\u05d5\u05d1\u05d0 \u05e2\u05dc \u05d9\u05d3\u05d9 CheeseFork \u05d3\u05e8\u05da <span style="unicode-bidi: plaintext">Technion<sup>++</sup></span>\n        </div>\n    </div>',
			"text/html").body.firstChild;
		b = document.querySelector("#content .properties-wrapper");
		b.insertBefore(c, b.querySelectorAll(".properties-section")[1]);
		const e = c.getElementsByClassName("TP_expand"), g = c.getElementsByTagName("iframe");
		for (let a = 0; a < e.length; a++) e[a].addEventListener("click", () => {
			const h = "false" == e[a].getAttribute("data-expanded") ? true : false;
			g[a].style.height = h ? "600px" : "";
			e[a].setAttribute("data-expanded", h ? "true" : "false")
		});
		const l = c.querySelector("#TP_infobox > div"), f = c.querySelector("input[type='checkbox']"),
			k = a => {
				f.checked = a;
				l.style.display = a ? "block" : "none";
				g[0].src = a ? `https://cheesefork.cf/course-widget-histograms.html?course=${d}` : "";
				g[1].src = a ? `https://cheesefork.cf/course-widget-comments.html?course=${d}` : ""
			};
		f.addEventListener("change", () => {
			k(f.checked);
			chrome.storage.local.set({ug_hist: f.checked})
		});
		chrome.storage.local.get({ug_hist: false}, a => {
			k(a.ug_hist)
		})
	}
})();
