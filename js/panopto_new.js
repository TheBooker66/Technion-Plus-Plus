'use strict';
(function () {
	const h = (new DOMParser).parseFromString(
		'\n<div style="color: #777; font-style: italic; z-index:1; width: 250px; margin:auto; display:block; ' +
		'padding: 10px; line-height:1; position: relative;text-align: center; direction: rtl; display: none">' +
		'\n\t<h4 dir="ltr">Technion<sup>++</sup></h4>\n\tהוידאו נפתח לתצוגה בחלון חדש, ' +
		'יש לסגור את החלון החדש כדי לחזור ולצפות בווידאו כאן.\n</div>\n',
		"text/html").querySelector("div");
	document.getElementById("secondaryScreen").insertBefore(h, document.getElementById("secondaryScreen").childNodes[0]);
	const e = document.getElementById("m_expand");
	e.classList.remove("maor_hidden");
	const k = document.getElementsByClassName("video-js"), b = k[k.length - 1], l = a => {
		b.style.display = a ? "none" : "block";
		h.style.display = a ? "block" : "none";
		e.style.opacity = a ? .3 : 1
	};
	e.addEventListener("click", function () {
		if (.3 != e.style.opacity) {
			l(!0);
			const a = window.open("", "Technion", "width=830,height=655,menubar=no,statusbar=no,titlebar=no,toolbar=no");
			a.document.title = "Technion - " + document.title;
			a.document.body.setAttribute("style", "text-align: center; background: #000; font-family: arial; direction: rtl; font-size: 11px; color: #f9f9fa;");
			const c = document.createElement("canvas");
			a.document.body.appendChild(c);
			c.height = b.videoHeight;
			c.width = b.videoWidth;
			c.setAttribute("style", "max-width: 800px; border: 1px solid #fff; margin: auto; display: block;");
			const m = c.getContext("2d");
			m.drawImage(b, 0, 0);
			const f = function () {
				b.paused || b.ended || (c.height = b.videoHeight,
					c.width = b.videoWidth, m.drawImage(b, 0, 0), setTimeout(f, 1E3 / 60))
			};
			f();
			b.addEventListener("play", f);
			let g = !1;
			a.document.addEventListener("dblclick", function () {
				g && ("function" === typeof a.document.mozCancelFullScreen ? a.document.mozCancelFullScreen() : a.document.webkitExitFullscreen(), g = !1)
			});
			let d = document.createElement("button");
			d.addEventListener("click", function () {
				"function" === typeof c.mozRequestFullScreen ? c.mozRequestFullScreen() : c.webkitRequestFullscreen();
				g = !0
			});
			d.textContent = "מסך מלא";
			d.setAttribute("style", "margin: 8px; cursor: pointer");
			a.document.body.appendChild(d);
			a.onbeforeunload = () => l(!1);
			d = document.createElement("span");
			d.textContent = "ניתן לגרור את החלון למסך שני וכך לצפות בווידאו במצב מסך מלא בשני המסכים.";
			a.document.body.appendChild(d)
		}
	})
})();
