(async function () {
	document.getElementById("goToSettings")?.addEventListener("click", () => chrome.runtime.openOptionsPage());
	const storageData = await chrome.storage.local.get({gmail: true});
	const emailInfo = {
		ad: "ethan.amiran@gmail.com",
		su: "יצירת קשר - Technion++",
	};
	let emailURL = storageData.gmail ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1" : "mailto:{1}?subject={2}";
	emailURL = emailURL.replace("{1}", emailInfo.ad).replace("{2}", emailInfo.su);
	document.getElementById("mailtome")?.setAttribute("href", emailURL);
	if (storageData.gmail) document.getElementById("mailtome")?.setAttribute("target", "_blank");
})();