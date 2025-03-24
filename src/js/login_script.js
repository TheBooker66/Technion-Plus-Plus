'use strict';

(async function () {
	// Duplicate of util.js due to the login script being executed in a different context
	function reverseString(str) {
		return str.split('').reverse().join('');
	}

	function xorStrings(str1, str2) {
		return str1.split('').map((char, i) =>
			String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i))
		).join('');
	} // End of duplicate

	function appendInfo(form, name, value) {
		const input = form.appendChild(document.createElement("input"));
		input.name = name;
		input.value = value;
		input.type = "hidden";
	}

	function login_moodle_url(a) {
		chrome.runtime.sendMessage({mess_t: "login_moodle_url", url: window.location.hostname}, url => {
			url = url.split("?");
			const params = new URLSearchParams(url[1]);
			params.delete("prompt");
			params.delete("login_hint");
			params.append("login_hint", a.username + "@" + (a.server ? "campus." : "") + "technion.ac.il");
			location.href = url[0] + "?" + params.toString();
		});
	}

	function microsoft(a) {
		const d = () => {
			const loginForm = document.forms.f1, microsoftLoginButton = document.getElementById("idSIButton9");
			if (loginForm && !document.getElementById("passwordError") &&
				(location.pathname.includes("/oauth2/authorize") || location.pathname.includes("/saml2"))) {
				const SelectAccountPageEh = location.href.includes("select_account");
				const LoginHintPresentInUrlEh = location.href.includes("login_hint");
				if (loginForm.passwd || !document.getElementById("tilesHolder")
					|| SelectAccountPageEh || LoginHintPresentInUrlEh) {
					if (!SelectAccountPageEh && LoginHintPresentInUrlEh) {
						document.title = "Technion++ - חיבור אוטומטי";
						loginForm.passwd.value = a.password;
						loginForm.submit();
					} else {
						document.title = "Technion++ - חיבור אוטומטי";
						const urlParts = location.href.split("?");
						const urlParameters = new URLSearchParams(urlParts[1]);

						urlParameters.delete("prompt");
						urlParameters.delete("login_hint");
						urlParameters.append("login_hint", `${a.username}@${a.server ? "campus." : ""}technion.ac.il`);
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
		document.querySelector(".banner-logo") ? d() : (new MutationObserver(_ => d()))
			.observe(document.forms[0] ?? document.body, {childList: true, attributes: false, subtree: true});
	}

	function techwww(a) {
		const form = document.createElement("form");
		appendInfo(form, "username", a.d);
		appendInfo(form, "password", a.password);
		appendInfo(form, "Current_language", "HEBREW");
		form.setAttribute("action", "https://moodle.technion.ac.il/login/index.php");
		form.setAttribute("target", "_self");
		form.setAttribute("method", "post");
		document.body.appendChild(form);
		form.submit();
	}

	function moodle(a) {
		if (document.getElementsByClassName("navbar").length === 0 || !document.querySelector(".usermenu > .login")) return;
		a.enable_external ? window.location.href = "https://techwww.technion.ac.il/tech_ident/" : login_moodle_url(a);
	}

	function cs(a) {
		if (document.getElementsByTagName("form")[0].getElementsByClassName("red-text").length !== 0 ||
			document.referrer.includes("grades.cs.technion.ac.il")) return;
		const username = document.getElementById("ID"),
			password = document.getElementById("password");
		if (!username || !password) return;
		username.value = a.username;
		password.value = a.password;
		if (document.getElementsByTagName("form")[0].getElementsByClassName("white-button").length > 0)
			document.getElementsByTagName("form")[0].submit();
		else document.getElementsByTagName("form")[0].getElementsByClassName("submit-button")[0].click();
	}

	function sap(a) {
		if ((document.getElementById("certLogonForm") === null || document.referrer.includes("portalex"))
			&& !document.getElementById("divChangeContent")) {
			const form = document.createElement("form");
			appendInfo(form, "j_username", a.username);
			appendInfo(form, "j_password", a.password);
			appendInfo(form, "_eventId_proceed", "המשך");
			form.setAttribute("action", window.location.href);
			form.setAttribute("method", "post");
			document.body.appendChild(form);
			form.submit();
		}
	}

	function panopto() {
		if (document.getElementById("loginButton") != null && window.location.href.includes("Pages/Home.aspx") === true)
			window.location.href = (-1 === window.location.href.indexOf("?") ? "?" : "&") + "instance=TechnionAuthentication"
		if (document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton") != null
			&& (document.getElementById("providerDropdown").value = "TechnionAuthentication"))
			document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton").click();
	}

	function grades(a) {
		const username = document.getElementById("Usertxt"),
			password = document.getElementById("Passwordtxt");
		if (!username || !password) return;
		username.value = a.username;
		password.value = a.password;
		document.forms[0].submit();
	}

	if (chrome.extension.inIncognitoContext) return;
	if (window.location.protocol !== "https:") return;
	chrome.storage.local.get({
		username: "", server: true, phrase: "", term: "", maor_p: "maor", quick_login: true, enable_login: false,
		uidn_arr: ["", ""], mn_pass: "", enable_external: false
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
			storage.d = reverseString(xorStrings(storage.uidn_arr[0] + "", storage.uidn_arr[1]));
			if (/moodle[0-9]+.technion.ac.il/.test(website)) moodle(storage);
			else if (website === "techwww.technion.ac.il") techwww(storage);
		}
	});
})();
