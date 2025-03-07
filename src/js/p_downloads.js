'use strict';
import {CommonPopup} from './common_popup.js';

(function () {
	function f(a, b) {
		a.textContent != b && (a.textContent = b)
	}

	function k(a, b) {
		a.textContent != b + "%" && (a.textContent = b + "%", document.documentElement.style.setProperty("--prog", b))
	}

	function n() {
		chrome.storage.local.get({dl_current: 0}, a => {
			0 != a.dl_current ? chrome.downloads.search({id: a.dl_current}, b => {
				"block" != document.getElementById("myform").style.display && (document.getElementById("myform").style.display = "block");
				if (b[0].filename) {
					f(e[0], b[0].filename);
					let c = b[0].paused ? "מושהה" : "פעיל";
					f(e[1], c);
					0 < b[0].totalBytes ? (c += " - " + (b[0].bytesReceived / 1048576).toFixed(1) + "/" + (b[0].totalBytes / 1048576).toFixed(1) + "MB", f(e[1], c), b = (100 * b[0].bytesReceived / b[0].totalBytes).toFixed(1), k(e[2], b)) : k(e[2], 0)
				}
			}) : ("none" != document.getElementById("myform").style.display && (document.getElementById("myform").style.display = "none"), f(e[0], "אין קבצים בהורדה על ידי התוסף."),
				f(e[1], ""), k(e[2], 0))
		})
	}

	function l() {
		for (; d.firstChild;) d.removeChild(d.lastChild);
		chrome.storage.local.get({dl_queue: []}, a => {
			let b = 0;
			a.dl_queue.forEach(c => {
				for (let m = 0; m < c.list.length; m++) {
					let p = c.list[m], g = q.cloneNode(true).querySelector(".list_item");
					g.querySelector(".dl_name").textContent = p.n;
					g.querySelector(".dl_from").src = "../icons/" + ["moodle.svg", "panopto.ico", "grpp.ico", "grpp.ico"][c.sys];
					g.querySelector(".remove").addEventListener("click", () => {
						let r = c.list.indexOf(p);
						c.list.splice(r, 1);
						0 == c.list.length &&
						a.dl_queue.splice(a.dl_queue.indexOf(c), 1);
						chrome.storage.local.set({dl_queue: a.dl_queue});
						g.remove();
						d.firstChild || (d.appendChild(document.createElement("span")).textContent = "אין קבצים בהמתנה להורדה על ידי התוסף.", d.firstChild.style.padding = "8px")
					});
					d.appendChild(g);
					b++
				}
			});
			0 == b && (d.appendChild(document.createElement("span")).textContent = "אין קבצים בהמתנה להורדה על ידי התוסף.",
				d.firstChild.style.padding = "8px")
		})
	}

	const popup = new CommonPopup;
	popup.title = "מנהל הורדות";
	popup.css_list = ["downloads"];
	popup.popupWrap();
	const e = document.querySelectorAll("#current span"),
		d = document.getElementById("queue"),
		q = popup.loadTemplate("dl_item");
	n();
	setInterval(n, 350);
	l();
	chrome.downloads.onCreated.addListener(_ => setTimeout(l, 1E3));
	chrome.downloads.onChanged.addListener(a => {
		(a.state || a.paused) && l()
	});
	document.getElementById("pause").addEventListener("click", () => {
		chrome.storage.local.get({dl_current: 0}, a => {
			0 != a.dl_current && chrome.downloads.search({id: a.dl_current}, b => {
				b[0] && (1 == b[0].paused ? chrome.downloads.resume(a.dl_current) : chrome.downloads.pause(a.dl_current))
			})
		})
	});
	document.getElementById("cancel").addEventListener("click", () => {
		chrome.storage.local.get({dl_current: 0}, a => {
			0 != a.dl_current && chrome.downloads.cancel(a.dl_current)
		})
	});
	document.getElementById("cancelAll").addEventListener("click", () => {
		chrome.storage.local.get({dl_current: 0}, a => {
			chrome.storage.local.set({
				dl_current: 0,
				dl_queue: []
			}, () => {
				0 != a.dl_current && chrome.downloads.cancel(a.dl_current);
				chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"})
			})
		})
	})
})();
