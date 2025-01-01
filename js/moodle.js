'use strict';

(function () {
	let l, n, e, h;

	function f(element, className, c = {}, text = "", d = null, k = false) {
		element = document.createElement(element);
		element.textContent = text;
		element.className = className;
		for (const m in c) element.setAttribute(m, c[m]);
		null != d && (k ? d.insertBefore(element, d.childNodes[0]) : d.appendChild(element));
		return element;
	}

	function r(a, b, c, g) {
		return f("a", c ? "maor_download_light" : "maor_download", {href: `https://${window.location.hostname}/blocks/material_download/download_materialien.php?courseid=${b}"&ccsectid=${c}`}, g, a, false)
	}

	function u(a) {
		const b = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/,
			c = / - (?:חורף|אביב|קיץ)/,
			g = {};
		for (let k = 0; k < a.length; k++) {
			let d = a[k].getElementsByTagName("h3")[0].textContent.replace(c, "").match(b);
			d && (d = d.groups, g[d.cnum.trim()] = d.cname.trim());
		}
		0 < Object.keys(g).length && chrome.storage.local.set({u_courses: g}, () => {
			chrome.runtime.lastError && console.error("TE_moodle_001_" + mess + ": " + chrome.runtime.lastError.message)
		})
	}

	function t(a) {
		let b = f("section", "block block_material_download card mb-3 tplus_block", {}, "", document.getElementById("block-region-side-pre"), true),
			c = f("div", "card-body", {}, "", b),
			g = f("h5", "card-title d-inline", {
				dir: "ltr",
				style: "background-image: url(" + chrome.runtime.getURL("../icons/technion_plus_plus/icon-32.png") + ");"
			}, "Technion", c);
		f("sup", "", {}, "++", g);
		a = a ? f("div", "card-text mt-3", {style: "display: grid; text-align: center; grid-row-gap: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(128,128,128,.3);"}, "", c) : null;
		c = f("div", "card-text mt-3 tplus_main_actions", {}, "", c);
		g = f("div", "custom-control custom-switch", {style: "text-align: right"}, "", c);
		const d = f("input", "custom-control-input", {id: "tp-darkmode", type: "checkbox"}, "", g);
		f("label", "custom-control-label",
			{"for": "tp-darkmode"}, "מצב לילה", g);
		c = f("div", "", {id: "tp_colorswitcher"}, "", c);
		f("div", "", {style: "text-align: right; width: 8rem"}, "צבע משני", c);
		const k = f("input", "", {type: "range", min: "0", max: "330", step: "30"}, "", c);
		chrome.storage.local.get({remoodle: false, remoodle_angle: 120}, m => {
			d.checked = m.remoodle;
			k.value = m.remoodle_angle
		});
		d.addEventListener("change", () => {
			chrome.storage.local.set({remoodle: d.checked}, () => {
				chrome.runtime.lastError ? console.warn("TE_popup_remoodle: " + chrome.runtime.lastError.message) :
					chrome.runtime.sendMessage({mess_t: "TE_remoodle"});
			});
		});
		k.addEventListener("change", () => {
			const m = parseInt(k.value);
			chrome.storage.local.set({remoodle_angle: m}, () => {
				chrome.runtime.lastError ? console.warn("TE_popup_remoodle: " + chrome.runtime.lastError.message) :
					chrome.runtime.sendMessage({mess_t: "TE_remoodle_reangle", angle: m});
			});
		});
		b = "";
		for (c = 0; 12 > c; c++) b += `hsl(${82 + 30 * c}, 100%, 25%) ${100 * c / 12}% ${100 * (c + 1) / 12}%`, 11 > c && (b += ", ");
		k.setAttribute("style", "background-image: linear-gradient(to left, " + b + ") !important");
		return a
	}

	if (".ac.il/" === window.location.href.split("technion")[1]) {
		if (!document.querySelector(".usermenu > .login")) {
			h = document.getElementsByClassName("coursevisible");
			u(h);
			e = [[], [], []];
			if (0 < h.length) for (n = 0; n < h.length; n++) {
				l = document.createElement("div");
				l.style.cssFloat = "left";
				document.getElementsByClassName("tilecontainer")[n].appendChild(l);
				let a = h[n].getElementsByTagName("h3")[0].textContent,
					b = h[n].getElementsByClassName("coursestyle2url")[0].getAttribute("href");
				a.includes("חורף") ? e[0].push({
					cname: a.replace(" - חורף", ""),
					clink: b
				}) : a.includes("אביב") ? e[1].push({
					cname: a.replace(" - אביב", ""),
					clink: b
				}) : e[2].push({cname: a, clink: b});
				r(l, h[n].getElementsByClassName("coursestyle2url")[0].getAttribute("href").split("?id=")[1], 0, "הורדת קבצי הקורס")
			}
			h = t(true);
			e = h.parentNode;
			e.removeChild(h);
			document.getElementById("coursecontentcollapse1").insertBefore(e.parentNode, document.getElementById("coursecontentcollapse1").childNodes[0]);
			e.style.padding = "8px";
			e.querySelector(".tplus_main_actions").appendChild(e.querySelector("h5")).style.flex = "0 0 200px";
			e.querySelector(".tplus_main_actions").classList.remove("mt-3")
		}
	} else {
		h = window.location.href.split("?id=")[1];
		let p = (e = document.title.match(/(?<cname>.+)\s-\s(?<cnum>[0-9]+)/)) ? e.groups.cnum.trim() : "";
		const q = t(true);
		r(q, h, 0, "הורדת כל הקבצים בקורס");
		"" != p && (p = p.replace(/^0+/, ""), f("a", "maor_download", {
			href: "https://students.technion.ac.il/local/technionsearch/course/" + p,
			target: "_blank"
		}, "דף הקורס בפורטל הסטודנטים", q), chrome.storage.local.get({
			videos_data: {},
			videos_courses: []
		}, a => {
			let c = 0, b = "";
			for (; c < a.videos_courses.length; c++) if (a.videos_courses[c].join(" ").includes(p)) {
				b = a.videos_courses[c][0];
				break
			}
			if ("" != b && a.videos_data[b]) for (a = a.videos_data[b], 0 < a.length && f("div", "", {style: "text-align: right; margin: 8px 0 0;"}, "הקלטות וידאו", q), b = 0; b < a.length; b++) {
				let g = (c = a[b].p) ? `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${a[b].l}"` : `https://video.technion.ac.il/Courses/${a[b].l}.html`,
					d = 1 < a.length ? "וידאו #" + (b + 1) : "וידאו";
				d = 0 < a[b].t ? ["הרצאה", "תרגול"][a[b].t - 1] : d;
				d += c ? "(פנופטו)" : "(שרת הוידאו הטכניוני)";
				f("a", "maor_download", {href: g, target: "_blank", title: a[b].vn ? a[b].vn : p}, d, q)
			}
		}));
		e = document.getElementsByClassName("section main clearfix");
		for (l = 1; l < e.length; l++) e[l].classList.contains("accesshide") || e[l].classList.contains("hidden") || (n = e[l].getAttribute("id").split("section-")[1], r(e[l].getElementsByClassName("course-section-header")[0],
			h, n, "הורדת כל הקבצים בקורס").style.marginRight = "auto")
	}
})();
