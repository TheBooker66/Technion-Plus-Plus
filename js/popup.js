'use strict';
import {CommonPopup} from './common_popup.js';


(function () {
	function a(c) {
		var h = [], k = 0;
		for (let g = c.length - 1; 0 <= g; g--) h[k++] = c[g];
		return h.join("")
	}

	function b(c, h) {
		var k = c.split("");
		for (let g = 0; g < k.length; g++) k[g] = String.fromCharCode(c.charCodeAt(g) ^ h.charCodeAt(g));
		return k
	}

	function m(tabs, popup, k) {
		for (let g = 0; g < tabs.length; g++) {
			tabs[g].addEventListener("click", () => {
				if (!tabs[g].classList.contains("current")) {
					for (let m = 0; m < tabs.length; m++) {
						tabs[m].className = m === g ? "tab current" : "tab";
						popup[m].style.display = m === g ? "block" : "none";
					}
					k && k(g)
				}
			})
		}
	}

	var e = new CommonPopup;
	e.css_list = ["main"];
	e.popupWrap();

	function checkOS() {
		if (navigator.userAgentData) {
			const hints = ["architecture", "model", "platform", "platformVersion", "uaFullVersion"];
			navigator.userAgentData.getHighEntropyValues(hints)
				.then(ua => {
					console.log(ua);
				});
			return navigator.userAgentData;
		} else {
			console.log(n.userAgent);
			return "navigator.userAgentData is not supported!";
		}
	}

	checkOS().toString().includes("Android") || chrome.action.getBadgeBackgroundColor({}, c => {
		chrome.action.getBadgeText({}, h => {
			215 == c[0] && 0 == c[1] && 34 == c[2] && "!" == h && (chrome.action.setBadgeText({text: ""}), document.getElementById("bus_error").style.display = "block")
		})
	});
	var f = document.getElementById("microsoft_open");
	f.addEventListener("click", () => f.className = "collapsed");
	document.getElementById("microsoft_link").addEventListener("click", function () {
		window.open("https://techwww.technion.ac.il/cgi-bin/newuser/newuser.pl")
	});
	e = document.getElementById("more_links");
	var l = document.getElementById("print"), n = document.getElementById("apps_links");
	[{b: "gotoPrint", from: e, to: l}, {b: "gotoApps", from: e, to: n},
		{b: "returnFromPrint", from: l, to: e}, {b: "returnFromApps", from: n, to: e}].forEach(c => {
		document.getElementById(c.b).addEventListener("click", () => {
			c.to.style.display = "block";
			c.from.style.display = "none";
			f.className = "collapse"
		})
	});
	var r = {
		type: "popup", focused: !0, state: "normal", url: "html/organizer.html", height: Math.min(window.screen.height -
			40, 720), width: Math.min(window.screen.width - 20, 1200), top: 0, left: 0
	};
	r.top = parseInt((window.screen.height - r.height) / 2);
	r.top = parseInt((window.screen.height - r.height) / 2);
	r.left = parseInt((window.screen.width - r.width) / 2);
	document.getElementById("organizer").addEventListener("click", () => chrome.windows.create(r));
	document.getElementById("release_notes").addEventListener("click", () => chrome.tabs.create({url: "html/release_notes.html"}));
	var t = document.getElementById("tools_content").getElementsByTagName("a");
	for (let c = 0; c < t.length; c++)
		[4, 5, 7].includes(c) || t[c].addEventListener("click", () => { // 4 - Organiser, 5 - grades sheet, 7 - printer
			window.location.href = "html/p_" + t[c].id + ".html"
		});
	e = document.querySelectorAll("#more_links > div");
	m(e[0].querySelectorAll(".tab"), Array.from(e).slice(1), _ => {
		f.className = "collapse"
	});
	e = document.getElementById("secondary_tabs").getElementsByTagName("div");
	l = [document.getElementById("single_page"), document.getElementById("double_page"),
		document.getElementById("quadruple_page")];
	m(e, l, null);
	document.getElementById("cantlogin").getElementsByTagName("u")[0].addEventListener("click", function () {
		chrome.runtime.openOptionsPage(function () {
			chrome.runtime.lastError && console.log("TE_p: " + chrome.runtime.lastError.message)
		})
	});
	document.getElementById("quick_login").addEventListener("change", function () {
		chrome.storage.local.set({quick_login: document.getElementById("quick_login").checked}, () => {
			chrome.runtime.lastError && console.log("TE_popup_login: " + chrome.runtime.lastError.message)
		})
	});
	document.getElementById("mutealerts_toggle").addEventListener("change", function () {
		chrome.storage.local.set({alerts_sound: document.getElementById("mutealerts_toggle").checked}, () => {
			chrome.runtime.lastError && console.log("TE_popup_mutealerts: " +
				chrome.runtime.lastError.message)
		})
	});
	chrome.storage.local.get({
		enable_login: !1,
		quick_login: !0,
		alerts_sound: !0,
		gmail: !0,
		moodle_cal: !0,
		remoodle: !1,
		remoodle_angle: 120,
		cal_seen: 0,
		cs_cal: !1,
		uidn_arr: ["", ""],
		wwcal_switch: !1,
		dl_current: 0,
		username: "",
		server: !0
	}, function (c) {
		document.getElementById("quick_login").checked = c.quick_login;
		document.getElementById("mutealerts_toggle").checked = c.alerts_sound;
		document.getElementById("cantlogin").style.display = c.enable_login ? "none" : "block";
		document.getElementById("cal_moodle").style.display =
			c.enable_login && c.moodle_cal && c.quick_login ? "block" : "none";
		document.getElementById("cal_cs").style.display = c.cs_cal ? "block" : "none";
		document.getElementById("cal_webwork").style.display = c.enable_login && c.quick_login && c.wwcal_switch ? "block" : "none";
		var h = ["cal_moodle", "cal_cs", "cal_mathnet", "cal_webwork"];
		for (var k = 0; k < h.length; k++)
			c.cal_seen & Math.pow(2, k) && (document.getElementById(h[k]).className = "major hw");
		0 != c.dl_current && document.getElementById("downloads").classList.add("active");
		h = a(b(c.uidn_arr[0] + "", c.uidn_arr[1]));
		h = "" == h ? "הקלד מספר זהות כאן" : h;
		k = c.gmail && !chrome.runtime.lastError;
		var g = document.getElementById("print").getElementsByTagName("a");
		for (let p = 0; p < g.length; p++)
			g[p].setAttribute("href", k ? "https://mail.google.com/mail/u/0/?view=cm&to=print." + g[p].id + "@campus.technion.ac.il&su=" + h + "&fs=1&tf=1" : "mailto:print." + g[p].id + "@campus.technion.ac.il?subject=" +
				h), "הקלד מספר זהות כאן" === h && g[p].addEventListener("click", () => {
				chrome.runtime.sendMessage({
						mess_t: "silent_notification",
						message: 'מיד ייפתח חלון לשליחת מייל בהתאם לבחירתך. עלייך למלא מספר ת"ז בנושא ולצרף את הקבצים המבוקשים להדפסה.'
					},
					{}, () => {
						chrome.runtime.lastError && console.log("TE_popup_printers: " + chrome.runtime.lastError.message)
					})
			});
		var m = document.getElementById("UGS_Link"), v = () => {
			m.textContent = 7 > m.textContent.length ? m.textContent + "." : "\u05d8\u05d5\u05e2\u05df"
		};
		m.addEventListener("click", async function () {
			let p = setInterval(v, 500);
			var q = await fetch("https://students.technion.ac.il/auth/oidc/", {method: "HEAD"})
				.then(w => w.url)
				.catch(() => "https://students.technion.ac.il/auth/oidc/");
			if (c.enable_login && c.quick_login && q.includes("?")) {
				q = q.split("?");
				var u = new URLSearchParams(q[1]);
				u.delete("prompt");
				u.append("login_hint", c.username + "@" + (c.server ? "campus." : "") + "technion.ac.il");
				q = q[0] + "?" + u.toString()
			}
			chrome.tabs.create({url: q}, () => {
				clearInterval(p);
				m.textContent = "Students"
			})
		})
	})
})();
