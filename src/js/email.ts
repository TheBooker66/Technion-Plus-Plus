(async function () {
	const storageData = (await chrome.storage.local.get({
		email_preference: "gmail",
		username: "",
		email_server: true,
	})) as StorageData;
	const contactInfo = {ad: "ethan.amiran@gmail.com", su: "יצירת קשר - Technion"},
		button = document.getElementById("mail_to_me") as HTMLAnchorElement;
	let emailURL: string;
	switch (storageData.email_preference) {
		case "gmail":
			emailURL = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${contactInfo.ad}&su=${contactInfo.su}`;
			button.setAttribute("target", "_blank");
			break;
		case "outlook":
			emailURL = `https://outlook.office.com/mail/deeplink/compose?login_hint=${storageData.username}@${storageData.email_server ? "campus." : ""}technion.ac.il&to=${contactInfo.ad}&subject=${contactInfo.su}`;
			button.setAttribute("target", "_blank");
			break;
		default:
			emailURL = `mailto:${contactInfo.ad}?subject=${contactInfo.su}`;
			break;
	}
	button.setAttribute("href", emailURL);
})();
