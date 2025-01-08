'use strict';
import {CommonPopup} from "./common_popup.js";

(function () {
	const popup = new CommonPopup;
	popup.title = "אודות";
	popup.css_list = ["about"];
	popup.popupWrap();
	chrome.storage.local.get({gmail: true}, c => {
		const d = {ad: "ethan.amiran@gmail.com", su: "יצירת קשר - Technion"};
		let b = c.gmail ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1" : "mailto:{1}?subject={2}";
		b = b.replace("{1}", d.ad).replace("{2}", d.su);
		document.querySelector("a.button").setAttribute("href", b);
		c.gmail && document.querySelector("a.button").setAttribute("target", "_blank")
	})
})();
