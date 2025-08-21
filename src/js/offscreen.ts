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
				"h3": courseVisibleElements.map(e => e.querySelector("h3")!.textContent),
				"sesskey": doc.querySelector("[name='sesskey']") ? (doc.querySelector("[name='sesskey']") as HTMLInputElement).value : "",
				"calendarexporturl": doc.getElementById("calendarexporturl") ? (doc.getElementById("calendarexporturl") as HTMLInputElement).value : "",
				"coursestyle2url": courseVisibleElements.map(e => e.querySelector(".coursestyle2url")!.getAttribute("href")),
				".problem_set_table tr": problemSetTableRows,
				"td": problemSetTableRows.map(t => t.querySelectorAll("td")),
				".usertext": doc.querySelector(".usertext"),
				".mod_index .lastcol a": doc.querySelectorAll(".mod_index .lastcol a"),
				"form": doc.querySelector("form"),
				"BEGIN:VEVENT": doc.activeElement?.innerHTML.split("BEGIN:VEVENT"),
			});
			break;
		case "iframe":
			console.warn(`iframe activated! at ${Date.now()} [s]`);
			if (chrome.runtime.lastError) throw new Error("b_storage - " + chrome.runtime.lastError.message);
			if (!message.id.enable_login) throw new Error("No username/password");

			const onInitialLoad = () => {
				iframe.removeEventListener("load", onInitialLoad);
				iframe.addEventListener("load", onSecondLoad);
			}, onSecondLoad = () => {
				iframe.removeEventListener("load", onSecondLoad);
				if (iframe.getAttribute("timer_over")) return;
				clearTimeout(timeoutID);
				iframe.setAttribute("login_over", "1");
				message.XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", message.data)
					.then((res: { response: any, responseURL: string }) => {
						if (res.responseURL.includes("microsoft")) throw new Error("stuck on microsoft");
						else sendResponse(res);
					});
			}, timeoutFunc = () => {
				if (iframe.getAttribute("login_over")) return;
				iframe.setAttribute("timer_over", "1");
				throw new Error("timer ended");
			};

			const [baseUrl, queryString] = message.response.responseURL.split("?");
			const params = new URLSearchParams(queryString);
			params.delete("prompt");
			params.append("login_hint", message.id.username + "@" + (message.id.server ? "campus." : "") + "technion.ac.il");

			const iframe = document.createElement("iframe");
			iframe.addEventListener("load", onInitialLoad);
			iframe.src = `${baseUrl}?${params.toString()}`;
			document.body.appendChild(iframe);

			const timeoutID = setTimeout(timeoutFunc, 4E3);
			break;
	}
	return true;
});
