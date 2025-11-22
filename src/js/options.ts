import {resetBadge, reverseString, xorStrings} from './utils.js';
import {TE_updateInfo} from './service_worker.js';

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

async function main() {
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
		moodle = (document.getElementById("moodle_cal_enabled") as HTMLInputElement).checked,
		cs = (document.getElementById("cs_cal_enabled") as HTMLInputElement).checked,
		cs_cal_pass = (document.getElementById("cs_cal_pass") as HTMLInputElement).value,
		webwork = (document.getElementById("webwork_cal_enabled") as HTMLInputElement).checked,
		darkMode = (document.getElementById("dark_mode") as HTMLInputElement).checked,
		customName = (document.getElementById("custom_name") as HTMLInputElement).value,
		customLink = (document.getElementById("custom_link") as HTMLInputElement).value,
		status_bar = document.getElementById("status") as HTMLDivElement;
	const loginEh = "" !== username && "" !== password,
		externalEh = external && "" !== password && "" !== idn;
	await chrome.storage.local.set({
		username: username, email_server: campus, phrase: encryptedSubstring, term: encryptedString,
		maor_p: encryptionResult, uidn_arr: encryptDecrypt(reverseString(idn)), gmail: email,
		enable_login: loginEh, quick_login: login, allow_timings: timings, panopto_save: panopto,
		external_user: external, external_enable: externalEh, hw_alerts: hw_alerts,
		moodle_cal_enabled: moodle, cs_cal_enabled: cs, cs_cal_pass: cs_cal_pass, webwork_cal_enabled: webwork,
		notif_vol: notif_vol, dark_mode: darkMode, custom_name: customName, custom_link: customLink,
	});
	if (chrome.runtime.lastError) {
		status_bar.textContent = "שגיאה בשמירת הנתונים, אנא נסה שנית!";
		console.error("TE_opt: " + chrome.runtime.lastError.message);
	} else {
		status_bar.textContent = "השינויים נשמרו.";
		setTimeout(() => status_bar.textContent = "", 2E3);
	}

	const entirePage = document.querySelector("html") as HTMLHtmlElement;
	darkMode ? entirePage.setAttribute("tplus", "dm") : entirePage.removeAttribute("tplus");

	if (moodle && loginEh && login) await TE_updateInfo();
	else await resetBadge();
}

document.getElementById("save")!.addEventListener("click", async () => await main());
document.addEventListener("keypress", async event => {
	if (event.key === "Enter") await main();
});

