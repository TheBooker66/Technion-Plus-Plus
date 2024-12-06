'use strict';
(function () {
	function k(a) {
		var d = [], b = 0;
		for (let c = a.length - 1; 0 <= c; c--) d[b++] = a[c];
		return d.join("")
	}

	function l(a, d) {
		var b = a.split("");
		for (let c = 0; c < b.length; c++) b[c] = String.fromCharCode(a.charCodeAt(c) ^ d.charCodeAt(c));
		return b
	}

	function m(a, d, b) {
		b = "" != b ? b : window.location.href;
		var c = document.createElement("form");
		c.setAttribute("method", "post");
		c.setAttribute("action", b);
		b = document.createElement("input");
		b.setAttribute("type", "hidden");
		b.setAttribute("name", "j_username");
		var e = a.server ?
			"campus." : "";
		b.setAttribute("value", !0 === d ? a.username + "@" + e + "technion.ac.il" : a.username);
		d = document.createElement("input");
		d.setAttribute("type", "hidden");
		d.setAttribute("name", "j_password");
		d.setAttribute("value", a.password);
		a = document.createElement("input");
		a.setAttribute("type", "hidden");
		a.setAttribute("name", "_eventId_proceed");
		a.setAttribute("value", "\u05d4\u05de\u05e9\u05da");
		c.appendChild(b);
		c.appendChild(d);
		c.appendChild(a);
		document.body.appendChild(c);
		c.submit()
	}

	function p(a) {
		var d = () => {
			var b =
				document.forms.f1, c = document.getElementById("idSIButton9");
			b && !document.getElementById("passwordError") && (location.pathname.includes("/oauth2/authorize") || location.pathname.includes("/saml2?")) ? b.passwd || !document.getElementById("tilesHolder") || location.href.includes("select_account") || location.href.includes("login_hint") ? location.href.includes("login_hint") && !location.href.includes("select_account") && (document.title = "Technion Plus - \u05d7\u05d9\u05d1\u05d5\u05e8 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9",
				b.passwd.value = a.password, b.submit()) : (document.title = "Technion Plus - \u05d7\u05d9\u05d1\u05d5\u05e8 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9", b = location.href.split("?"), c = new URLSearchParams(b[1]), c.delete("prompt"), c.delete("login_hint"), c.append("login_hint", a.username + "@" + (a.server ? "campus." : "") + "technion.ac.il"), location.href = b[0] + "?" + c.toString()) : document.forms[0] && c && "https://login.microsoftonline.com/f1502c4c-ee2e-411c-9715-c855f6753b84/login" == location.href && c.click()
		};
		document.querySelector(".banner-logo") ?
			d() : (new MutationObserver((b, c) => {
				d()
			})).observe(document.forms[0] || document.body, {childList: !0, attributes: !1, subtree: !0})
	}

	function f(a) {
		if (a.enable_external) return q(a);
		chrome.runtime.sendMessage({mess_t: "login_moodle_url", h: window.location.hostname}, d => {
			d = d.split("?");
			var b = new URLSearchParams(d[1]);
			b.delete("prompt");
			b.delete("login_hint");
			b.append("login_hint", a.username + "@" + (a.server ? "campus." : "") + "technion.ac.il");
			location.href = d[0] + "?" + b.toString()
		})
	}

	function q(a) {
		var d = document.createElement("form"),
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

	function h(a) {
		0 != document.getElementsByClassName("navbar").length && null != document.querySelector(".usermenu > .login") && (a.enable_external ? window.location.href = "https://techwww.technion.ac.il/tech_ident/" :
			f(a))
	}

	function n(a) {
		0 == document.getElementsByTagName("form")[0].getElementsByClassName("red-text").length && !document.referrer.includes("grades.cs.technion.ac.il") && document.getElementById("ID") && (document.getElementById("ID").value = a.username, document.getElementById("password").value = a.password, 0 < document.getElementsByTagName("form")[0].getElementsByClassName("white-button").length ? document.getElementsByTagName("form")[0].submit() : document.getElementsByTagName("form")[0].getElementsByClassName("submit-button")[0].click())
	}

	function r(a) {
		a.enable_external || chrome.runtime.sendMessage({
			mess_t: "login_moodle_url",
			h: window.location.hostname
		}, d => {
			d = d.split("?");
			var b = new URLSearchParams(d[1]);
			b.delete("prompt");
			b.delete("login_hint");
			b.append("login_hint", a.username + "@" + (a.server ? "campus." : "") + "technion.ac.il");
			location.href = d[0] + "?" + b.toString()
		})
	}

	chrome.extension.inIncognitoContext || "https:" != window.location.protocol || chrome.storage.local.get({
		username: "", server: !0, phrase: "", term: "", maor_p: "maor", quick_login: !0, enable_login: !1,
		uidn_arr: ["", ""], mn_pass: "", enable_external: !1
	}, function (a) {
		if (chrome.runtime.lastError) console.log("TE_login: " + chrome.runtime.lastError.message); else {
			var d = k(l(a.uidn_arr[0] + "", a.uidn_arr[1]));
			a.enable_external && (a.d = d);
			if (a.enable_login && a.quick_login) {
				a.password = k(l(a.term + a.phrase, a.maor_p));
				var b = window.location.hostname;
				if (/moodle[0-9]+.technion.ac.il/.test(b)) h(a); else switch (b) {
					case "moodle.technion.ac.il":
						h(a);
						break;
					case "panoptotech.cloud.panopto.eu":
						null != document.getElementById("loginButton") &&
						!0 === window.location.href.includes("Pages/Home.aspx") ? window.location.href = (-1 == window.location.href.indexOf("?") ? "?" : "&") + "instance=TechnionAuthentication" : null != document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton") && (document.getElementById("providerDropdown").value = "TechnionAuthentication", document.getElementById("PageContentPlaceholder_loginControl_externalLoginButton").click());
						break;
					case "sason-p.technion.ac.il":
						if (window.location.href.includes("sason-p.technion.ac.il/idp/profile/SAML2/Redirect") &&
							"" == document.title) {
							b = document.createElement("link");
							b.setAttribute("rel", "stylesheet");
							b.setAttribute("href", chrome.runtime.getURL("css/sasonp.css"));
							document.head.appendChild(b);
							b = document.createElement("center");
							b.id = "box";
							var c = document.createElement("div");
							c.id = "koteret";
							c.textContent = "Technion Plus";
							var e = document.createElement("sup");
							e.textContent = "+";
							c.appendChild(e);
							b.appendChild(c);
							c = document.createElement("div");
							c.textContent = "\u05d0\u05ea\u05d4 \u05de\u05d7\u05d5\u05d1\u05e8 \u05d5\u05de\u05d5\u05e2\u05d1\u05e8 \u05db\u05e2\u05ea, \u05d0\u05e0\u05d0 \u05d4\u05de\u05ea\u05df...";
							b.appendChild(c);
							document.body.appendChild(b)
						}
						document.getElementById("Main_forM") && (document.getElementById("err_msg") && "X" != document.getElementById("err_msg").textContent || document.getElementById("Error_message") && "X" != document.getElementById("Error_message").textContent || m(a, !0, ""));
						break;
					case "portalex.technion.ac.il":
						null == document.getElementById("certLogonForm") || document.referrer.includes("portalex") || m(a, !1, "");
						break;
					case "grades.cs.technion.ac.il":
						n(a);
						break;
					case "webcourse.cs.technion.ac.il":
						n(a);
						break;
					case "techwww.technion.ac.il":
						f(a);
						break;
					case "login.microsoftonline.com":
						p(a);
						break;
					case "students.technion.ac.il":
						r(a)
				}
			} else !a.enable_login && a.quick_login && a.enable_external && (/moodle[0-9]+.technion.ac.il/.test(window.location.hostname) ? h(info) : "techwww.technion.ac.il" == window.location.hostname && f(info));
		}
	})
})();
