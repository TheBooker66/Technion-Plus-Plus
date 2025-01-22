'use strict';
import {CommonPopup} from './js/common_popup.js';
import {reverseString, xorStrings} from './js/utils.js';

(function () {
	function make_tabs_clicky(tabs, popup, func = null) {
		for (let g = 0; g < tabs.length; g++) {
			tabs[g].addEventListener("click", () => {
				if (tabs[g].classList.contains("current")) return;
				for (let m = 0; m < tabs.length; m++) {
					tabs[m].className = m === g ? "tab current" : "tab";
					popup[m].style.display = m === g ? "block" : "none";
				}
				func && func(g);
			});
		}
	}

	const popup = new CommonPopup;
	popup.css_list = ["main"];
	popup.popupWrap();

	const OS = navigator.userAgentData ? navigator.userAgentData : "navigator.userAgentData is not supported!";
	OS.toString().includes("Android") || chrome.action.getBadgeBackgroundColor({}, c => {
		chrome.action.getBadgeText({}, h => {
			if (215 == c[0] && 0 == c[1] && 34 == c[2] && "!" == h) {
				chrome.action.setBadgeText({text: ""});
				document.getElementById("bus_error").style.display = "block";
			}
		});
	});
	const apps = document.getElementById("apps_menu"), links = document.getElementById("more_links"),
		l = document.getElementById("print"), n = document.getElementById("apps_links");
	apps.addEventListener("click", () => apps.className = "collapsed");
	document.getElementById("apps_link")
		.addEventListener("click", () => window.open("https://cis-shop.technion.ac.il/product-category/software/"));
	[{b: "gotoPrint", from: links, to: l}, {b: "gotoApps", from: links, to: n},
		{b: "returnFromPrint", from: l, to: links}, {b: "returnFromApps", from: n, to: links}].forEach(c => {
		document.getElementById(c.b).addEventListener("click", () => {
			c.to.style.display = "block";
			c.from.style.display = "none";
			apps.className = "collapse";
		});
	});
	const popup_window = {
		type: "popup",
		focused: true,
		state: "normal",
		url: "html/organizer.html",
		height: Math.min(window.screen.height - 40, 720),
		width: Math.min(window.screen.width - 20, 1200),
		top: 0,
		left: 0,
	};
	popup_window.top = parseInt((window.screen.height - popup_window.height) / 2);
	popup_window.top = parseInt((window.screen.height - popup_window.height) / 2);
	popup_window.left = parseInt((window.screen.width - popup_window.width) / 2);
	document.getElementById("organizer").addEventListener("click", () => chrome.windows.create(popup_window));
	document.getElementById("release_notes").addEventListener("click", () => chrome.tabs.create({url: "html/release_notes.html"}));
	const t = document.getElementById("tools_content").getElementsByTagName("a");
	for (let c = 0; c < t.length; c++) {
		if ([4, 5, 7].includes(c)) continue; // 4 - Organiser, 5 - grades sheet, 7 - printer
		t[c].addEventListener("click", () => window.location.href = "html/p_" + t[c].id + ".html");
	}
	const linksDiv = document.querySelectorAll("#more_links > div"),
		tabsDiv = document.getElementById("secondary_tabs").getElementsByTagName("div"),
		pages = [document.getElementById("single_page"), document.getElementById("double_page"), document.getElementById("quadruple_page")];
	make_tabs_clicky(linksDiv[0].querySelectorAll(".tab"), Array.from(linksDiv).slice(1), _ => apps.className = "collapse");
	make_tabs_clicky(tabsDiv, pages);
	document.getElementById("cant_login").getElementsByTagName("u")[0].addEventListener("click", () => {
		chrome.runtime.openOptionsPage(() => {
			chrome.runtime.lastError && console.error("TE_p: " + chrome.runtime.lastError.message);
		});
	});
	document.getElementById("quick_login").addEventListener("change", () => {
		chrome.storage.local.set({quick_login: document.getElementById("quick_login").checked}, () => {
			chrome.runtime.lastError && console.error("TE_popup_login: " + chrome.runtime.lastError.message);
		});
	});
	document.getElementById("mute_alerts_toggle").addEventListener("change", () => {
		chrome.storage.local.set({alerts_sound: document.getElementById("mute_alerts_toggle").checked}, () => {
			chrome.runtime.lastError && console.error("TE_popup_mute_alerts: " + chrome.runtime.lastError.message);
		});
	});
	chrome.storage.local.get({
		enable_login: false,
		quick_login: true,
		alerts_sound: true,
		gmail: true,
		moodle_cal: true,
		remoodle: false,
		remoodle_angle: 120,
		cal_seen: 0,
		cs_cal: false,
		uidn_arr: ["", ""],
		wwcal_switch: false,
		dl_current: 0,
		username: "",
		server: true,
		custom_name: "",
		custom_link: "",
	}, function (c) {
		document.getElementById("quick_login").checked = c.quick_login;
		document.getElementById("mute_alerts_toggle").checked = c.alerts_sound;
		document.getElementById("cant_login").style.display = c.enable_login ? "none" : "block";
		document.getElementById("cal_moodle").style.display = c.enable_login && c.moodle_cal && c.quick_login ? "block" : "none";
		document.getElementById("cal_cs").style.display = c.cs_cal ? "block" : "none";
		document.getElementById("cal_webwork").style.display = c.enable_login && c.quick_login && c.wwcal_switch ? "block" : "none";
		let k, h = ["cal_moodle", "cal_cs", "cal_mathnet", "cal_webwork"];
		for (k = 0; k < h.length; k++)
			c.cal_seen & Math.pow(2, k) && (document.getElementById(h[k]).className = "major hw");
		0 != c.dl_current && document.getElementById("downloads").classList.add("active");
		let id = reverseString(xorStrings(c.uidn_arr[0] + "", c.uidn_arr[1]));
		id = "" === id ? "הקלד מספר זהות כאן" : id;
		k = c.gmail && !chrome.runtime.lastError;
		const g = document.getElementById("print").getElementsByTagName("a");
		for (let p = 0; p < g.length; p++) {
			g[p].setAttribute("href", k ? "https://mail.google.com/mail/u/0/?view=cm&to=print." + g[p].id + "@campus.technion.ac.il&su=" + id + "&fs=1&tf=1" : "mailto:print." + g[p].id + "@campus.technion.ac.il?subject=" + id);
			if (id !== "הקלד מספר זהות כאן" && id !== "") continue;
			g[p].addEventListener("click", () => {
				chrome.runtime.sendMessage({
					mess_t: "silent_notification",
					message: 'מיד ייפתח חלון לשליחת מייל בהתאם לבחירתך. עלייך למלא מספר ת"ז בנושא ולצרף את הקבצים המבוקשים להדפסה.'
				}, {}, () => {
					chrome.runtime.lastError && console.error("TE_popup_printers: " + chrome.runtime.lastError.message);
				});
			});
		}
		const m = document.getElementById("UGS_Link"), custom_link = document.getElementById("custom_link");
		m.addEventListener("click", async () => {
			let p = setInterval(() => {
				m.textContent = 7 > m.textContent.length ? m.textContent + "." : "טוען";
			}, 500);
			let q = await fetch("https://students.technion.ac.il/auth/oidc/", {method: "HEAD"})
				.then(w => w.url)
				.catch(_ => "https://students.technion.ac.il/auth/oidc/");
			if (c.enable_login && c.quick_login && q.includes("?")) {
				q = q.split("?");
				const u = new URLSearchParams(q[1]);
				u.delete("prompt");
				u.append("login_hint", c.username + "@" + (c.server ? "campus." : "") + "technion.ac.il");
				q = q[0] + "?" + u.toString();
			}
			chrome.tabs.create({url: q}, () => {
				clearInterval(p);
				m.textContent = "Students";
			});
		});

		if (c.custom_name && c.custom_link) {
			custom_link.textContent = c.custom_name;
			custom_link.title = "קישור אישי שלכם! מעניין מה הוספתם...";
			custom_link.setAttribute("href", c.custom_link);
		} else {
			custom_link.textContent = "פנופטו";
			custom_link.title = "מאגר קורסים מצולמים";
			custom_link.setAttribute("href", "https://panoptotech.cloud.panopto.eu");
		}
	})
})();
