'use strict';

export class CommonPopup {
	constructor() {
		this.title = "";
		this.css_list = [];
		this.wrapper = document.getElementsByClassName("wrapper")[0];
		this.main_content = this.wrapper.getElementsByClassName("main-content")[0];
	}

	useTemplatesFile(a, b) {
		fetch("../html/templates/" + a + ".html").then(c => c.text()).then(c => {
			c = (new DOMParser).parseFromString(c, "text/html");
			b(c)
		})
	}

	loadTemplate(a, b) {
		b = void 0 === b ? document : b;
		a = b.querySelector("template#" + a).content;
		return document.importNode(a, !0)
	}

	popupWrap() {
		this.useTemplatesFile("common", a => {
			for (var b = 0; b < this.css_list.length; b++) {
				var c = this.loadTemplate("head-stylesheets", a);
				c.querySelector("link").setAttribute("href", "../css/p_" + this.css_list[b] + ".css");
				document.head.appendChild(c)
			}
			this.wrapper.insertBefore(this.loadTemplate("header-koteret", a), this.main_content);
			"" != this.title && (a = this.loadTemplate("header-title", a), a.querySelector("div:not(#returnHome)").textContent = this.title, this.wrapper.insertBefore(a, this.main_content));
			this.buttonsSetup()
		})
	}

	buttonsSetup() {
		document.getElementById("goToSettings").addEventListener("click",
			function () {
				chrome.runtime.openOptionsPage(function () {
					chrome.runtime.lastError && console.log("TE_p: " + chrome.runtime.lastError.message)
				})
			});
		document.getElementById("goToAbout").addEventListener("click", () => window.location.href = "../html/p_about.html");
		"" != this.title && document.getElementById("returnHome").addEventListener("click", () => {
			window.location.href = "../popup.html"
		})
	}

	XHR(a, b, c) {
		c = void 0 === c ? "" : c;
		return new Promise((e, g) => {
			var f = {
				headers: {
					accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "no-cache",
					pragma: "no-cache",
					"sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"'
				},
			};
			if (c != "") {
				f.method = "post";
				f.body = c;
				f.headers["Content-type"] = "application/x-www-form-urlencoded";
			}
			if (b === "csv") {
				f.headers["Content-type"] = "text/csv;charset=UTF-8";
			}
			(async () => { // IIFE
				try {
					const response = await fetch(a, f);

					if (!response.ok) {
						throw new Error(response.statusText);
					}

					let data;
					switch (b) {
						case "json":
							data = await response.json();
							break;
						case "document":
							const text = await response.text();
							data = new DOMParser().parseFromString(text, "text/html");
							break;
						default:
							data = await response.text();
					}

					e({ response: data, responseURL: response.url });
				} catch (error) {
					g(error);
				}
			})();
		})
	}
}
