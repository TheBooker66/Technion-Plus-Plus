'use strict';

(function () {
	const f = a => [["--a_color", "hsl(" + (80 + a) + ", 90%, 80%)"], ["--a_hover_color", "hsl(" + (80 + a) + ", 90%, 45%)"], ["--a_navlink", "hsl(" + (90 + a) + ", 80%, 85%)"], ["--a_hover_navlink", "hsl(" + (90 + a) + ", 100%, 80%)"], ["--navbar_bottom", "hsl(" + (82 + a) + ", 100%, 41%)"], ["--navbar_bg", "hsl(" + (82 + a) + ", 100%, 25%)"], ["--dark_bg", "hsl(" + (90 + a) + ", 100%, 10%)"], ["--calendar_today", "hsla(" + (70 + a) + ", 100%, 20%, 0.5)"]];

	if (!window.location.href.includes("pluginfile.php")) {
		chrome.storage.local.get({
			remoodle: false,
			remoodle_angle: 120
		}, a => {
			if (chrome.runtime.lastError) console.error("TE_remoodle_err: " + chrome.runtime.lastError.message);
			else {
				let checkboxStatus = a.remoodle, e = f(a.remoodle_angle);
				const checkBox = function (bool) {
					bool ? document.querySelector("html").setAttribute("tplus", "dm") :
						document.querySelector("html").removeAttribute("tplus");
					const checkbox = document.getElementById("tp-darkmode");
					if (checkbox) checkbox.checked = bool;
				};
				e.forEach(c => document.documentElement.style.setProperty(c[0], c[1]));
				checkBox(checkboxStatus);
				chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
					if (message.mess_t === "TE_remoodle") {
						checkBox(!checkboxStatus);
						checkboxStatus = !checkboxStatus;
					}
					sendResponse();
				});
			}
		});
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message.mess_t === "TE_remoodle_reangle") {
				f(message.angle).forEach(d => document.documentElement.style.setProperty(d[0], d[1]));
				const b = document.querySelector("#tp_colorswitcher input[type=range]");
				if (b) b.value = message.angle;
			}
			sendResponse();
		});
	}
})();
