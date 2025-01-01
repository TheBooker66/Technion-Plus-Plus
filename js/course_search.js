'use strict';

(function () {
	let b = /course\/([0-9]+)/g.exec(window.location.pathname), c = b ? b[1] : false;
	if (c) {
		6 > c.length && (c = "0" + c);
		b = (new DOMParser).parseFromString('\n    <div id="TP_newbox">\n    <h3 class="card-title">\n        <a data-toggle="collapse" class="foldable" href="#TP_histograms" role="button" aria-expanded="true" aria-controls="TP_histograms" id="TP_histograms_button">\n            \u05d4\u05e6\u05d2\u05ea \u05d4\u05d9\u05e1\u05d8\u05d5\u05d2\u05e8\u05de\u05d5\u05ea\n        </a>\n    </h3>\n    <div id="TP_histograms" class="card-body collapse show">\n        <div id="TP_infobox">\n            <div style="display: none">\n                <div class="properties-section">\n                    \u05d4\u05d9\u05e1\u05d8\u05d5\u05d2\u05e8\u05de\u05d5\u05ea \u05de\u05e9\u05e0\u05d9\u05dd \u05e7\u05d5\u05d3\u05de\u05d5\u05ea\n                    <div class="TP_expand" data-expanded="false"><i class="icon-resize-full icon-white"></i></div>\n                </div>\n                <iframe src=""></iframe>\n                <div class="properties-section">\n                    \u05d7\u05d5\u05d5\u05ea \u05d3\u05e2\u05ea \u05e1\u05d8\u05d5\u05d3\u05e0\u05d8\u05d9\u05dd\n                    <div class="TP_expand" data-expanded="false"><i class="icon-resize-full icon-white"></i></div>\n                </div>\n                <iframe src=""></iframe>\n            </div>\n            <div class="properties-section" style="font-size: 0.8em; text-align: left; font-weight: 400">\n            <label><input type="checkbox" /> \u05d4\u05e6\u05d2 \u05d4\u05d9\u05e1\u05d8\u05d5\u05d2\u05e8\u05de\u05d5\u05ea \u05d5\u05d7\u05d5\u05d5\u05ea \u05d3\u05e2\u05ea</label>\n            \u05d4\u05de\u05d9\u05d3\u05e2 \u05de\u05d5\u05d1\u05d0 \u05e2\u05dc \u05d9\u05d3\u05d9 CheeseFork \u05d3\u05e8\u05da <span style="unicode-bidi: plaintext">Technion<sup>++</sup></span>\n            </div>\n        </div>\n    </div>\n    </div>',
			"text/html").body.firstChild;
		const g = document.querySelector("div[role='main'] > .hero-unit");
		g.insertBefore(b, g.querySelectorAll("h3")[1]);
		const d = b.getElementsByClassName("TP_expand"), f = b.getElementsByTagName("iframe");
		for (let a = 0; a < d.length; a++) d[a].addEventListener("click", () => {
			const h = "false" === d[a].getAttribute("data-expanded");
			f[a].style.height = h ? "600px" : "";
			d[a].setAttribute("data-expanded", h ? "true" : "false")
		});
		const l = b.querySelector("#TP_infobox > div"), e = b.querySelector("input[type='checkbox']"),
			k = a => {
				e.checked = a;
				l.style.display = a ? "block" : "none";
				f[0].src = a ? `https://cheesefork.cf/course-widget-histograms.html?course=${c}` : "";
				f[1].src = a ? `https://cheesefork.cf/course-widget-comments.html?course=${c}` : ""
			};
		e.addEventListener("change", () => {
			k(e.checked);
			chrome.storage.local.set({ug_hist: e.checked})
		});
		chrome.storage.local.get({ug_hist: false}, a => {
			k(a.ug_hist)
		})
	}
})();