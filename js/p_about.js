'use strict';

import {CommonPopup} from "./common_popup.js";

(function () {
	var a = new CommonPopup;
	a.title = "אודות";
	a.css_list = ["about"];
	a.popupWrap();
	chrome.storage.local.get({gmail: !0}, c => {
		var d = {ad: "ethan.amiran@gmail.com", su: "יצירת קשר - Technion Plus"},
			b = c.gmail ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1" : "mailto:{1}?subject={2}";
		b = b.replace("{1}", d.ad).replace("{2}", d.su);
		document.querySelector("a.button").setAttribute("href", b);
		c.gmail && document.querySelector("a.button").setAttribute("target", "_blank")
	})
})();
