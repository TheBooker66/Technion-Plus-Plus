chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
	switch (message.mess_t) {
		case "audio notification":
			const audio = new Audio(chrome.runtime.getURL("../resources/notification.mp3"));
			audio.volume = message.volume;
			await audio.play();
			break;
		case "DOMParser":
			const doc = new DOMParser().parseFromString(message.data, "text/html");
			const courseVisibleElements = Array.from(doc.querySelectorAll(".coursevisible"));
			// noinspection DuplicatedCode
			const actions = {
				get CourseNames() {
					return courseVisibleElements.map(name => name.querySelector("h3")!.textContent);
				},
				get CourseLinks() {
					return courseVisibleElements.map(name => name.querySelector(".coursestyle2btn")!.getAttribute("href"));
				},
				get WebworkForm() {
					const form = doc.querySelector("form");
					if (!form) return null;

					const formData: { [key: string]: string } = {};
					const elements = form.elements;
					for (let i = 0; i < elements.length; i++) {
						const element = elements[i] as HTMLFormElement;
						if (element.name) {
							if (element.type === 'checkbox' || element.type === 'radio') {
								if (element.checked) {
									formData[element.name] = element.value;
								}
							} else {
								formData[element.name] = element.value;
							}
						}
					}

					return {
						action: form.action,
						data: formData,
					};
				},
				get WebworkMissions() {
					const missionsContainer = doc.getElementById("set-list-container");
					if (!missionsContainer) return [];
					const missions = missionsContainer.querySelectorAll("li > div.ms-3.me-auto");
					return Array.from(missions).map(mission => {
						return {
							name: mission.querySelector("div > a.fw-bold.set-id-tooltip")?.textContent.trim() ??
								mission.querySelector("div > span.set-id-tooltip")?.textContent.trim() ?? "מטלה ללא שם",
							due: mission.querySelector("div.font-sm")?.textContent.trim() ?? "אין תאריך הגשה",
						};
					});
				},
				get WebworkLinks() {
					const elements = doc.querySelectorAll(".mod_index .lastcol a") as NodeListOf<HTMLAnchorElement>;
					return Array.from(elements).map(link => ({
						text: link.textContent,
						href: link.href,
					}));
				},
				get SessionKey() {
					return (doc.querySelector("[name='sesskey']") as HTMLInputElement)?.value;
				},
				get CalendarURL() {
					return (doc.getElementById("calendarexporturl") as HTMLInputElement)?.value;
				},
				get UserText() {
					return doc.querySelector(".usertext")?.textContent;
				},
				get HWList() {
					return doc.activeElement?.innerHTML.split("BEGIN:VEVENT") ?? [];
				},
			};

			let returnObj: { [key: string]: any } = {};
			for (const key of message.dataNeeded) {
				if (actions[key as keyof typeof actions] !== undefined)
					returnObj[key] = actions[key as keyof typeof actions];
			}
			sendResponse(returnObj);
			return true;
	}
	return false;
});
