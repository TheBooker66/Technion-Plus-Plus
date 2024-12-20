'use strict';

import {CommonPopup} from "./p_common.js";

(function () {
	function l() {
		document.getElementById("spinner").style.display = "none";
		document.getElementById("small_spinner").style.display = "none"
	}

	function q(a) {
		var d = document.createElement("div");
		d.className = "divider";
		a.appendChild(d)
	}

	function t(a, d) {
		l();
		d.textContent = "בחר הקלטה לצפייה.";
		m.textContent = "קורס: " + a.name;
		document.getElementsByTagName("h3")[0].style.display = "block";
		n.textContent = "";
		d = ["הרצאה",
			"תרגול"];
		var f = p.loadTemplate("courses-list-item");
		for (let b = 0; b < a.data.length; b++) {
			let c = a.data[b].p, e = f.cloneNode(!0).querySelector(".list_item");
			e.setAttribute("href", c ? `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${a.data[b].l}"` : `https://video.technion.ac.il/Courses/${a.data[b].l}.html`);
			e.getElementsByTagName("span")[0].textContent = a.data[b].vn ? a.data[b].vn : a.name;
			let g = [];
			0 < a.data[b].t && g.push(d[a.data[b].t - 1]);
			a.data[b].b && g.push(a.data[b].b);
			0 < g.length && (e.getElementsByTagName("small")[0].textContent = g.join(", "));
			e.getElementsByTagName("img")[0].src = c ? "../icons/panopto.ico" : "../icons/videoserver.ico";
			n.appendChild(e);
			b < a.data.length - 1 && q(n)
		}
		chrome.storage.local.get({videos_last: []}, b => {
			var c = a.name.split(" - ")[0];
			b = b.videos_last.filter(e => e != c);
			b.push(c);
			7 < b.length && b.splice(0, b.length - 7);
			chrome.storage.local.set({videos_last: b})
		})
	}

	function v(a, d) {
		l();
		d.textContent = "נמצא יותר מקורס מתאים אחד.";
		document.getElementsByTagName("h3")[0].style.display = "block";
		var f = document.createElement("div");
		for (let c = 0; c < a.length; c++) {
			var b = document.createElement("a");
			b.className = "list_item";
			b.textContent = a[c].name;
			b.addEventListener("click", function () {
				document.getElementById("small_spinner").style.display = "block";
				t(a[c], d)
			});
			f.appendChild(b);
			c < a.length - 1 && q(f)
		}
		n.appendChild(f)
	}

	function r(a, d, f, b) {
		if (null == a[0]) b.textContent = "חלה שגיאה בניסיון להשיג את רשימת הקורסים, אנא נסה מאוחר יותר.",
			b.className = "error_bar", l(); else {
			var c = 0, e = [];
			for (let g = 0; g < a.length; g++) {
				let w = a[g].slice(0, 2).join(" - ");
				f.exec(a[g].join(" ")) && (b.textContent = "נמצא קורס כמבוקש!", e[c++] = {
					name: w,
					data: d[a[g][0]]
				})
			}
			0 == c ? (b.textContent = "לא נמצא קורס המתאים לקריטריון המבוקש.", b.className = "attention",
				l()) : 1 == c ? t(e[0], b) : v(e, b)
		}
	}

	function x(a, d, f) {
		var b = [(c, e) => r(c, e, a, d), () => r(f.videos_courses, f.videos_data, a, d)];
		TE_updateVideosInfo(Date.now(), b)
	}

	var p = new CommonPopup(!window.location.href.includes("?"));
	p.title = "חיפוש קורס לצפייה";
	p.css_list = ["course_find"];
	p.popupWrap(true);
	document.getElementById("theform").addEventListener("submit", function (a) {
		0 == document.getElementsByName("course")[0].value.length &&
		a.preventDefault()
	});
	var h = document.getElementById("message"), n = document.getElementById("results"),
		m = document.getElementById("query"),
		k = (new URLSearchParams(window.location.href.split("?")[1])).get("course");
	if (k) if (k = k.replace(/[^a-zA-Z\u05d0-\u05ea0-9\-" ]/g, "").trim(), h.textContent = "\u05de\u05d7\u05e4\u05e9 \u05d0\u05ea \u05d4\u05e7\u05d5\u05e8\u05e1, \u05d0\u05e0\u05d0 \u05d4\u05de\u05ea\u05df...", 0 == k.length) h.textContent = "\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05e9\u05dc\u05d5\u05d7 \u05d1\u05e7\u05e9\u05d4 \u05e8\u05d9\u05e7\u05d4, \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea.",
		h.className = "error_bar", l(), m.style.display = "none"; else if (3 > k.length) h.textContent = "\u05e7\u05e8\u05d9\u05d8\u05e8\u05d9\u05d5\u05df \u05d4\u05d7\u05d9\u05e4\u05d5\u05e9 \u05d7\u05d9\u05d9\u05d1 \u05dc\u05d4\u05d9\u05d5\u05ea \u05de\u05d0\u05d5\u05e8\u05da 3 \u05ea\u05d5\u05d5\u05d9\u05dd \u05d5\u05de\u05e2\u05dc\u05d4.", h.className = "error_bar", l(), m.style.display = "none"; else {
		m.textContent += '"' + k + '"';
		var u = new RegExp(k.replace(/ /g, ".*"));
		chrome.storage.local.get({
			videos_data: {}, videos_courses: [],
			videos_update: 0
		}, function (a) {
			a.videos_update < (new Date).getTime() - 6048E5 || chrome.runtime.lastError ? x(u, h, a) : r(a.videos_courses, a.videos_data, u, h)
		})
	} else document.getElementById("search_block").style.display = "none", document.getElementById("last_searches").style.display = "block", document.querySelector(".main-content > h3").style.display = "none", document.getElementById("myblock").insertBefore(document.getElementById("myform"), document.getElementById("last_searches")), document.querySelector("#myform input").focus(),
		chrome.storage.local.get({videos_last: [], videos_courses: []}, a => {
			var d = document.getElementById("last_list");
			0 == a.videos_last.length ? (d.textContent = "\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05d7\u05d9\u05e4\u05d5\u05e9\u05d9\u05dd \u05e7\u05d5\u05d3\u05de\u05d9\u05dd...", d.style.padding = "8px") : (a.videos_last.reverse().forEach(f => {
				let b = a.videos_courses.filter(e => e[0] == f)[0];
				var c = document.createElement("a");
				c.className = "list_item";
				c.textContent = b.slice(0, 2).join(" - ");
				c.addEventListener("click",
					function () {
						location.href += "?course=" + b[0]
					});
				d.appendChild(c);
				q(d)
			}), document.querySelector(".divider:last-of-type").remove())
		})
})();
