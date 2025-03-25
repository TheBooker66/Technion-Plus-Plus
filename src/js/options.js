'use strict';
import {reverseString, xorStrings} from './utils.js';
import {TE_updateInfo} from '../service_worker.js';

(function () {
	function encryptDecrypt(inputStr) {
		const originalChars = inputStr.split(""), randomChars = [];
		for (let i = 0; i < originalChars.length; i++) {
			while (true) {
				randomChars[i] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=,."
					.charAt(Math.floor(78 * Math.random()));
				originalChars[i] = String.fromCharCode(inputStr.charCodeAt(i) ^ randomChars[i].charCodeAt(0));
				if (/^[\040-\176]*$/.test(originalChars[i])) {
					break;
				}
			}
		}
		return [originalChars.join(""), randomChars.join("")];
	}

	function main() {
		const username = document.getElementById("username").value,
			password = document.getElementById("password").value;
		let encryptionResult, encryptedString, encryptedSubstring;
		while (true) {
			encryptionResult = encryptDecrypt(reverseString(password));
			encryptedString = encryptionResult[0].toString();
			encryptedSubstring = encryptedString.substring(Math.floor(encryptedString.length / 2), encryptedString.length);
			encryptedString = encryptedString.substring(0, Math.floor(encryptedString.length / 2));
			encryptionResult = encryptionResult[1];
			if (reverseString(xorStrings(encryptedString + encryptedSubstring, encryptionResult)).toString()
				=== password.toString()) break;
		}
		const idn = document.getElementById("idn").value,
			campus = document.getElementById("campus").selected,
			email = document.getElementById("gmail_select").checked,
			login = document.getElementById("quick_login").checked,
			timings = document.getElementById("allow_timings").checked,
			panopto = document.getElementById("panopto_save").checked,
			external = document.getElementById("external_user").checked,
			hw_alerts = document.getElementById("allow_hw_alerts").checked,
			notif_vol = document.getElementById("notification_volume").value,
			moodle = document.getElementById("moodle_cal").checked,
			cs = document.getElementById("cs_cal").checked,
			WCPass = document.getElementById("WCPass").value,
			webwork = document.getElementById("wwcal_switch").checked,
			dark_mode = document.getElementById("dark_mode").checked,
			custom_name = document.getElementById("custom_name").value,
			custom_link = document.getElementById("custom_link").value;
		const loginEh = "" !== username && "" !== password,
			externalEh = external && "" !== password && "" !== idn;
		chrome.storage.local.set({
			username: username, server: campus, phrase: encryptedSubstring, term: encryptedString,
			maor_p: encryptionResult, uidn_arr: encryptDecrypt(reverseString(idn)),
			gmail: email, enable_login: loginEh, quick_login: login, allow_timings: timings, panopto_save: panopto,
			external_u: external, enable_external: externalEh, hw_alerts: hw_alerts, notif_vol: notif_vol,
			moodle_cal: moodle, cs_cal: cs, wcpass: WCPass, mncal_update: 0, wwcal_switch: webwork, wwcal_update: 0,
			dark_mode: dark_mode, custom_name: custom_name, custom_link: custom_link,
		}, () => {
			const status_bar = document.getElementById("status");
			if (chrome.runtime.lastError) {
				status_bar.textContent = "שגיאה בשמירת הנתונים, אנא נסה שנית!";
				console.error("TE_opt: " + chrome.runtime.lastError.message);
			} else {
				status_bar.textContent = "השינויים נשמרו.";
				setTimeout(() => status_bar.textContent = "", 2E3);
			}
		});
		dark_mode ? document.body.classList.add("dark-mode") : document.body.classList.remove("dark-mode");
		if (moodle && loginEh && login) TE_updateInfo();
		else chrome.action.getBadgeBackgroundColor({}, colors => {
			chrome.action.getBadgeText({}, badgeText => {
				if (164 === colors[0] && 127 === colors[1] && 0 === colors[2] && "!" === badgeText)
					chrome.action.setBadgeText({text: ""});
			});
		});
	}

	document.getElementById("save").addEventListener("click", main);
	document.getElementById("try_vol").addEventListener("click", () => {
		const elem = document.createElement("audio");
		elem.setAttribute("preload", "auto");
		elem.setAttribute("autobuffer", "true");
		elem.volume = document.getElementById("notification_volume").value;
		elem.src = chrome.runtime.getURL("resources/notification.mp3");
		elem.play();
	});
	document.getElementById("notification_volume").addEventListener("change", () => {
		document.getElementById("try_vol").textContent =
			"נסה (" + 100 * document.getElementById("notification_volume").value + "%)";
	});
	document.getElementById("cs_cal").addEventListener("change", () => {
		document.getElementById("cscal_div").style.cssText =
			document.getElementById("cs_cal").checked ? "display: block; margin-right: 20px !important" : "display: none";
	});
	document.addEventListener("DOMContentLoaded", () => {
		chrome.storage.local.get({
			username: "", server: true, phrase: "", term: "", maor_p: "maor", uidn_arr: ["", ""],
			gmail: true, quick_login: true, allow_timings: false, panopto_save: true,
			external_u: false, hw_alerts: true, notif_vol: 1,
			moodle_cal: true, cs_cal: false, wcpass: "", mncal_update: 0, mn_pass: "",
			wwcal_switch: false, wwcal_update: 0, webwork_courses: {},
			dark_mode: false, custom_name: "", custom_link: "",
		}, function (storage) {
			if (chrome.runtime.lastError) {
				console.error("TE_opt: " + chrome.runtime.lastError.message);
				document.getElementById("myform").textContent = "שגיאה באחזור הנתונים, אנא נסה שנית.";
			} else {
				const decryptedPassword = reverseString(xorStrings(storage.term + storage.phrase, storage.maor_p)),
					decryptedID = reverseString(xorStrings(storage.uidn_arr[0] + "", storage.uidn_arr[1]));
				document.getElementById("username").value = storage.username;
				document.getElementById("campus").selected = storage.server;
				document.getElementById("technion").selected = !storage.server;
				document.getElementById("password").value = decryptedPassword;
				document.getElementById("quick_login").checked = storage.quick_login;
				document.getElementById("moodle_cal").checked = storage.moodle_cal;
				document.getElementById("gmail_select").checked = storage.gmail;
				document.getElementById("outlook_select").checked = !storage.gmail;
				document.getElementById("allow_timings").checked = storage.allow_timings;
				document.getElementById("panopto_save").checked = storage.panopto_save;
				document.getElementById("notification_volume").value = storage.notif_vol;
				document.getElementById("try_vol").textContent = "נסה (" + 100 * storage.notif_vol + "%)";
				document.getElementById("idn").value = decryptedID;
				document.getElementById("WCPass").value = storage.wcpass;
				document.getElementById("cs_cal").checked = storage.cs_cal;
				document.getElementById("cscal_div").style.cssText = storage.cs_cal ? "display: block; margin-right: 20px !important" : "display: none";
				document.getElementById("wwcal_switch").checked = storage.wwcal_switch;
				document.getElementById("external_user").checked = storage.external_u;
				document.getElementById("allow_hw_alerts").checked = storage.hw_alerts;
				document.getElementById("dark_mode").checked = storage.dark_mode;
				document.getElementById("custom_name").value = storage.custom_name;
				document.getElementById("custom_link").value = storage.custom_link;
				storage.dark_mode ? document.body.classList.add("dark-mode") : document.body.classList.remove("dark-mode");
				if (storage.wwcal_switch) {
					const webworkCoursesElement = document.getElementById("ww_current"),
						webworkCourseNames = [];
					webworkCoursesElement.style.display = "block";
					for (let course of Object.values(storage.webwork_courses)) webworkCourseNames.push(course.name);
					if (0 < webworkCourseNames.length)
						webworkCoursesElement.getElementsByTagName("span")[0].textContent = webworkCourseNames.join(", ");
				}
			}
		});
		document.getElementById("ext_version").textContent += ` ${chrome.runtime.getManifest().version}`;
		if ("function" === typeof chrome.storage.local.getBytesInUse)
			chrome.storage.local.getBytesInUse(null, bytes => {
				bytes /= 1024;
				document.getElementById("storage").textContent += ` ${bytes.toFixed(3)}Kb`;
			});
		else document.getElementById("storage").textContent += " אירעה שגיאה! נא לדווח עליה.";

		document.addEventListener("keypress", event => {
			if (event.key === "Enter") main();
		});
	});
})();
