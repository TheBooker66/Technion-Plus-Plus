import {CommonPopup} from "./common_popup.js";

(function () {
	// noinspection JSUnusedLocalSymbols
	const popup = new CommonPopup("אודות", ["about"], document.title);
	chrome.storage.local.get({gmail: true}, storageData => {
		const emailInfo = {ad: "ethan.amiran@gmail.com", su: "יצירת קשר - Technion"},
			button = document.querySelector("a.button") as HTMLAnchorElement;
		let emailURL = storageData.gmail ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1" : "mailto:{1}?subject={2}";
		emailURL = emailURL.replace("{1}", emailInfo.ad).replace("{2}", emailInfo.su);
		button.setAttribute("href", emailURL);
		if (storageData.gmail) button.setAttribute("target", "_blank");
	});
})();
