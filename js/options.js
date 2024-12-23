'use strict';
import {TE_updateInfo} from "../bg_main.js";

(function () {
	function f(a) {
		var c = [], d = 0;
		for (let b = a.length - 1; 0 <= b; b--) c[d++] = a[b];
		return c.join("")
	}

	function h(a, c) {
		var d = a.split("");
		for (let b = 0; b < d.length; b++) d[b] = String.fromCharCode(a.charCodeAt(b) ^ c.charCodeAt(b));
		return d
	}

	function l(a) {
		var c = a.split(""), d = [];
		for (let b = 0; b < c.length; b++) for (; d[b] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=,.".charAt(Math.floor(78 * Math.random())), c[b] = String.fromCharCode(a.charCodeAt(b) ^ d[b].charCodeAt(0)), !0 !== /^[\040-\176]*$/.test(c[b]);) ;
		return [c.join(""), d.join("")]
	}

	function m() {
		for (var a = document.getElementById("username").value, c = document.getElementById("password").value, d, b, k;
		     d = l(f(c)), b = d[0].toString(), d = d[1], k = b.substring(Math.floor(b.length / 2), b.length),
			     b = b.substring(0, Math.floor(b.length / 2)), f(h(b + k, d)).toString() !== c.toString();) ;
		var g = document.getElementById("idn").value, t = l(f(g)), u = document.getElementById("campus").selected,
			n = document.getElementById("quick_login").checked, p = document.getElementById("moodle_cal").checked,
			v = document.getElementById("gmail_select").checked, q = document.getElementById("external_user").checked,
			dark_mode = document.getElementById("dark_mode").checked,
			r = "" != a && "" != c ? !0 : !1;
		c = q && "" != c && "" != g ? !0 : !1;
		g = document.getElementById("allow_timings").checked;
		var w = document.getElementById("panopto_save").checked,
			x = document.getElementById("notification_volume").value, y = document.getElementById("WCPass").value,
			z = document.getElementById("cs_cal").checked, A = document.getElementById("wwcal_switch").checked,
			B = document.getElementById("allow_hw_alerts").checked;
		chrome.storage.local.set({
			username: a,
			server: u,
			phrase: k,
			term: b,
			maor_p: d,
			quick_login: n,
			moodle_cal: p,
			gmail: v,
			enable_login: r,
			allow_timings: g,
			panopto_save: w,
			notif_vol: x,
			uidn_arr: t,
			wcpass: y,
			cs_cal: z,
			mncal_update: 0,
			wwcal_switch: A,
			wwcal_update: 0,
			external_u: q,
			enable_external: c,
			hw_alerts: B,
			dark_mode: dark_mode,
		}, function () {
			var e = document.getElementById("status");
			e.textContent = "השינויים נשמרו.";
			chrome.runtime.lastError ? (console.log("TE_opt: " + chrome.runtime.lastError.message),
					e.textContent = "\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e9\u05de\u05d9\u05e8\u05ea \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd, \u05d0\u05e0\u05d0 \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea!") :
				setTimeout(function () {
					e.textContent = ""
				}, 2E3)
		});
		p && r && n ? TE_updateInfo() : chrome.action.getBadgeBackgroundColor({}, e => {
			chrome.action.getBadgeText({}, C => {
				164 == e[0] && 127 == e[1] && 0 == e[2] && "!" == C && chrome.action.setBadgeText({text: ""})
			})
		})
		if (dark_mode)
			document.body.classList.add("dark-mode");
		else
			document.body.classList.remove("dark-mode");
	}

	document.getElementById("bug_report").addEventListener("click", () => {
		var a = {
				ad: "ethan.amiran@gmail.com",
				su: "דיווח תקלה בתוסף Technion++",
				body: encodeURIComponent("מלאו כאן את פרטי התקלה - מומלץ בתוספת תמונות להמחשה.") +
					"%0D%0A" + encodeURIComponent("תזכורת: התוסף פותח בהתנדבות ולא מטעם הטכניון!")
			},
			c = document.getElementById("gmail_select").checked ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1&body={3}" : "mailto:{1}?subject={2}&body={3}";
		c = c.replace("{1}", a.ad).replace("{2}", a.su).replace("{3}", a.body);
		document.getElementById("gmail_select").checked ?
			window.open(c) : document.getElementById("hiddenframe").src = c
	});
	document.getElementById("save").addEventListener("click", m);
	document.getElementById("try_vol").addEventListener("click", () => {
		var a = document.createElement("audio");
		a.setAttribute("preload", "auto");
		a.setAttribute("autobuffer", "true");
		a.volume = document.getElementById("notification_volume").value;
		a.src = chrome.runtime.getURL("resources/notification.mp3");
		a.play()
	});
	document.getElementById("notification_volume").addEventListener("change", () => {
		document.getElementById("try_vol").textContent =
			"\u05e0\u05e1\u05d4 (" + 100 * document.getElementById("notification_volume").value + "%)"
	});
	document.getElementById("cs_cal").addEventListener("change", () => {
		document.getElementById("cscal_div").style = document.getElementById("cs_cal").checked ? "display: block; margin-right: 20px !important" : "display: none"
	});
	document.addEventListener("DOMContentLoaded", function () {
		chrome.storage.local.get({
			username: "",
			server: !0,
			phrase: "",
			term: "",
			maor_p: "maor",
			quick_login: !0,
			moodle_cal: !0,
			gmail: !0,
			allow_timings: !1,
			panopto_save: !0,
			notif_vol: 1,
			uidn_arr: ["", ""],
			wcpass: "",
			cs_cal: !1,
			mn_pass: "",
			wwcal_switch: !1,
			webwork_courses: {},
			external_u: !1,
			hw_alerts: !0,
			dark_mode: !1,
		}, function (a) {
			if (chrome.runtime.lastError) console.log("TE_opt: " + chrome.runtime.lastError.message), document.getElementById("myform").textContent = "\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d0\u05d7\u05d6\u05d5\u05e8 \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd, \u05d0\u05e0\u05d0 \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea."; else {
				var c = f(h(a.term + a.phrase,
					a.maor_p)), d = f(h(a.uidn_arr[0] + "", a.uidn_arr[1]));
				document.getElementById("username").value = a.username;
				document.getElementById("campus").selected = a.server;
				document.getElementById("technion").selected = !a.server;
				document.getElementById("password").value = c;
				document.getElementById("quick_login").checked = a.quick_login;
				document.getElementById("moodle_cal").checked = a.moodle_cal;
				document.getElementById("gmail_select").checked = a.gmail;
				document.getElementById("outlook_select").checked = !a.gmail;
				document.getElementById("allow_timings").checked =
					a.allow_timings;
				document.getElementById("panopto_save").checked = a.panopto_save;
				document.getElementById("notification_volume").value = a.notif_vol;
				document.getElementById("try_vol").textContent = "\u05e0\u05e1\u05d4 (" + 100 * a.notif_vol + "%)";
				document.getElementById("idn").value = d;
				document.getElementById("WCPass").value = a.wcpass;
				document.getElementById("cs_cal").checked = a.cs_cal;
				document.getElementById("cscal_div").style = a.cs_cal ? "display: block; margin-right: 20px !important" : "display: none";
				document.getElementById("wwcal_switch").checked =
					a.wwcal_switch;
				document.getElementById("external_user").checked = a.external_u;
				document.getElementById("allow_hw_alerts").checked = a.hw_alerts;
				document.getElementById("dark_mode").checked = a.dark_mode;
				if (a.dark_mode)
					document.body.classList.add("dark-mode");
				else
					document.body.classList.remove("dark-mode");
				if (a.wwcal_switch) {
					c = document.getElementById("ww_current");
					c.style.display = "block";
					d = [];
					for (var b of Object.values(a.webwork_courses)) d.push(b.name);
					0 < d.length && (c.getElementsByTagName("span")[0].textContent = d.join(", "))
				}
			}
		});
		"function" === typeof chrome.storage.local.getBytesInUse ? chrome.storage.local.getBytesInUse(null, function (a) {
			chrome.runtime.lastError && (document.getElementById("storage").textContent = "");
			a /= 1024;
			document.getElementById("storage").textContent += a.toFixed(3) + "Kb"
		}) : document.getElementById("storage").textContent = "";
		document.addEventListener("keypress", a => {
			"Enter" === a.key && m()
		})
	});
	document.querySelector("#ext_version > span").textContent = chrome.runtime.getManifest().version
})();
