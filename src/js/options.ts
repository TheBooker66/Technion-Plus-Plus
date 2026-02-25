import {resetBadge, resolveTheme, reverseString, xorStrings} from './utils.js';
import {TE_updateInfo} from './service_worker.js';

function encryptDecrypt(inputStr: string): [string, string] {
	const originalChars = inputStr.split(""), randomChars = [], regex = /^[ -~]*$/,
		specialChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=,.";
	for (let i = 0; i < originalChars.length; i++) {
		while (true) {
			randomChars[i] = specialChars.charAt(Math.floor(78 * Math.random()));
			originalChars[i] = String.fromCharCode(inputStr.charCodeAt(i) ^ randomChars[i].charCodeAt(0));
			if (regex.test(originalChars[i])) {
				break;
			}
		}
	}
	return [originalChars.join(""), randomChars.join("")];
}

async function saveData() {
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
		login = (document.getElementById("quick_login") as HTMLInputElement).checked,
		timings = (document.getElementById("allow_timings") as HTMLInputElement).checked,
		panopto = (document.getElementById("panopto_save") as HTMLInputElement).checked,
		external = (document.getElementById("external_user") as HTMLInputElement).checked,
		hw_alerts = (document.getElementById("allow_hw_alerts") as HTMLInputElement).checked,
		notif_vol = parseFloat((document.getElementById("notification_volume") as HTMLSelectElement).value),
		moodle = (document.getElementById("moodle_cal_enabled") as HTMLInputElement).checked,
		cs = (document.getElementById("cs_cal_enabled") as HTMLInputElement).checked,
		cs_cal_pass = (document.getElementById("cs_cal_pass") as HTMLInputElement).value,
		webwork = (document.getElementById("webwork_cal_enabled") as HTMLInputElement).checked,
		customName = (document.getElementById("custom_name") as HTMLInputElement).value,
		customLink = (document.getElementById("custom_link") as HTMLInputElement).value,
		status_bar = document.getElementById("status") as HTMLDivElement;
	let email: string, theme: string;
	if ((document.getElementById("gmail") as HTMLInputElement).checked) email = "gmail";
	else if ((document.getElementById("outlook") as HTMLInputElement).checked) email = "outlook";
	else email = "program";
	if ((document.getElementById("light") as HTMLInputElement).checked) theme = "light";
	else if ((document.getElementById("dark") as HTMLInputElement).checked) theme = "dark";
	else theme = "auto";

	const loginEh = "" !== username && "" !== password,
		externalEh = external && "" !== password && "" !== idn;
	await chrome.storage.local.set({
		username: username, email_server: campus, phrase: encryptedSubstring, term: encryptedString,
		maor_p: encryptionResult, uidn_arr: encryptDecrypt(reverseString(idn)), email_preference: email,
		enable_login: loginEh, quick_login: login, allow_timings: timings, panopto_save: panopto,
		external_user: external, external_enable: externalEh, hw_alerts: hw_alerts,
		moodle_cal_enabled: moodle, cs_cal_enabled: cs, cs_cal_pass: cs_cal_pass, webwork_cal_enabled: webwork,
		notif_vol: notif_vol, theme: theme, custom_name: customName, custom_link: customLink,
	} as StorageData);
	if (chrome.runtime.lastError) {
		status_bar.textContent = "שגיאה בשמירת הנתונים, אנא נסה שנית!";
		console.error("TE_opt: " + chrome.runtime.lastError.message);
	} else {
		status_bar.textContent = "השינויים נשמרו.";
		setTimeout(() => status_bar.textContent = "", 2E3);
	}

	if (moodle && loginEh && login) await TE_updateInfo();
	else await resetBadge();
}

const commonDOM = {
	try_vol: document.getElementById("try_vol") as HTMLAnchorElement,
	notification_volume: document.getElementById("notification_volume") as HTMLInputElement,
	cs_cal_enabled: document.getElementById("cs_cal_enabled") as HTMLInputElement,
	cs_cal_div: document.getElementById("cs_cal_div") as HTMLDivElement,
	entirePage: document.querySelector("html") as HTMLHtmlElement,
	light: document.getElementById("light") as HTMLInputElement,
	dark: document.getElementById("dark") as HTMLInputElement,
	auto: document.getElementById("auto") as HTMLInputElement,
};

