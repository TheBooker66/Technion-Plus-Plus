'use strict';

(async function () {
	// Duplicate of util.js due to the fact that the login script is executed in a different context
	function reverseString(str) {
		return str.split('').reverse().join('');
	}

	function xorStrings(str1, str2) {
		return str1.split('').map((char, i) =>
			String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i))
		).join('');
	}

	// End of duplicate

	function m(a, MSorSAP, location) {
		location = location == "" ? window.location.href : location;
		let form = document.createElement("form");
		let username = document.createElement("input"),
			password = document.createElement("input"),
			proceed = document.createElement("input");

		form.setAttribute("method", "post");
		form.setAttribute("action", location);
		username.setAttribute("type", "hidden");
		username.setAttribute("name", "j_username");
		username.setAttribute("value", MSorSAP ? a.username + "@" + (a.server ? "campus." : "") + "technion.ac.il" : a.username);
		password.setAttribute("type", "hidden");
		password.setAttribute("name", "j_password");
		password.setAttribute("value", a.password);
		proceed.setAttribute("type", "hidden");
		proceed.setAttribute("name", "_eventId_proceed");
		proceed.setAttribute("value", "המשך");

		form.appendChild(username);
		form.appendChild(password);
		form.appendChild(proceed);
		document.body.appendChild(form);
		form.submit()
	}

	function login_moodle_url(a) {
		chrome.runtime.sendMessage({mess_t: "login_moodle_url", url: window.location.hostname}, d => {
			d = d.split("?");
			const b = new URLSearchParams(d[1]);
			b.delete("prompt");
			b.delete("login_hint");
			b.append("login_hint", a.username + "@" + (a.server ? "campus." : "") + "technion.ac.il");
			location.href = d[0] + "?" + b.toString()
		})
	}

	function microsoft(a) {
		const d = () => {
			let b = document.forms.f1, c = document.getElementById("idSIButton9");
			b && !document.getElementById("passwordError") && (location.pathname.includes("/oauth2/authorize") ||
				location.pathname.includes("/saml2")) ? b.passwd || !document.getElementById("tilesHolder") ||
				location.href.includes("select_account") || location.href.includes("login_hint") ?
					location.href.includes("login_hint") && !location.href.includes("select_account") &&
					(document.title = "Technion - חיבור אוטומטי", b.passwd.value = a.password, b.submit()) :
					(document.title = "Technion - חיבור אוטומטי", b = location.href.split("?"), c = new URLSearchParams(b[1]),
						c.delete("prompt"), c.delete("login_hint"), c.append("login_hint", a.username + "@" +
						(a.server ? "campus." : "") + "technion.ac.il"), location.href = b[0] + "?" + c.toString()) :
				document.forms[0] && c && "https://login.microsoftonline.com/f1502c4c-ee2e-411c-9715-c855f6753b84/login"
				== location.href && c.click()
		};
		document.querySelector(".banner-logo") ? d() : (new MutationObserver(_ => d()))
			.observe(document.forms[0] || document.body, {childList: true, attributes: false, subtree: true});
	}

	function techwww(a) {
		if (!a.enable_external) {
			login_moodle_url(a);
			return;
		}

		let d = document.createElement("form"),
			b = (c, e) => {
				let g = d.appendChild(document.createElement("input"));
				g.name = c;
				g.value = e;
				g.type = "hidden"
			};
		b("username", a.d);
		b("password", a.password);
		b("Current_language", "HEBREW");
		d.action = "https://moodle.technion.ac.il/login/index.php";
		d.target = "_self";
		d.method = "post";
		document.body.appendChild(d);
		d.submit()
	}

	function moodle(a) {
		if (document.getElementsByClassName("navbar").length == 0)
			return;
		if (document.querySelector(".usermenu > .login") == null)
			return;
		a.enable_external ? window.location.href = "https://techwww.technion.ac.il/tech_ident/" : techwww(a);
	}

	function cs(a) {
		if (document.getElementsByTagName("form")[0].getElementsByClassName("red-text").length != 0)
			return;
		if (document.referrer.includes("grades.cs.technion.ac.il"))
			return
		if (!document.getElementById("ID"))
			return;
		document.getElementById("ID").value = a.username;
		document.getElementById("password").value = a.password;
		0 < document.getElementsByTagName("form")[0].getElementsByClassName("white-button").length ?
			document.getElementsByTagName("form")[0].submit() :
			document.getElementsByTagName("form")[0].getElementsByClassName("submit-button")[0].click()
	}

	function students(a) {
		if (!a.enable_external)
			login_moodle_url(a);
	}

	function sap(a) {
		if ((document.getElementById("certLogonForm") == null || document.referrer.includes("portalex"))
			&& !document.getElementById("divChangeContent"))
			m(a, false, "");
	}

	function panopto() {
		if (document.getElementById("loginButton") != null && window.location.href.includes("Pages/Home.aspx") === true)
			window.location.href = (-1 == window.location.href.indexOf("?") ? "?" : "&") + "instance=TechnionAuthentication"
		if (document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton") != null
			&& (document.getElementById("providerDropdown").value = "TechnionAuthentication"))
			document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton").click();
	}

	function grades(a) {
		let username = document.getElementById("Usertxt"),
			password = document.getElementById("Passwordtxt");
		if (!username || !password)
			return;
		username.value = a.username;
		password.value = a.password;
		document.forms[0].submit();
	}

	chrome.extension.inIncognitoContext || "https:" != window.location.protocol || chrome.storage.local.get({
		username: "", server: true, phrase: "", term: "", maor_p: "maor", quick_login: true, enable_login: false,
		uidn_arr: ["", ""], mn_pass: "", enable_external: false
	}, function (a) {
		if (chrome.runtime.lastError)
			console.error("TE_login: " + chrome.runtime.lastError.message);
		else {
			const d = reverseString(xorStrings(a.uidn_arr[0] + "", a.uidn_arr[1]));
			a.enable_external && (a.d = d);
			if (a.enable_login && a.quick_login) {
				a.password = reverseString(xorStrings(a.term + a.phrase, a.maor_p));
				const website = window.location.hostname;
				if (/moodle[0-9]+.technion.ac.il/.test(website))
					moodle(a);
				else switch (website) {
					case "moodle.technion.ac.il":
						moodle(a);
						break;
					case "panoptotech.cloud.panopto.eu":
						panopto();
						break;
					case "portalex.technion.ac.il":
						sap(a);
						break;
					case "grades.cs.technion.ac.il":
						cs(a);
						break;
					case "webcourse.cs.technion.ac.il":
						cs(a);
						break;
					case "techwww.technion.ac.il":
						techwww(a);
						break;
					case "login.microsoftonline.com":
						microsoft(a);
						break;
					case "students.technion.ac.il":
						students(a);
						break;
					case "grades.technion.ac.il":
						grades(a);
				}
			} else !a.enable_login && a.quick_login && a.enable_external && (/moodle[0-9]+.technion.ac.il/.test(window.location.hostname)
				? moodle(info) : "techwww.technion.ac.il" == window.location.hostname && techwww(info));
		}
	})
})();
