chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
	switch (message.mess_t) {
		case "audio notification":
			const audio = new Audio(chrome.runtime.getURL("../resources/notification.mp3"));
			audio.volume = message.volume;
			await audio.play();
			sendResponse();
			break;
		case "DOMParser":
			const doc = new DOMParser().parseFromString(message.data, "text/html");
			const courseVisibleElements = Array.from(doc.querySelectorAll(".coursevisible")),
				problemSetTableRows = Array.from(doc.querySelectorAll(".problem_set_table tr"));

			sendResponse({
				"coursevisible": courseVisibleElements,
				"h3": courseVisibleElements.map(e => e.querySelector("h3")?.textContent),
				"sesskey": doc.querySelector("[name='sesskey']") ? (doc.querySelector("[name='sesskey']") as HTMLInputElement)?.value : "",
				"calendarexporturl": doc.getElementById("calendarexporturl") ? (doc.getElementById("calendarexporturl") as HTMLInputElement)?.value : "",
				"coursestyle2url": courseVisibleElements.map(e => e.querySelector(".coursestyle2url")?.getAttribute("href")),
				".problem_set_table tr": problemSetTableRows,
				"td": problemSetTableRows.map(t => t.querySelectorAll("td")),
				".usertext": doc.querySelector(".usertext"),
				".mod_index .lastcol a": doc.querySelectorAll(".mod_index .lastcol a"),
				"form": doc.querySelector("form"),
				"BEGIN:VEVENT": doc.activeElement?.innerHTML.split("BEGIN:VEVENT"),
			});
			break;
	}
	return true;
});
