'use strict';
(function () {
	var h = (new DOMParser).parseFromString('\n<div style="color: #777; font-style: italic; z-index:1; width: 250px; margin:auto; display:block; padding: 10px; line-height:1; position: relative;text-align: center; direction: rtl; display: none">\n\t<h4 dir="ltr">Technion<sup>++</sup></h4>\n\t\u05d4\u05d5\u05d5\u05d9\u05d3\u05d0\u05d5 \u05e0\u05e4\u05ea\u05d7 \u05dc\u05ea\u05e6\u05d5\u05d2\u05d4 \u05d1\u05d7\u05dc\u05d5\u05df \u05d7\u05d3\u05e9, \u05d9\u05e9 \u05dc\u05e1\u05d2\u05d5\u05e8 \u05d0\u05ea \u05d4\u05d7\u05dc\u05d5\u05df \u05d4\u05d7\u05d3\u05e9 \u05db\u05d3\u05d9 \u05dc\u05d7\u05d6\u05d5\u05e8 \u05d5\u05dc\u05e6\u05e4\u05d5\u05ea \u05d1\u05d5\u05d5\u05d9\u05d3\u05d0\u05d5 \u05db\u05d0\u05df.\n</div>\n',
		"text/html").querySelector("div");
	document.getElementById("secondaryScreen").insertBefore(h, document.getElementById("secondaryScreen").childNodes[0]);
	var e = document.getElementById("m_expand");
	e.classList.remove("maor_hidden");
	var k = document.getElementsByClassName("video-js"), b = k[k.length - 1], l = a => {
		b.style.display = a ? "none" : "block";
		h.style.display = a ? "block" : "none";
		e.style.opacity = a ? .3 : 1
	};
	e.addEventListener("click", function () {
		if (.3 != e.style.opacity) {
			l(!0);
			var a = window.open("", "Technion", "width=830,height=655,menubar=no,statusbar=no,titlebar=no,toolbar=no");
			a.document.title = "Technion - " + document.title;
			a.document.body.setAttribute("style", "text-align: center; background: #000; font-family: arial; direction: rtl; font-size: 11px; color: #f9f9fa;");
			var c = document.createElement("canvas");
			a.document.body.appendChild(c);
			c.height = b.videoHeight;
			c.width = b.videoWidth;
			c.setAttribute("style", "max-width: 800px; border: 1px solid #fff; margin: auto; display: block;");
			var m = c.getContext("2d");
			m.drawImage(b, 0, 0);
			var f = function () {
				b.paused || b.ended || (c.height = b.videoHeight,
					c.width = b.videoWidth, m.drawImage(b, 0, 0), setTimeout(f, 1E3 / 60))
			};
			f();
			b.addEventListener("play", f);
			var g = !1;
			a.document.addEventListener("dblclick", function () {
				g && ("function" === typeof a.document.mozCancelFullScreen ? a.document.mozCancelFullScreen() : a.document.webkitExitFullscreen(), g = !1)
			});
			var d = document.createElement("button");
			d.addEventListener("click", function () {
				"function" === typeof c.mozRequestFullScreen ? c.mozRequestFullScreen() : c.webkitRequestFullscreen();
				g = !0
			});
			d.textContent = "\u05de\u05e1\u05da \u05de\u05dc\u05d0";
			d.setAttribute("style", "margin: 8px; cursor: pointer");
			a.document.body.appendChild(d);
			a.onbeforeunload = () => l(!1);
			d = document.createElement("span");
			d.textContent = "\u05e0\u05d9\u05ea\u05df \u05dc\u05d2\u05e8\u05d5\u05e8 \u05d0\u05ea \u05d4\u05d7\u05dc\u05d5\u05df \u05dc\u05de\u05e1\u05da \u05e9\u05e0\u05d9 \u05d5\u05db\u05da \u05dc\u05e6\u05e4\u05d5\u05ea \u05d1\u05d5\u05d5\u05d9\u05d3\u05d0\u05d5 \u05d1\u05de\u05e6\u05d1 \u05de\u05e1\u05da \u05de\u05dc\u05d0 \u05d1\u05e9\u05e0\u05d9 \u05d4\u05de\u05e1\u05db\u05d9\u05dd.";
			a.document.body.appendChild(d)
		}
	})
})();
