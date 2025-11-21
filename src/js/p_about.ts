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
})();