document.getElementById("save")!.addEventListener("click", async () => await saveData());
document.addEventListener("keypress", async event => event.key === "Enter" && await saveData());

commonDOM.try_vol.addEventListener("click", async () => {
	const elem = document.createElement("audio");
	elem.setAttribute("preload", "auto");
	elem.setAttribute("autobuffer", "true");
	elem.volume = parseFloat(commonDOM.notification_volume.value);
	elem.src = chrome.runtime.getURL("resources/notification.mp3");
	await elem.play();
});
commonDOM.notification_volume.addEventListener("change", event => {
	commonDOM.try_vol.textContent = `נסה (${100 * parseFloat((event.target as HTMLInputElement).value)}%)`;
});

commonDOM.cs_cal_enabled.addEventListener("change", event => {
	commonDOM.cs_cal_div.style.marginRight = "20px !important";
	commonDOM.cs_cal_div.style.display = (event.target as HTMLInputElement).checked ? "block" : "none";
});

commonDOM.light.addEventListener("change", event =>
	(event.target as HTMLInputElement).checked && commonDOM.entirePage.removeAttribute("tplus"));
commonDOM.dark.addEventListener("change", event =>
	(event.target as HTMLInputElement).checked && commonDOM.entirePage.setAttribute("tplus", "dm"));
commonDOM.auto.addEventListener("change", event => {
	if (!(event.target as HTMLInputElement).checked) return;
	window.matchMedia('(prefers-color-scheme: dark)').matches ?
		commonDOM.entirePage.setAttribute("tplus", "dm") :
		commonDOM.entirePage.removeAttribute("tplus");
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
	commonDOM.auto.checked && event.matches ?
		commonDOM.entirePage.setAttribute("tplus", "dm") :
		commonDOM.entirePage.removeAttribute("tplus");
});


const storageData = await chrome.storage.local.get({
	username: "", email_server: true, phrase: "", term: "", maor_p: "maor", uidn_arr: ["", ""],
	email_preference: "gmail", quick_login: true, allow_timings: false, panopto_save: true, external_user: false,
	hw_alerts: true, moodle_cal_enabled: true, cs_cal_enabled: false, cs_cal_pass: "",
	webwork_cal_enabled: false, webwork_cal_courses: {},
	notif_vol: 1, theme: "light", custom_name: "", custom_link: "",
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
	(document.getElementById("custom_name") as HTMLInputElement).value = storageData.custom_name;
	(document.getElementById("custom_link") as HTMLInputElement).value = storageData.custom_link;
	switch (storageData.email_preference) {
		case "gmail":
			(document.getElementById("gmail") as HTMLInputElement).checked = true;
			break;
		case "outlook":
			(document.getElementById("outlook") as HTMLInputElement).checked = true;
			break;
		default:
			(document.getElementById("program") as HTMLInputElement).checked = true;
	}
	switch (storageData.theme) {
		case "light":
			(document.getElementById("light") as HTMLInputElement).checked = true;
			break;
		case "dark":
			(document.getElementById("dark") as HTMLInputElement).checked = true;
			break;
		default:
			(document.getElementById("auto") as HTMLInputElement).checked = true;
	}
	resolveTheme(storageData.theme);

	if (storageData.webwork_cal_enabled) {
		const webworkCoursesElement = document.getElementById("ww_current") as HTMLSpanElement,
			webworkCourseNames = Object.values(storageData.webwork_cal_courses)
				.map(course => (course as WebWorkCourse).name);
		webworkCoursesElement.style.display = "block";
		if (0 < webworkCourseNames.length)
			webworkCoursesElement.querySelector("span")!.textContent = webworkCourseNames.join(", ");
	}
}

const extensionSize = (await chrome.storage.local.getBytesInUse(null) / 1000).toFixed(3),
	extensionVersion = chrome.runtime.getManifest().version;
(document.getElementById("ext_version") as HTMLSpanElement).textContent += ` ${extensionVersion}`;
(document.getElementById("storageVol") as HTMLSpanElement).textContent += ` ${extensionSize}kB`;

