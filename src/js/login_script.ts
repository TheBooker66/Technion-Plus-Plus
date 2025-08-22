(function () {
	// Duplicate of util.js due to the login script being executed in a different context

	function reverseString(str: string): string {
		return str.split('').reverse().join('');
	}

	function xorStrings(str1: string, str2: string): string {
		return str1.split('').map((_, i) =>
			String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i)),
		).join('');
	}

	// End of duplicate

	function appendInfo(form: HTMLFormElement, name: string, value: string) {
		const input = form.appendChild(document.createElement("input"));
		input.name = name;
		input.value = value;
		input.type = "hidden";
	}

	function login_moodle_url(storageData: { [key: string]: string | boolean }) {
		chrome.runtime.sendMessage({mess_t: "login_moodle_url", url: window.location.hostname}, url => {
			url = url.split("?");
			const params = new URLSearchParams(url[1]);
			params.delete("prompt");
			params.delete("login_hint");
			params.append("login_hint", storageData.username + "@" + (storageData.server ? "campus." : "") + "technion.ac.il");
			location.href = url[0] + "?" + params.toString();
		});
	}

	function microsoft(storageData: { [key: string]: string | boolean }) {
		const handleMicrosoftLogin = () => {
			const loginForm = document.forms.namedItem("f1"),
				microsoftLoginButton = document.getElementById("idSIButton9");
			if (loginForm && !document.getElementById("passwordError") &&
				(location.pathname.includes("/oauth2/authorize") || location.pathname.includes("/saml2"))) {
				const SelectAccountPageEh = location.href.includes("select_account");
				const LoginHintPresentInUrlEh = location.href.includes("login_hint");
				if (loginForm["passwd"] || !document.getElementById("tilesHolder")
					|| SelectAccountPageEh || LoginHintPresentInUrlEh) {
					if (!SelectAccountPageEh && LoginHintPresentInUrlEh) {
						document.title = "Technion++ - חיבור אוטומטי";
						loginForm["passwd"].value = storageData.password;
						loginForm.submit();
					} else {
						document.title = "Technion++ - חיבור אוטומטי";
						const urlParts = location.href.split("?");
						const urlParameters = new URLSearchParams(urlParts[1]);

						urlParameters.delete("prompt");
						urlParameters.delete("login_hint");
						urlParameters.append("login_hint", `${storageData.username}@${storageData.server ? "campus." : ""}technion.ac.il`);
						location.href = `${urlParts[0]}?${urlParameters.toString()}`;
					}
				}
			} else {
				if (document.forms[0] && microsoftLoginButton &&
					location.href === "https://login.microsoftonline.com/f1502c4c-ee2e-411c-9715-c855f6753b84/login") {
					microsoftLoginButton.click();
				}
			}
		};
		document.querySelector(".banner-logo") ? handleMicrosoftLogin() : (new MutationObserver(_ => handleMicrosoftLogin()))
			.observe(document.forms[0] ?? document.body, {childList: true, attributes: false, subtree: true});
	}

	function techwww(storageData: { [key: string]: string | boolean }) {
		const form = document.createElement("form");
		appendInfo(form, "username", storageData.username_ext.toString());
		appendInfo(form, "password", storageData.password.toString());
		appendInfo(form, "Current_language", "HEBREW");
		form.setAttribute("action", "https://moodle.technion.ac.il/login/index.php");
		form.setAttribute("target", "_self");
		form.setAttribute("method", "post");
		document.body.appendChild(form);
		form.submit();
	}

	function moodle(storageData: { [key: string]: string | boolean }) {
		if (document.querySelectorAll(".navbar").length === 0 || !document.querySelector(".usermenu > .login")) return;
		storageData.enable_external ? window.location.href = "https://techwww.technion.ac.il/tech_ident/" : login_moodle_url(storageData);
	}

	function cs(storageData: { [key: string]: string | boolean }) {
		if (document.querySelector("form")!.querySelectorAll(".red-text").length !== 0 ||
			document.referrer.includes("grades.cs.technion.ac.il")) return;
		const username = document.getElementById("ID") as HTMLInputElement | null,
			password = document.getElementById("password") as HTMLInputElement | null;
		if (!username || !password) return;
		username.value = storageData.username.toString();
		password.value = storageData.password.toString();
		if (document.querySelector("form")!.querySelectorAll(".white-button").length > 0)
			document.querySelector("form")!.submit();
		else (document.querySelector("form")!.querySelector(".submit-button") as HTMLButtonElement).click();
	}

	function sap(storageData: { [key: string]: string | boolean }) {
		if ((document.getElementById("certLogonForm") === null || document.referrer.includes("portalex"))
			&& !document.getElementById("divChangeContent")) {
			const form = document.createElement("form");
			appendInfo(form, "j_username", storageData.username.toString());
			appendInfo(form, "j_password", storageData.password.toString());
			appendInfo(form, "_eventId_proceed", "המשך");
			form.setAttribute("action", window.location.href);
			form.setAttribute("method", "post");
			document.body.appendChild(form);
			form.submit();
		}
	}

	function panopto() {
		if (document.getElementById("loginButton") != null && window.location.href.includes("Pages/Home.aspx"))
			window.location.href = (-1 === window.location.href.indexOf("?") ? "?" : "&") + "instance=TechnionAuthentication";
		if (document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton") != null
			&& ((document.getElementById("providerDropdown") as HTMLInputElement).value = "TechnionAuthentication"))
			(document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton") as HTMLElement).click();
	}

	function grades(storageData: { [key: string]: string | boolean }) {
		const username = document.getElementById("Usertxt") as HTMLInputElement | null,
			password = document.getElementById("Passwordtxt") as HTMLInputElement | null;
		if (!username || !password) return;
		username.value = storageData.username.toString();
		password.value = storageData.password.toString();
		document.forms[0].submit();
	}

	if (chrome.extension.inIncognitoContext) return;
	if (window.location.protocol !== "https:") return;
	chrome.storage.local.get({
		username: "", server: true, phrase: "", term: "", maor_p: "maor", uidn_arr: ["", ""],
		quick_login: true, enable_login: false, enable_external: false,
	}, function (storage) {
		if (chrome.runtime.lastError) {
			console.error("TE_login: " + chrome.runtime.lastError.message);
			return;
		}
		if (!storage.quick_login) return;

		const website = window.location.hostname;
		if (storage.enable_login && !storage.enable_external) {
			storage.password = reverseString(xorStrings(storage.term + storage.phrase, storage.maor_p));
			if (/moodle[0-9]*.technion.ac.il/.test(website))
				moodle(storage);
			else if (website === "panoptotech.cloud.panopto.eu") {
				panopto();
			} else if (website === "portalex.technion.ac.il") {
				sap(storage);
			} else if (website === "grades.cs.technion.ac.il" || website === "webcourse.cs.technion.ac.il") {
				cs(storage);
			} else if (website === "techwww.technion.ac.il" || website === "students.technion.ac.il") {
				login_moodle_url(storage);
			} else if (website === "login.microsoftonline.com") {
				microsoft(storage);
			} else if (website === "grades.technion.ac.il") {
				grades(storage);
			}
		} else if (storage.enable_external) {
			storage.username_ext = reverseString(xorStrings(storage.uidn_arr[0] + "", storage.uidn_arr[1]));
			if (/moodle[0-9]+.technion.ac.il/.test(website)) moodle(storage);
			else if (website === "techwww.technion.ac.il") techwww(storage);
		}
	});
})();
