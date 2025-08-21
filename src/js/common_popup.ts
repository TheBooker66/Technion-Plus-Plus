export class CommonPopup {
	private readonly title: string;

	constructor(title: string = "", css_list: string[] = [], organiser: string) {
		this.title = title;
		if (organiser === "ארגונית++") return;

		this.useTemplatesFile("popup", (documentContext: Document) => {
			for (let i = 0; i < css_list.length; i++) {
				const linkTemplate = this.loadTemplate("head-stylesheets", documentContext);
				const element = linkTemplate.querySelector("link");
				if (element) element.setAttribute("href", "../css/p_" + css_list[i] + ".css");
				document.head.appendChild(linkTemplate);
			}

			const wrapper = document.querySelector(".wrapper") as HTMLElement;
			const main_content = wrapper.querySelector(".main-content") as HTMLElement;
			wrapper.insertBefore(this.loadTemplate("header-koteret", documentContext), main_content);
			if (this.title !== "") {
				const newTemplateDocument = this.loadTemplate("header-title", documentContext);
				const element = newTemplateDocument.querySelector("span:not(#returnHome)");
				if (element) element.textContent = this.title;
				wrapper.insertBefore(newTemplateDocument, main_content);
			}

			this.buttonsSetup();
		});
	}

	useTemplatesFile = (templateFileName: string, callback: (documentContext: Document) => void) => {
		fetch("../html/templates/" + templateFileName + ".html").then(res => res.text()).then(doc => {
			const parsedDoc = (new DOMParser).parseFromString(doc, "text/html");
			callback(parsedDoc);
		});
	};

	loadTemplate = (templateID: string, documentContext: Document = document) => {
		return document.importNode((documentContext.querySelector(`template#${templateID}`) as HTMLTemplateElement)?.content, true);
	};

	buttonsSetup() {
		document.getElementById("goToSettings")?.addEventListener("click", () => {
			chrome.runtime.openOptionsPage(() => {
				if (chrome.runtime.lastError)
					console.error("TE_p: " + chrome.runtime.lastError.message);
			});
		});
		document.getElementById("goToAbout")?.addEventListener("click", () => window.location.href = "../html/p_about.html");
		if (this.title !== "") document.getElementById("returnHome")?.addEventListener("click", () => window.location.href = "../popup.html");
	}

	XHR(URL: string, responseType: string, bodyData: string = "") {
		return new Promise<{ response: any, responseURL: string }>((resolve, reject) => {
			// noinspection SpellCheckingInspection
			const fetchOptions: RequestInit = {
				headers: {
					accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "no-cache",
					pragma: "no-cache",
					"sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
				},
			};
			if (bodyData !== "") {
				fetchOptions.method = "POST";
				fetchOptions.body = bodyData;
				(fetchOptions.headers as {
					[key: string]: string
				})["Content-type"] = "application/x-www-form-urlencoded";
			}
			if (responseType === "csv") {
				(fetchOptions.headers as { [key: string]: string })["Content-type"] = "text/csv;charset=UTF-8";
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
