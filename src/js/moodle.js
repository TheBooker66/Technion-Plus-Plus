'use strict';

(function () {
	function create_element(type, className, c = {}, text = "", d = null, k = false) {
		const element = document.createElement(type);
		element.textContent = text;
		element.className = className;
		for (const m in c) element.setAttribute(m, c[m]);
		if (d) k ? d.insertBefore(element, d.childNodes[0]) : d.appendChild(element);
		return element;
	}

	function create_download(a, b, c, g) {
		return create_element("a", c ? "maor_download_light" : "maor_download", {
			href: `https://${window.location.hostname}/blocks/material_download/download_materialien.php?courseid=${b}"&ccsectid=${c}`
		}, g, a, false);
	}

	function create_tp_buttons() {
		let b = create_element("section", "block block_material_download card mb-3 tplus_block", {}, "", document.getElementById("block-region-side-pre"), true),
			c = create_element("div", "card-body", {}, "", b),
			g = create_element("h5", "card-title d-inline", {
				dir: "ltr",
				style: "background-image: url(" + chrome.runtime.getURL("../icons/technion_plus_plus/icon-32.png") + ");"
			}, "Technion", c);
		create_element("sup", "", {}, "++", g);
		let a = create_element("div", "card-text mt-3", {style: "display: grid; text-align: center; grid-row-gap: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(128,128,128,.3);"}, "", c);
		c = create_element("div", "card-text mt-3 tplus_main_actions", {}, "", c);
		g = create_element("div", "custom-control custom-switch", {style: "text-align: right"}, "", c);
		const d = create_element("input", "custom-control-input", {id: "tp-darkmode", type: "checkbox"}, "", g);
		create_element("label", "custom-control-label",
			{"for": "tp-darkmode"}, "מצב לילה", g);
		c = create_element("div", "", {id: "tp_colorswitcher"}, "", c);
		create_element("div", "", {style: "text-align: right; width: 8rem"}, "צבע משני", c);
		const k = create_element("input", "", {type: "range", min: "0", max: "330", step: "30"}, "", c);
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
		for (c = 0; 12 > c; c++) {
			b += `hsl(${82 + 30 * c}, 100%, 25%) ${100 * c / 12}% ${100 * (c + 1) / 12}%`;
			if (11 > c) b += ", ";
		}
		k.setAttribute("style", "background-image: linear-gradient(to left, " + b + ") !important");
		return a;
	}

	if (".ac.il/" === window.location.href.split("technion")[1]) {
		if (!document.querySelector(".usermenu > .login")) {
			const elements = document.getElementsByClassName("coursevisible"),
				b = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/, c = / - (?:חורף|אביב|קיץ)/, g = {};
			for (let k = 0; k < elements.length; k++) {
				let d = elements[k].getElementsByTagName("h3")[0].textContent.replace(c, "").match(b);
				if (!d) continue;
				d = d.groups;
				g[d.cnum.trim()] = d.cname.trim();
			}
			0 < Object.keys(g).length && chrome.storage.local.set({u_courses: g}, () => {
				chrome.runtime.lastError && console.error("TE_moodle_001_" + mess + ": " + chrome.runtime.lastError.message);
			});

			const e = [[], [], []];
			if (0 < elements.length) for (let n = 0; n < elements.length; n++) {
				const l = document.createElement("div");
				l.style.cssFloat = "left";
				document.getElementsByClassName("tilecontainer")[n].appendChild(l);
				let a = elements[n].getElementsByTagName("h3")[0].textContent,
					b = elements[n].getElementsByClassName("coursestyle2url")[0].getAttribute("href");
				a.includes("חורף") ? e[0].push({
					cname: a.replace(" - חורף", ""),
					clink: b
				}) : a.includes("אביב") ? e[1].push({
					cname: a.replace(" - אביב", ""),
					clink: b
				}) : e[2].push({cname: a, clink: b});
				create_download(l, elements[n].getElementsByClassName("coursestyle2url")[0].getAttribute("href").split("?id=")[1], 0, "הורדת קבצי הקורס");
			}
			let h = create_tp_buttons();
			const parentNode = h.parentNode;
			parentNode.removeChild(h);
			document.getElementById("coursecontentcollapse1").insertBefore(parentNode.parentNode, document.getElementById("coursecontentcollapse1").childNodes[0]);
			parentNode.style.padding = "8px";
			parentNode.querySelector(".tplus_main_actions").appendChild(parentNode.querySelector("h5")).style.flex = "0 0 200px";
			parentNode.querySelector(".tplus_main_actions").classList.remove("mt-3");
		}
	} else {
		const moodle_num = window.location.href.split("?id=")[1],
			course = document.title.match(/(?<cname>.+)\s-\s(?<csemester>.+)\s-\s(?<cnum>[0-9]+)/),
			semesters = {
				"חורף": "200",
				"אביב": "100",
				"קיץ": "300",
			}, q = create_tp_buttons();
		const course_num = course?.groups.cnum.trim();
		create_download(q, moodle_num, 0, "הורדת כל הקבצים בקורס");
		if (course_num) {
			const semester = semesters[course.groups.csemester];
			create_element("a", "maor_download", {
				href: `https://portalex.technion.ac.il/ovv/?sap-theme=sap_belize&sap-language=HE&sap-ui-language=HE#/details/2024/${semester}/SM/${course_num}`,
				target: "_blank"
			}, "דף הקורס בסאפ", q);
			chrome.storage.local.get({
				videos_data: {},
				videos_courses: []
			}, a => {
				let c = 0, b = "";
				for (; c < a.videos_courses.length; c++) if (a.videos_courses[c].join(" ").includes(course_num)) {
					b = a.videos_courses[c][0];
					break
				}
				if ("" != b && a.videos_data[b]) for (a = a.videos_data[b], 0 < a.length && create_element("div", "", {style: "text-align: right; margin: 8px 0 0;"}, "הקלטות וידאו", q), b = 0; b < a.length; b++) {
					let g = (c = a[b].p) ? `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${a[b].l}"` : `https://video.technion.ac.il/Courses/${a[b].l}.html`,
						d = 1 < a.length ? "וידאו #" + (b + 1) : "וידאו";
					d = 0 < a[b].t ? ["הרצאה", "תרגול"][a[b].t - 1] : d;
					d += c ? "(פנופטו)" : "(שרת הוידאו הטכניוני)";
					create_element("a", "maor_download", {
						href: g,
						target: "_blank",
						title: a[b].vn ? a[b].vn : course_num
					}, d, q);
				}
			});
		}
		for (const element of document.getElementsByClassName("section main clearfix")) {
			if (element.classList.contains("accesshide") || element.classList.contains("hidden")) continue;
			create_download(
				element.getElementsByClassName("course-section-header")[0],
				moodle_num,
				element.getAttribute("id").split("section-")[1], "הורדת כל הקבצים בנושא"
			).style.marginRight = "auto";
		}
	}

	if (!window.location.href.includes("pluginfile.php")) {
		const css_properties = hue_change => [
			["--a_color", "hsl(" + (80 + hue_change) + ", 90%, 80%)"],
			["--a_hover_color", "hsl(" + (80 + hue_change) + ", 90%, 45%)"],
			["--a_navlink", "hsl(" + (90 + hue_change) + ", 80%, 85%)"],
			["--a_hover_navlink", "hsl(" + (90 + hue_change) + ", 100%, 80%)"],
			["--navbar_bottom", "hsl(" + (82 + hue_change) + ", 100%, 41%)"],
			["--navbar_bg", "hsl(" + (82 + hue_change) + ", 100%, 25%)"],
			["--dark_bg", "hsl(" + (90 + hue_change) + ", 100%, 10%)"],
			["--calendar_today", "hsla(" + (70 + hue_change) + ", 100%, 20%, 0.5)"]
		];
		chrome.storage.local.get({
			remoodle: false,
			remoodle_angle: 120
		}, a => {
			if (chrome.runtime.lastError) console.error("TE_remoodle_err: " + chrome.runtime.lastError.message);
			else {
				let checkboxStatus = a.remoodle;
				const checkBox = bool => {
					bool ? document.querySelector("html").setAttribute("tplus", "dm") :
						document.querySelector("html").removeAttribute("tplus");
					const checkbox = document.getElementById("tp-darkmode");
					if (checkbox) checkbox.checked = bool;
				};
				css_properties(a.remoodle_angle).forEach(c => document.documentElement.style.setProperty(c[0], c[1]));
				checkBox(checkboxStatus);
				chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
					if (message.mess_t === "TE_remoodle") {
						checkBox(!checkboxStatus);
						checkboxStatus = !checkboxStatus;
					}
					sendResponse();
				});
			}
		});
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message.mess_t === "TE_remoodle_reangle") {
				css_properties(message.angle).forEach(d => document.documentElement.style.setProperty(d[0], d[1]));
				const b = document.querySelector("#tp_colorswitcher input[type=range]");
				if (b) b.value = message.angle;
			}
			sendResponse();
		});
	}

})();
