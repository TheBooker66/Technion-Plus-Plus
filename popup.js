'use strict';
import {CommonPopup} from './js/common_popup.js';
import {reverseString, xorStrings} from './js/utils.js';

(function () {
	function m(tabs, popup, k) {
		for (let g = 0; g < tabs.length; g++) {
			tabs[g].addEventListener("click", () => {
				if (tabs[g].classList.contains("current")) return;
				for (let m = 0; m < tabs.length; m++) {
					tabs[m].className = m === g ? "tab current" : "tab";
					popup[m].style.display = m === g ? "block" : "none";
				}
				k && k(g);
			});
		}
	}

	let e = new CommonPopup;
	e.css_list = ["main"];
	e.popupWrap();

	const OS = navigator.userAgentData ? navigator.userAgentData : "navigator.userAgentData is not supported!";
	OS.toString().includes("Android") || chrome.action.getBadgeBackgroundColor({}, c => {
		chrome.action.getBadgeText({}, h => {
			if (215 == c[0] && 0 == c[1] && 34 == c[2] && "!" == h) {
				chrome.action.setBadgeText({text: ""});
				document.getElementById("bus_error").style.display = "block";
			}
		});
	});
	const f = document.getElementById("microsoft_open");
	f.addEventListener("click", () => f.className = "collapsed");
	document.getElementById("microsoft_link")
		.addEventListener("click", () => window.open("https://techwww.technion.ac.il/cgi-bin/newuser/newuser.pl"));
	e = document.getElementById("more_links");
	let l = document.getElementById("print"),
		n = document.getElementById("apps_links");
	[{b: "gotoPrint", from: e, to: l}, {b: "gotoApps", from: e, to: n},
		{b: "returnFromPrint", from: l, to: e}, {b: "returnFromApps", from: n, to: e}].forEach(c => {
		document.getElementById(c.b).addEventListener("click", () => {
			c.to.style.display = "block";
			c.from.style.display = "none";
			f.className = "collapse";
		});
	});
	const r = {
		type: "popup",
		focused: true,
		state: "normal",
		url: "html/organizer.html",
		height: Math.min(window.screen.height -
			40, 720),
		width: Math.min(window.screen.width - 20, 1200),
		top: 0,
		left: 0
	};
	r.top = parseInt((window.screen.height - r.height) / 2);
	r.top = parseInt((window.screen.height - r.height) / 2);
	r.left = parseInt((window.screen.width - r.width) / 2);
	document.getElementById("organizer").addEventListener("click", () => chrome.windows.create(r));
	document.getElementById("release_notes").addEventListener("click", () => chrome.tabs.create({url: "html/release_notes.html"}));
	const t = document.getElementById("tools_content").getElementsByTagName("a");
	for (let c = 0; c < t.length; c++)
		[4, 5, 7].includes(c) || t[c].addEventListener("click", () => { // 4 - Organiser, 5 - grades sheet, 7 - printer
			window.location.href = "html/p_" + t[c].id + ".html"
		});
	e = document.querySelectorAll("#more_links > div");
	m(e[0].querySelectorAll(".tab"), Array.from(e).slice(1), _ => {
		f.className = "collapse";
	});
	e = document.getElementById("secondary_tabs").getElementsByTagName("div");
	l = [document.getElementById("single_page"), document.getElementById("double_page"),
		document.getElementById("quadruple_page")];
	m(e, l, null);
	document.getElementById("cantlogin").getElementsByTagName("u")[0].addEventListener("click", () => {
		chrome.runtime.openOptionsPage(() => {
			chrome.runtime.lastError && console.error("TE_p: " + chrome.runtime.lastError.message);
		});
	});
	document.getElementById("quick_login").addEventListener("change", () => {
		chrome.storage.local.set({quick_login: document.getElementById("quick_login").checked}, () => {
			chrome.runtime.lastError && console.error("TE_popup_login: " + chrome.runtime.lastError.message);
		});
	});
	document.getElementById("mutealerts_toggle").addEventListener("change", () => {
		chrome.storage.local.set({alerts_sound: document.getElementById("mutealerts_toggle").checked}, () => {
			chrome.runtime.lastError && console.error("TE_popup_mutealerts: " + chrome.runtime.lastError.message);
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
		server: true
	}, function (c) {
		document.getElementById("quick_login").checked = c.quick_login;
		document.getElementById("mutealerts_toggle").checked = c.alerts_sound;
		document.getElementById("cantlogin").style.display = c.enable_login ? "none" : "block";
		document.getElementById("cal_moodle").style.display = c.enable_login && c.moodle_cal && c.quick_login ? "block" : "none";
		document.getElementById("cal_cs").style.display = c.cs_cal ? "block" : "none";
		document.getElementById("cal_webwork").style.display = c.enable_login && c.quick_login && c.wwcal_switch ? "block" : "none";
		let k, h = ["cal_moodle", "cal_cs", "cal_mathnet", "cal_webwork"];
		for (k = 0; k < h.length; k++)
			c.cal_seen & Math.pow(2, k) && (document.getElementById(h[k]).className = "major hw");
		0 != c.dl_current && document.getElementById("downloads").classList.add("active");
		h = reverseString(xorStrings(c.uidn_arr[0] + "", c.uidn_arr[1]));
		h = "" == h ? "הקלד מספר זהות כאן" : h;
		k = c.gmail && !chrome.runtime.lastError;
		const g = document.getElementById("print").getElementsByTagName("a");
		for (let p = 0; p < g.length; p++)
			g[p].setAttribute("href", k ? "https://mail.google.com/mail/u/0/?view=cm&to=print." + g[p].id + "@campus.technion.ac.il&su=" + h + "&fs=1&tf=1" : "mailto:print." + g[p].id + "@campus.technion.ac.il?subject=" +
				h), "הקלד מספר זהות כאן" === h && g[p].addEventListener("click", () => {
				chrome.runtime.sendMessage({
					mess_t: "silent_notification",
					message: 'מיד ייפתח חלון לשליחת מייל בהתאם לבחירתך. עלייך למלא מספר ת"ז בנושא ולצרף את הקבצים המבוקשים להדפסה.'
				}, {}, () => {
					chrome.runtime.lastError && console.error("TE_popup_printers: " + chrome.runtime.lastError.message);
				});
			});
		const m = document.getElementById("UGS_Link");
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
	})
})();
