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
				get Courses() {
					return courseVisibleElements;
				},
				get CourseNames() {
					return courseVisibleElements.map(e => e.querySelector("h3")!.textContent);
				},
				get CourseLinks() {
					return courseVisibleElements.map(e => e.querySelector(".coursestyle2url")!.getAttribute("href"));
				},
				get WebworkForm() {
					return doc.querySelector("form");
				},
				get WebworkMissions() {
					return Array.from(doc.querySelectorAll(".problem_set_table tr")).map(t => t.querySelectorAll("td"));
				},
				get WebworkLinks() {
					return doc.querySelectorAll(".mod_index .lastcol a");
				},
				get SessionKey() {
					return (doc.querySelector("[name='sesskey']") as HTMLInputElement)?.value;
				},
				get UserText() {
					return doc.querySelector(".usertext");
				},
				get CalendarURL() {
					return (doc.getElementById("calendarexporturl") as HTMLInputElement)?.value;
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
