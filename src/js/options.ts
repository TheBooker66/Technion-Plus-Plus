import {reverseString, xorStrings} from './utils.js';
import {TE_updateInfo} from '../service_worker.js';

(function () {
	function encryptDecrypt(inputStr: string) {
		const originalChars = inputStr.split(""), randomChars = [];
		const specialChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=,.";
		for (let i = 0; i < originalChars.length; i++) {
			while (true) {
				randomChars[i] = specialChars.charAt(Math.floor(78 * Math.random()));
				originalChars[i] = String.fromCharCode(inputStr.charCodeAt(i) ^ randomChars[i].charCodeAt(0));
				if (/^[ -~]*$/.test(originalChars[i])) {
					break;
				}
			}
		}
		return [originalChars.join(""), randomChars.join("")];
	}

	function main() {
		const username = (document.getElementById("username") as HTMLInputElement).value,
			password = (document.getElementById("password") as HTMLInputElement).value;
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
		const idn = (document.getElementById("idn") as HTMLInputElement).value,
			campus = (document.getElementById("campus") as HTMLOptionElement).selected,
			email = (document.getElementById("gmail_select") as HTMLInputElement).checked,
			login = (document.getElementById("quick_login") as HTMLInputElement).checked,
			timings = (document.getElementById("allow_timings") as HTMLInputElement).checked,
			panopto = (document.getElementById("panopto_save") as HTMLInputElement).checked,
			external = (document.getElementById("external_user") as HTMLInputElement).checked,
			hw_alerts = (document.getElementById("allow_hw_alerts") as HTMLInputElement).checked,
			notif_vol = (document.getElementById("notification_volume") as HTMLSelectElement).value,
			moodle = (document.getElementById("moodle_cal") as HTMLInputElement).checked,
			cs = (document.getElementById("cs_cal") as HTMLInputElement).checked,
			cs_pass = (document.getElementById("cs_pass") as HTMLInputElement).value,
			webwork = (document.getElementById("ww_cal_switch") as HTMLInputElement).checked,
			darkMode = (document.getElementById("dark_mode") as HTMLInputElement).checked,
			customName = (document.getElementById("custom_name") as HTMLInputElement).value,
			customLink = (document.getElementById("custom_link") as HTMLInputElement).value;
		const loginEh = "" !== username && "" !== password,
			externalEh = external && "" !== password && "" !== idn;
		chrome.storage.local.set({
			username: username, server: campus, phrase: encryptedSubstring, term: encryptedString,
			maor_p: encryptionResult, uidn_arr: encryptDecrypt(reverseString(idn)), gmail: email,
			enable_login: loginEh, quick_login: login, allow_timings: timings, panopto_save: panopto,
			external_u: external, enable_external: externalEh, hw_alerts: hw_alerts,
			moodle_cal: moodle, cs_cal: cs, cs_pass: cs_pass, ww_cal_switch: webwork, ww_cal_update: 0,
			notif_vol: notif_vol, dark_mode: darkMode, custom_name: customName, custom_link: customLink,
		}, () => {
			const status_bar = document.getElementById("status") as HTMLDivElement;
			if (chrome.runtime.lastError) {
				status_bar.textContent = "שגיאה בשמירת הנתונים, אנא נסה שנית!";
				console.error("TE_opt: " + chrome.runtime.lastError.message);
			} else {
				status_bar.textContent = "השינויים נשמרו.";
				setTimeout(() => status_bar.textContent = "", 2E3);
			}
		});

		const entirePage = document.querySelector("html") as HTMLHtmlElement;
		darkMode ? entirePage.setAttribute("tplus", "dm") : entirePage.removeAttribute("tplus");

		if (moodle && loginEh && login) TE_updateInfo();
		else chrome.action.getBadgeBackgroundColor({}, colors => {
			chrome.action.getBadgeText({}, badgeText => {
				if (164 === colors[0] && 127 === colors[1] && 0 === colors[2] && "!" === badgeText)
					chrome.action.setBadgeText({text: ""}, () => {
					});
			});
		});
	}

	(document.getElementById("save") as HTMLDivElement).addEventListener("click", main);
	(document.getElementById("try_vol") as HTMLAnchorElement).addEventListener("click", () => {
		const elem = document.createElement("audio");
		elem.setAttribute("preload", "auto");
		elem.setAttribute("autobuffer", "true");
		elem.volume = parseInt((document.getElementById("notification_volume") as HTMLInputElement).value);
		elem.src = chrome.runtime.getURL("resources/notification.mp3");
		void elem.play();
	});
	(document.getElementById("notification_volume") as HTMLInputElement).addEventListener("change", () => {
		(document.getElementById("try_vol") as HTMLAnchorElement).textContent =
			`נסה (${100 * parseInt((document.getElementById("notification_volume") as HTMLInputElement).value)}%)`;
	});
	(document.getElementById("cs_cal") as HTMLInputElement).addEventListener("change", () => {
		const element = document.getElementById("cs_cal_div") as HTMLDivElement;
		element.style.marginRight = "20px !important";
		element.style.display = (document.getElementById("cs_cal") as HTMLInputElement).checked ? "block" : "none";
	});
	document.addEventListener("DOMContentLoaded", () => {
		chrome.storage.local.get({
			username: "", server: true, phrase: "", term: "", maor_p: "maor", uidn_arr: ["", ""], gmail: true,
			quick_login: true, allow_timings: false, panopto_save: true, external_u: false, hw_alerts: true,
			moodle_cal: true, cs_cal: false, cs_pass: "", ww_cal_switch: false, ww_cal_update: 0, webwork_courses: {},
			notif_vol: 1, dark_mode: false, custom_name: "", custom_link: "",
		}, function (storage) {
			if (chrome.runtime.lastError) {
				console.error("TE_opt: " + chrome.runtime.lastError.message);
				document.querySelector(".wrapper")!.textContent = "שגיאה באחזור הנתונים, אנא נסה שנית.";
			} else {
				const decryptedPassword = reverseString(xorStrings(storage.term + storage.phrase, storage.maor_p)),
					decryptedID = reverseString(xorStrings(storage.uidn_arr[0] + "", storage.uidn_arr[1]));
				(document.getElementById("username") as HTMLInputElement).value = storage.username;
				(document.getElementById("campus") as HTMLOptionElement).selected = storage.server;
				(document.getElementById("technion") as HTMLOptionElement).selected = !storage.server;
				(document.getElementById("password") as HTMLInputElement).value = decryptedPassword;
				(document.getElementById("quick_login") as HTMLInputElement).checked = storage.quick_login;
				(document.getElementById("moodle_cal") as HTMLInputElement).checked = storage.moodle_cal;
				(document.getElementById("gmail_select") as HTMLInputElement).checked = storage.gmail;
				(document.getElementById("outlook_select") as HTMLInputElement).checked = !storage.gmail;
				(document.getElementById("allow_timings") as HTMLInputElement).checked = storage.allow_timings;
				(document.getElementById("panopto_save") as HTMLInputElement).checked = storage.panopto_save;
				(document.getElementById("notification_volume") as HTMLInputElement).value = storage.notif_vol;
				(document.getElementById("try_vol") as HTMLElement).textContent = `נסה (${100 * storage.notif_vol}%)`;
				(document.getElementById("idn") as HTMLInputElement).value = decryptedID;
				(document.getElementById("cs_pass") as HTMLInputElement).value = storage.cs_pass;
				(document.getElementById("cs_cal") as HTMLInputElement).checked = storage.cs_cal;
				(document.getElementById("cs_cal_div") as HTMLElement).style.marginRight = "20px !important";
				(document.getElementById("cs_cal_div") as HTMLElement).style.display = storage.cs_cal ? "block" : "none";
				(document.getElementById("ww_cal_switch") as HTMLInputElement).checked = storage.ww_cal_switch;
				(document.getElementById("external_user") as HTMLInputElement).checked = storage.external_u;
				(document.getElementById("allow_hw_alerts") as HTMLInputElement).checked = storage.hw_alerts;
				(document.getElementById("dark_mode") as HTMLInputElement).checked = storage.dark_mode;
				(document.getElementById("custom_name") as HTMLInputElement).value = storage.custom_name;
				(document.getElementById("custom_link") as HTMLInputElement).value = storage.custom_link;

				const entirePage = document.querySelector("html") as HTMLHtmlElement;
				storage.dark_mode ? entirePage.setAttribute("tplus", "dm") : entirePage.removeAttribute("tplus");

				if (storage.ww_cal_switch) {
					const webworkCoursesElement = document.getElementById("ww_current") as HTMLSpanElement,
						webworkCourseNames = [];
					webworkCoursesElement.style.display = "block";
					for (let course of Object.values(storage.webwork_courses))
						webworkCourseNames.push((course as { lti: string, name: string }).name);
					if (0 < webworkCourseNames.length)
						webworkCoursesElement.querySelector("span")!.textContent = webworkCourseNames.join(", ");
				}
			}
		});
		(document.getElementById("ext_version") as HTMLSpanElement).textContent += ` ${chrome.runtime.getManifest().version}`;
		if ("function" === typeof chrome.storage.local.getBytesInUse)
			chrome.storage.local.getBytesInUse(null, bytes => {
				bytes /= 1000;
				(document.getElementById("storage") as HTMLSpanElement).textContent += ` ${bytes.toFixed(3)}kB`;
			});
		else (document.getElementById("storage") as HTMLSpanElement).textContent += " אירעה שגיאה! נא לדווח עליה.";

		document.addEventListener("keypress", event => {
			if (event.key === "Enter") main();
		});
	});
})();
