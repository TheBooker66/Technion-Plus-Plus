(async function () {
	if (document.getElementById("Zehut") && !document.getElementById("Err_texT"))
		await chrome.runtime.sendMessage({
			mess_t: "loud_notification",
			message: "במקרה של שינוי הסיסמה, יש לעדכן את פרטי ההתחברות בתוסף Technion!\n",
		});
})();
