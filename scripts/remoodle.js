'use strict';
(function () {
	function f(a) {
		return [["--a_color", "hsl(" + (80 + a) + ", 90%, 80%)"], ["--a_hover_color", "hsl(" + (80 + a) + ", 90%, 45%)"], ["--a_navlink", "hsl(" + (90 + a) + ", 80%, 85%)"], ["--a_navlink_hover", "hsl(" + (90 + a) + ", 100%, 80%)"], ["--navbar_bottom", "hsl(" + (82 + a) + ", 100%, 41%)"], ["--navbar_bg", "hsl(" + (82 + a) + ", 100%, 25%)"], ["--dark_bg", "hsl(" + (90 + a) + ", 100%, 10%)"], ["--calendar_today", "hsla(" + (70 + a) + ", 100%, 20%, 0.5)"]]
	}

	if (!window.location.href.includes("pluginfile.php")) {
		var e = [];
		chrome.storage.local.get({
			remoodle: !1,
			remoodle_angle: 120
		}, a => {
			if (chrome.runtime.lastError) console.log("TE_remoodle_err: " + chrome.runtime.lastError.message); else {
				var b = a.remoodle;
				e = f(a.remoodle_angle);
				e.forEach(c => document.documentElement.style.setProperty(c[0], c[1]));
				var d = function (c) {
					c ? document.querySelector("html").setAttribute("tplus", "dm") : document.querySelector("html").removeAttribute("tplus");
					var g = document.getElementById("tp-darkmode");
					g && (g.checked = c)
				};
				d(b);
				chrome.runtime.onMessage.addListener(c => {
					"TE_remoodle" === c.mess_t && (b =
						!b, d(b))
				})
			}
		});
		chrome.runtime.onMessage.addListener(a => {
			if ("TE_remoodle_reangle" === a.mess_t) {
				a = a.angle;
				e = f(a);
				e.forEach(d => document.documentElement.style.setProperty(d[0], d[1]));
				var b = document.querySelector("#tp_colorswitcher input[type=range]");
				b && (b.value = a)
			}
		})
	}
})();
