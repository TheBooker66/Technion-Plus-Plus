import {CommonPopup} from "./common_popup.js";

(async function () {
	new CommonPopup("אודות", ["about"], document.title);
	const storageData = await chrome.storage.local.get({gmail: true});
	const emailInfo = {ad: "ethan.amiran@gmail.com", su: "יצירת קשר - Technion"},
		button = document.getElementById("email") as HTMLAnchorElement;
	const emailURL = storageData.gmail ?
		`https://mail.google.com/mail/u/0/?view=cm&to=${emailInfo.ad}&su=${emailInfo.su}&fs=1&tf=1` :
		`mailto:${emailInfo.ad}?subject=${emailInfo.su}`;
	button.setAttribute("href", emailURL);
	if (storageData.gmail) button.setAttribute("target", "_blank");

	const chromeLinkElement = document.getElementById("chromeStoreLink") as HTMLAnchorElement,
		firefoxLinkElement = document.getElementById("firefoxStoreLink") as HTMLAnchorElement,
		chromeStoreURL = "https://chromewebstore.google.com/detail/technion-plus-plus/pfhjnidbfndnjhpcpfecngcigdjebemk",
		firefoxStoreURL = "https://addons.mozilla.org/en-GB/firefox/addon/technion-plus-plus/";
	chromeLinkElement.setAttribute("href", chromeStoreURL);
	chromeLinkElement.setAttribute("target", "_blank");
	firefoxLinkElement.setAttribute("href", firefoxStoreURL);
	firefoxLinkElement.setAttribute("target", "_blank");
})();
