'use strict';
import {CommonPopup} from "./common_popup.js";

(function () {
	const popup = new CommonPopup;
	popup.title = "אודות";
	popup.css_list = ["about"];
	popup.popupWrap();
	chrome.storage.local.get({gmail: true}, storageData => {
		const emailInfo = {ad: "ethan.amiran@gmail.com", su: "יצירת קשר - Technion"};
		let emailURL = storageData.gmail ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1" : "mailto:{1}?subject={2}";
		emailURL = emailURL.replace("{1}", emailInfo.ad).replace("{2}", emailInfo.su);
		document.querySelector("a.button").setAttribute("href", emailURL);
		storageData.gmail && document.querySelector("a.button").setAttribute("target", "_blank");
	})
})();
