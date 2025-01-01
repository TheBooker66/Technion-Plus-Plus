'use strict';

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	switch (message.mess_t) {
		case "audio notification":
			const audio = new Audio(chrome.runtime.getURL("../resources/notification.mp3"));
			audio.volume = message.volume;
			await audio.play();
			break;
		case "DOMParser":
			const parsed_data = (new DOMParser).parseFromString(message.data, "text/html")
			sendResponse({
				"coursevisible": parsed_data.getElementsByClassName("coursevisible"),
				"h3": Array.from(parsed_data.getElementsByClassName("coursevisible"))
					.map(e => e.getElementsByTagName("h3")[0].textContent),
				"sesskey": parsed_data.getElementsByName("sesskey")[0] ? parsed_data.getElementsByName("sesskey")[0].value : "",
				"calendarexporturl": parsed_data.getElementById("calendarexporturl") ? parsed_data.getElementById("calendarexporturl").value : "",
				"coursestyle2url": Array.from(parsed_data.getElementsByClassName("coursevisible"))
					.map(e => e.getElementsByClassName("coursestyle2url")[0].getAttribute("href")),
				".problem_set_table tr": parsed_data.querySelectorAll(".problem_set_table tr"),
				"td": Array.from(parsed_data.querySelectorAll(".problem_set_table tr"))
					.map(t => t.getElementsByTagName("td")),
				".usertext": parsed_data.querySelector(".usertext"),
				".mod_index .lastcol a": parsed_data.querySelectorAll(".mod_index .lastcol a"),
				"form": parsed_data.querySelector("form"),
				"BEGIN:VEVENT": parsed_data.activeElement.innerHTML.split("BEGIN:VEVENT"),
			});
			break;
		case "iframe":
			if (chrome.runtime.lastError) return message.fail("b_storage - " + chrome.runtime.lastError.message);
			if (!message.id.enable_login) return message.fail("No username/password");
			const k = message.response.responseURL.split("?"), p = new URLSearchParams(k[1]);
			p.delete("prompt");
			p.append("login_hint", message.id.username + "@" + (message.id.server ? "campus." : "") + "technion.ac.il");
			const h = document.createElement("iframe"),
				m = () => {
					h.getAttribute("login_over") || (h.setAttribute("timer_over", "1"), message.fail("timer ended"))
				}, l = () => {
					h.getAttribute("timer_over") || (clearTimeout(m), h.setAttribute("login_over", "1"),
						h.removeEventListener("load", l),
						message.XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", message.a).then(q => {
							q.responseURL.includes("microsoft") ? message.fail("stuck on microsoft") : message.succeed(q)
						}))
				}, n = () => {
					h.addEventListener("load", l);
					h.removeEventListener("load", n)
				};
			document.body.appendChild(h);
			h.addEventListener("load", n);
			h.src = k[0] + "?" + p.toString();
			console.warn(`iframe activated! at ${Date.now()} [s]`);
			setTimeout(m, 4E3)
			break;
	}
	return true;
});

setInterval(async () => {
	(await navigator.serviceWorker.ready).active.postMessage('keepAlive');
}, 20e3);

