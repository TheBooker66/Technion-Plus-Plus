if (
	(document.getElementById("Zehut") && !document.getElementById("Err_texT")) ||
	(window.location.hostname === "passwordreset.microsoftonline.com" &&
		window.location.href.endsWith("technion.ac.il"))
) {
	// noinspection JSIgnoredPromiseFromCall
	chrome.runtime.sendMessage({
		mess_t: "loud_notification",
		message: "במקרה של שינוי הסיסמה, יש לעדכן את פרטי ההתחברות בתוסף Technion!\n",
	});
}
