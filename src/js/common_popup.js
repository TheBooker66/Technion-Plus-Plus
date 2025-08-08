'use strict';

export class CommonPopup {
	constructor(type) {
		this.title = "";
		this.css_list = [];
		this.wrapper = document.getElementsByClassName("wrapper")[0];
		this.main_content = this.wrapper.getElementsByClassName("main-content")[0];
		this.type = type;
	}

	useTemplatesFile = (templateFileName, callback) => {
		fetch("../html/templates/" + templateFileName + ".html").then(res => res.text()).then(parsedDoc => {
			parsedDoc = (new DOMParser).parseFromString(parsedDoc, "text/html");
			callback(parsedDoc);
		});
	};

	loadTemplate = (templateID, documentContext = document) => {
		return document.importNode(documentContext.querySelector("template#" + templateID).content, true);
	};

	popupWrap() {
		if (this.type === "ארגונית++") return;
		this.useTemplatesFile("popup", templateDocument => {
			for (let i = 0; i < this.css_list.length; i++) {
				const linkTemplate = this.loadTemplate("head-stylesheets", templateDocument);
				linkTemplate.querySelector("link").setAttribute("href", "../css/p_" + this.css_list[i] + ".css");
				document.head.appendChild(linkTemplate);
			}
			this.wrapper.insertBefore(this.loadTemplate("header-koteret", templateDocument), this.main_content);
			if (this.title !== "") {
				templateDocument = this.loadTemplate("header-title", templateDocument);
				templateDocument.querySelector("span:not(#returnHome)").textContent = this.title;
				this.wrapper.insertBefore(templateDocument, this.main_content);
			}
			this.buttonsSetup();
		});
	}

	buttonsSetup() {
		document.getElementById("goToSettings").addEventListener("click", () => {
			chrome.runtime.openOptionsPage(() => {
				if (chrome.runtime.lastError)
					console.error("TE_p: " + chrome.runtime.lastError.message);
			});
		});
		document.getElementById("goToAbout")
			.addEventListener("click", () => window.location.href = "../html/p_about.html");
		if (this.title !== "") document.getElementById("returnHome")
			.addEventListener("click", () => window.location.href = "../popup.html");
	}

	XHR(URL, responseType, bodyData = "") {
		return new Promise((resolve, reject) => {
			const fetchOptions = {
				headers: {
					accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "no-cache",
					pragma: "no-cache",
					"sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
				},
			};
			if (bodyData !== "") {
				fetchOptions.method = "post";
				fetchOptions.body = bodyData;
				fetchOptions.headers["Content-type"] = "application/x-www-form-urlencoded";
			}
			if (responseType === "csv") {
				fetchOptions.headers["Content-type"] = "text/csv;charset=UTF-8";
			}
			(async () => { // IIFE
				try {
					const response = await fetch(URL, fetchOptions);

					if (!response.ok) {
						reject(new Error(response.statusText));
						return;
					}

					let data;
					switch (responseType) {
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

					resolve({response: data, responseURL: response.url});
				} catch (err) {
					reject(err);
				}
			})();
		});
	}
}
