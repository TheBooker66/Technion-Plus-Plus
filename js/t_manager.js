'use strict';

(function () {
	document.getElementById("Zehut") && !document.getElementById("Err_texT") && chrome.runtime.sendMessage({
		mess_t: "loud_notification",
		message: "במקרה של שינוי הסיסמה, יש לעדכן את פרטי ההתחברות בתוסף Technion!\n"
	})
})();