(document.getElementById("try_vol") as HTMLAnchorElement).addEventListener("click", async () => {
	const elem = document.createElement("audio");
	elem.setAttribute("preload", "auto");
	elem.setAttribute("autobuffer", "true");
	elem.volume = parseFloat((document.getElementById("notification_volume") as HTMLInputElement).value);
	elem.src = chrome.runtime.getURL("resources/notification.mp3");
	await elem.play();
});
(document.getElementById("notification_volume") as HTMLInputElement).addEventListener("change", () => {
	(document.getElementById("try_vol") as HTMLAnchorElement).textContent =
		`נסה (${100 * parseFloat((document.getElementById("notification_volume") as HTMLInputElement).value)}%)`;
});
(document.getElementById("cs_cal_enabled") as HTMLInputElement).addEventListener("change", () => {
	const element = document.getElementById("cs_cal_div") as HTMLDivElement;
	element.style.marginRight = "20px !important";
	element.style.display = (document.getElementById("cs_cal_enabled") as HTMLInputElement).checked ? "block" : "none";
});
document.addEventListener("DOMContentLoaded", async () => {
	const storageData = await chrome.storage.local.get({
		username: "", email_server: true, phrase: "", term: "", maor_p: "maor", uidn_arr: ["", ""], gmail: true,
		quick_login: true, allow_timings: false, panopto_save: true, external_user: false, hw_alerts: true,
		moodle_cal_enabled: true, cs_cal_enabled: false, cs_cal_pass: "",
		webwork_cal_enabled: false, webwork_cal_courses: {},
		notif_vol: 1, dark_mode: false, custom_name: "", custom_link: "",
	}) as StorageData;
	if (chrome.runtime.lastError) {
		console.error("TE_opt: " + chrome.runtime.lastError.message);
		document.querySelector(".wrapper")!.textContent = "שגיאה באחזור הנתונים, אנא נסה שנית.";
	} else {
		const decryptedPassword = reverseString(xorStrings(storageData.term + storageData.phrase, storageData.maor_p)),
			decryptedID = reverseString(xorStrings(storageData.uidn_arr[0] + "", storageData.uidn_arr[1]));
		(document.getElementById("username") as HTMLInputElement).value = storageData.username;
		(document.getElementById("campus") as HTMLOptionElement).selected = storageData.email_server;
		(document.getElementById("technion") as HTMLOptionElement).selected = !storageData.email_server;
		(document.getElementById("password") as HTMLInputElement).value = decryptedPassword;
		(document.getElementById("quick_login") as HTMLInputElement).checked = storageData.quick_login;
		(document.getElementById("moodle_cal_enabled") as HTMLInputElement).checked = storageData.moodle_cal_enabled;
		(document.getElementById("gmail_select") as HTMLInputElement).checked = storageData.gmail;
		(document.getElementById("outlook_select") as HTMLInputElement).checked = !storageData.gmail;
		(document.getElementById("allow_timings") as HTMLInputElement).checked = storageData.allow_timings;
		(document.getElementById("panopto_save") as HTMLInputElement).checked = storageData.panopto_save;
		(document.getElementById("notification_volume") as HTMLInputElement).value = storageData.notif_vol.toString();
		(document.getElementById("try_vol") as HTMLElement).textContent = `נסה (${100 * storageData.notif_vol}%)`;
		(document.getElementById("idn") as HTMLInputElement).value = decryptedID;
		(document.getElementById("cs_cal_pass") as HTMLInputElement).value = storageData.cs_cal_pass;
		(document.getElementById("cs_cal_enabled") as HTMLInputElement).checked = storageData.cs_cal_enabled;
		(document.getElementById("cs_cal_div") as HTMLElement).style.marginRight = "20px !important";
		(document.getElementById("cs_cal_div") as HTMLElement).style.display = storageData.cs_cal_enabled ? "block" : "none";
		(document.getElementById("webwork_cal_enabled") as HTMLInputElement).checked = storageData.webwork_cal_enabled;
		(document.getElementById("external_user") as HTMLInputElement).checked = storageData.external_user;
		(document.getElementById("allow_hw_alerts") as HTMLInputElement).checked = storageData.hw_alerts;
		(document.getElementById("dark_mode") as HTMLInputElement).checked = storageData.dark_mode;
		(document.getElementById("custom_name") as HTMLInputElement).value = storageData.custom_name;
		(document.getElementById("custom_link") as HTMLInputElement).value = storageData.custom_link;

		const entirePage = document.querySelector("html") as HTMLHtmlElement;
		storageData.dark_mode ? entirePage.setAttribute("tplus", "dm") : entirePage.removeAttribute("tplus");

		if (storageData.webwork_cal_enabled) {
			const webworkCoursesElement = document.getElementById("ww_current") as HTMLSpanElement,
				webworkCourseNames = [];
			webworkCoursesElement.style.display = "block";
			for (let course of Object.values(storageData.webwork_cal_courses))
				webworkCourseNames.push((course as { lti: string, name: string }).name);
			if (0 < webworkCourseNames.length)
				webworkCoursesElement.querySelector("span")!.textContent = webworkCourseNames.join(", ");
		}
	}

	const extensionSize = (await chrome.storage.local.getBytesInUse(null) / 1000).toFixed(3),
		extensionVersion = chrome.runtime.getManifest().version;
	(document.getElementById("ext_version") as HTMLSpanElement).textContent += ` ${extensionVersion}`;
	(document.getElementById("storageVol") as HTMLSpanElement).textContent += ` ${extensionSize}kB`;
});
