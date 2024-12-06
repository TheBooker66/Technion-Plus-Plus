'use strict';
(function () {
	function f(a, b, c = {}, g = "", d = null, k = !1) {
		a = document.createElement(a);
		a.textContent = g;
		a.className = b;
		for (const m in c) a.setAttribute(m, c[m]);
		null != d && (k ? d.insertBefore(a, d.childNodes[0]) : d.appendChild(a));
		return a
	}

	function r(a, b, c, g) {
		return f("a", c ? "maor_download_light" : "maor_download", {href: `https://${window.location.hostname}/blocks/material_download/download_materialien.php?courseid=${b}"&ccsectid=${c}`}, g, a, !1)
	}

	function u(a) {
		var b = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/,
			c = / - (?:\u05e7\u05d9\u05e5|\u05d7\u05d5\u05e8\u05e3|\u05d0\u05d1\u05d9\u05d1)/, // - קיץ|חורף|אביב
			g = {};
		for (let k = 0; k < a.length; k++) {
			var d = a[k].getElementsByTagName("h3")[0].textContent.replace(c, "").match(b);
			d && (d = d.groups, g[d.cnum.trim()] = d.cname.trim())
		}
		0 < Object.keys(g).length && chrome.storage.local.set({u_courses: g}, () => {
			chrome.runtime.lastError && console.log("TE_moodle_001_" + mess + ": " + chrome.runtime.lastError.message)
		})
	}

	function t(a) {
		var b = f("section", "block block_material_download card mb-3 tplus_block", {}, "", document.getElementById("block-region-side-pre"), !0),
			c = f("div", "card-body", {}, "", b),
			g = f("h5", "card-title d-inline", {dir: "ltr"}, "Technion Plus", c);
		f("sup", "", {}, "+", g);
		a = a ? f("div", "card-text mt-3", {style: "display: grid; text-align: center; grid-row-gap: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(128,128,128,.3);"}, "", c) : null;
		c = f("div", "card-text mt-3 tplus_main_actions", {}, "", c);
		g = f("div", "custom-control custom-switch", {style: "text-align: right"}, "", c);
		var d = f("input", "custom-control-input", {id: "tp-darkmode", type: "checkbox"}, "", g);
		f("label", "custom-control-label",
			{"for": "tp-darkmode"}, "\u05de\u05e6\u05d1 \u05dc\u05d9\u05dc\u05d4", g); // מצב לילה
		c = f("div", "", {id: "tp_colorswitcher"}, "", c);
		f("div", "", {style: "text-align: right; width: 8rem"}, "\u05e6\u05d1\u05e2 \u05de\u05e9\u05e0\u05d9", c); // צבע משני
		var k = f("input", "", {type: "range", min: "0", max: "330", step: "30"}, "", c);
		f("div", "tp_float_button", {style: "background-image: url(" + chrome.runtime.getURL("../icons/icon-16.png") + ");"}, "", b);
		chrome.storage.local.get({remoodle: !1, remoodle_angle: 120}, m => {
			d.checked = m.remoodle;
			k.value = m.remoodle_angle
		});
		d.addEventListener("change", () => {
			chrome.storage.local.set({remoodle: d.checked}, () => {
				chrome.runtime.lastError ? console.log("TE_popup_remoodle: " + chrome.runtime.lastError.message) : chrome.runtime.sendMessage({mess_t: "TE_remoodle"})
			})
		});
		k.addEventListener("change", () => {
			var m = parseInt(k.value);
			chrome.storage.local.set({remoodle_angle: m});
			chrome.runtime.sendMessage({mess_t: "TE_remoodle_reangle", angle: m})
		});
		b = "";
		for (c = 0; 12 > c; c++) b += `hsl(${82 + 30 * c}, 100%, 25%) ${100 * c / 12}% ${100 * (c + 1) / 12}%`, 11 > c && (b += ", ");
		k.setAttribute("style", "background-image: linear-gradient(to left, " + b + ") !important");
		return a
	}

	if (".ac.il/" === window.location.href.split("technion")[1]) {
		if (!document.querySelector(".usermenu > .login")) {
			var h = document.getElementsByClassName("coursevisible");
			u(h);
			var e = [[], [], []];
			if (0 < h.length) for (var n = 0; n < h.length; n++) {
				var l = document.createElement("div");
				l.style.cssFloat = "left";
				document.getElementsByClassName("tilecontainer")[n].appendChild(l);
				let a = h[n].getElementsByTagName("h3")[0].textContent,
					b = h[n].getElementsByClassName("coursestyle2url")[0].getAttribute("href");
				a.includes("\u05d7\u05d5\u05e8\u05e3") ? e[0].push({
					cname: a.replace(" - \u05d7\u05d5\u05e8\u05e3", ""), // - חורף
					clink: b
				}) : a.includes("\u05d0\u05d1\u05d9\u05d1") ? e[1].push({
					cname: a.replace(" - \u05d0\u05d1\u05d9\u05d1", ""), // - אביב
					clink: b
				}) : e[2].push({cname: a, clink: b});
				r(l, h[n].getElementsByClassName("coursestyle2url")[0].getAttribute("href").split("?id=")[1], 0, "\u05d4\u05d5\u05e8\u05d3\u05ea \u05e7\u05d1\u05e6\u05d9 \u05d4\u05e7\u05d5\u05e8\u05e1")
			}
			h =
				t(!0);
			e = h.parentNode;
			e.removeChild(h);
			document.getElementById("coursecontentcollapse1").insertBefore(e.parentNode, document.getElementById("coursecontentcollapse1").childNodes[0]);
			e.style.padding = "8px";
			e.querySelector(".tplus_main_actions").appendChild(e.querySelector("h5")).style.flex = "0 0 200px";
			e.querySelector(".tplus_main_actions").classList.remove("mt-3")
		}
	} else {
		h = window.location.href.split("?id=")[1];
		var p = (e = document.title.match(/(?<cname>.+)\s-\s(?<cnum>[0-9]+)/)) ? e.groups.cnum.trim() : "", q =
			t(!0);
		r(q, h, 0, "\u05d4\u05d5\u05e8\u05d3\u05ea \u05db\u05dc \u05d4\u05e7\u05d1\u05e6\u05d9\u05dd \u05d1\u05e7\u05d5\u05e8\u05e1");
		// הורדת כל הקבצים בקורס
		"" != p && (p = p.replace(/^0+/, ""), f("a", "maor_download", {
			href: "https://students.technion.ac.il/local/technionsearch/course/" + p,
			target: "_blank"
		}, "\u05d3\u05e3 \u05d4\u05e7\u05d5\u05e8\u05e1 \u05d1\u05e4\u05d5\u05e8\u05d8\u05dc \u05d4\u05e1\u05d8\u05d5\u05d3\u05e0\u05d8\u05d9\u05dd", q), chrome.storage.local.get({
			// דף הקורס בפורטל הסטודנטים
			videos_data: {},
			videos_courses: []
		}, a => {
			var b = "";
			for (var c = 0; c < a.videos_courses.length; c++) if (a.videos_courses[c].join(" ").includes(p)) {
				b =
					a.videos_courses[c][0];
				break
			}
			if ("" != b && a.videos_data[b]) for (a = a.videos_data[b], 0 < a.length && f("div", "", {style: "text-align: right; margin: 8px 0 0;"}, "\u05d4\u05e7\u05dc\u05d8\u05d5\u05ea \u05d5\u05d9\u05d3\u05d0\u05d5", q), b = 0; b < a.length; b++) {
				let g = (c = a[b].p) ? `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${a[b].l}"` : `https://video.technion.ac.il/Courses/${a[b].l}.html`,
					d = 1 < a.length ? "\u05d5\u05d9\u05d3\u05d0\u05d5 #" + (b + 1) : "\u05d5\u05d9\u05d3\u05d0\u05d5";
				// וידאו #1 - וידאו #2
				d = 0 < a[b].t ?
					["\u05d4\u05e8\u05e6\u05d0\u05d4", "\u05ea\u05e8\u05d2\u05d5\u05dc"][a[b].t - 1] : d;
				// הרצאה - תרגול
				d += c ? " (\u05e4\u05e0\u05d5\u05e4\u05d8\u05d5)" : " (\u05e9\u05e8\u05ea \u05d4\u05d5\u05d9\u05d3\u05d0\u05d5 \u05d4\u05d9\u05e9\u05df)";
				// (פנופטו) - (שרת הוידאו הטכניוני)
				f("a", "maor_download", {href: g, target: "_blank", title: a[b].vn ? a[b].vn : p}, d, q)
			}
		}));
		e = document.getElementsByClassName("section main clearfix");
		for (l = 1; l < e.length; l++) e[l].classList.contains("accesshide") || e[l].classList.contains("hidden") || (n = e[l].getAttribute("id").split("section-")[1], r(e[l].getElementsByClassName("course-section-header")[0],
			h, n, "\u05d4\u05d5\u05e8\u05d3 \u05d9\u05d7\u05d9\u05d3\u05ea \u05d4\u05d5\u05e8\u05d0\u05d4").style.marginRight = "auto")
		// הורדת כל הקבצים בקורס
	}
})();
