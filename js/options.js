'use strict';
import {reverseString, xorStrings} from './utils.js';
import {TE_updateInfo} from '../service_worker.js';

(async function () {
	function l(a) {
		const c = a.split(""), d = [];
		for (let b = 0; b < c.length; b++) {
			while (true) {
				d[b] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=,.".charAt(Math.floor(78 * Math.random()));
				c[b] = String.fromCharCode(a.charCodeAt(b) ^ d[b].charCodeAt(0));
				if (/^[\040-\176]*$/.test(c[b])) {
					break;
				}
			}
		}
		return [c.join(""), d.join("")];
	}

	async function m() {
		const username = document.getElementById("username").value,
			password = document.getElementById("password").value;
		let d, b, k;
		while (true) {
			d = l(reverseString(password));
			b = d[0].toString();
			k = b.substring(Math.floor(b.length / 2), b.length);
			b = b.substring(0, Math.floor(b.length / 2));
			d = d[1];
			if (reverseString(xorStrings(b + k, d)).toString() === password.toString()) break;
		}
		const idn = document.getElementById("idn").value,
			campus = document.getElementById("campus").selected,
			login = document.getElementById("quick_login").checked,
			moodle = document.getElementById("moodle_cal").checked,
			email = document.getElementById("gmail_select").checked,
			external = document.getElementById("external_user").checked,
			dark_mode = document.getElementById("dark_mode").checked,
			timings = document.getElementById("allow_timings").checked,
			panopto = document.getElementById("panopto_save").checked,
			notif_vol = document.getElementById("notification_volume").value,
			WCPass = document.getElementById("WCPass").value,
			cs = document.getElementById("cs_cal").checked,
			webwork = document.getElementById("wwcal_switch").checked,
			hw_alerts = document.getElementById("allow_hw_alerts").checked;
		const loginEh = "" != username && "" != password, externalEh = external && "" != password && "" != idn;
		chrome.storage.local.set({
			username: username,
			server: campus,
			phrase: k,
			term: b,
			maor_p: d,
			quick_login: login,
			moodle_cal: moodle,
			gmail: email,
			enable_login: loginEh,
			allow_timings: timings,
			panopto_save: panopto,
			notif_vol: notif_vol,
			uidn_arr: l(reverseString(idn)),
			wcpass: WCPass,
			cs_cal: cs,
			mncal_update: 0,
			wwcal_switch: webwork,
			wwcal_update: 0,
			external_u: external,
			enable_external: externalEh,
			hw_alerts: hw_alerts,
			dark_mode: dark_mode,
		}, () => {
			const e = document.getElementById("status");
			e.textContent = "השינויים נשמרו.";
			if (chrome.runtime.lastError) {
				console.error("TE_opt: " + chrome.runtime.lastError.message);
				e.textContent = "שגיאה בשמירת הנתונים, אנא נסה שנית!";
			} else setTimeout(() => {
				e.textContent = "";
			}, 2E3);
		});
		if (moodle && loginEh && login) TE_updateInfo();
		else chrome.action.getBadgeBackgroundColor({}, colors => {
			chrome.action.getBadgeText({}, s => {
				if (164 == colors[0] && 127 == colors[1] && 0 == colors[2] && "!" === s)
					chrome.action.setBadgeText({text: ""});
			});
		});
		dark_mode ? document.body.classList.add("dark-mode") : document.body.classList.remove("dark-mode");
	}

	document.getElementById("save").addEventListener("click", await m);
	document.getElementById("try_vol").addEventListener("click", () => {
		const a = document.createElement("audio");
		a.setAttribute("preload", "auto");
		a.setAttribute("autobuffer", "true");
		a.volume = document.getElementById("notification_volume").value;
		a.src = chrome.runtime.getURL("resources/notification.mp3");
		a.play();
	});
	document.getElementById("notification_volume").addEventListener("change", () => {
		document.getElementById("try_vol").textContent =
			"נסה (" + 100 * document.getElementById("notification_volume").value + "%)";
	});
	document.getElementById("cs_cal").addEventListener("change", () => {
		document.getElementById("cscal_div").style =
			document.getElementById("cs_cal").checked ? "display: block; margin-right: 20px !important" : "display: none";
	});
	document.addEventListener("DOMContentLoaded", () => {
		chrome.storage.local.get({
			username: "",
			server: true,
			phrase: "",
			term: "",
			maor_p: "maor",
			quick_login: true,
			moodle_cal: true,
			gmail: true,
			allow_timings: false,
			panopto_save: true,
			notif_vol: 1,
			uidn_arr: ["", ""],
			wcpass: "",
			cs_cal: false,
			mn_pass: "",
			wwcal_switch: false,
			webwork_courses: {},
			external_u: false,
			hw_alerts: true,
			dark_mode: false,
		}, function (a) {
			if (chrome.runtime.lastError) {
				console.error("TE_opt: " + chrome.runtime.lastError.message);
				document.getElementById("myform").textContent = "שגיאה באחזור הנתונים, אנא נסה שנית.";
			} else {
				let c = reverseString(xorStrings(a.term + a.phrase, a.maor_p)),
					d = reverseString(xorStrings(a.uidn_arr[0] + "", a.uidn_arr[1]));
				document.getElementById("username").value = a.username;
				document.getElementById("campus").selected = a.server;
				document.getElementById("technion").selected = !a.server;
				document.getElementById("password").value = c;
				document.getElementById("quick_login").checked = a.quick_login;
				document.getElementById("moodle_cal").checked = a.moodle_cal;
				document.getElementById("gmail_select").checked = a.gmail;
				document.getElementById("outlook_select").checked = !a.gmail;
				document.getElementById("allow_timings").checked = a.allow_timings;
				document.getElementById("panopto_save").checked = a.panopto_save;
				document.getElementById("notification_volume").value = a.notif_vol;
				document.getElementById("try_vol").textContent = "נסה (" + 100 * a.notif_vol + "%)";
				document.getElementById("idn").value = d;
				document.getElementById("WCPass").value = a.wcpass;
				document.getElementById("cs_cal").checked = a.cs_cal;
				document.getElementById("cscal_div").style = a.cs_cal ? "display: block; margin-right: 20px !important" : "display: none";
				document.getElementById("wwcal_switch").checked = a.wwcal_switch;
				document.getElementById("external_user").checked = a.external_u;
				document.getElementById("allow_hw_alerts").checked = a.hw_alerts;
				document.getElementById("dark_mode").checked = a.dark_mode;
				a.dark_mode ? document.body.classList.add("dark-mode") : document.body.classList.remove("dark-mode");
				if (a.wwcal_switch) {
					c = document.getElementById("ww_current");
					c.style.display = "block";
					d = [];
					for (let b of Object.values(a.webwork_courses)) d.push(b.name);
					0 < d.length && (c.getElementsByTagName("span")[0].textContent = d.join(", "));
				}
			}
		});
		if ("function" === typeof chrome.storage.local.getBytesInUse)
			chrome.storage.local.getBytesInUse(null, bytes => {
				if (chrome.runtime.lastError) document.getElementById("storage").textContent = "";
				bytes /= 1024;
				document.getElementById("storage").textContent += bytes.toFixed(3) + "Kb";
			});
		else document.getElementById("storage").textContent = "";
		document.querySelector("#ext_version > span").textContent = chrome.runtime.getManifest().version;

		document.addEventListener("keypress", async a => {
			if (a.key === "Enter") await m();
		});
	});
})();
