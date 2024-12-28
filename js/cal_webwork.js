'use strict';

import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {OrganizerCalendar} from './organizer.js';


(function () {
	function q(e) {
		chrome.storage.local.get({webwork_cal: {}}, function (b) {
			chrome.runtime.lastError ? console.log("TE_ww_cal7: " + chrome.runtime.lastError.message) : (b.webwork_cal[e].done = 1 - b.webwork_cal[e].done, chrome.storage.local.set({webwork_cal: b.webwork_cal}))
		})
	}

	function r(e, b) {
		return e[1].ts === b[1].ts ? e[1].h.localeCompare(b[1].h) : 0 === e[1].ts ? 1 : 0 === b[1].ts || e[1].ts < b[1].ts ? -1 : e[1].ts > b[1].ts ? 1 : 0
	}

	const h = new CommonPopup;
	let l;
	h.title = "מטלות קרובות - WeBWorK";
	h.css_list = ["calendar"];
	if (document.title === "ארגונית++") {
		l = new OrganizerCalendar(h, "webwork");
	} else {
		l = new CommonCalendar(h, "webwork");
		h.popupWrap();
		l.calendarWrap();
	}

	const u = (e, b) => chrome.storage.local.get({
		webwork_cal: {},
		cal_seen: 0,
		wwcal_update: 0,
		webwork_courses: {}
	}, function (f) {
		const m = {};
		for (let c of Object.values(f.webwork_courses)) m[c.lti] = c.name;
		if (chrome.runtime.lastError) {
			b({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: !0
			})
			console.log("TE_ww_cal: " + chrome.runtime.lastError.message);
		} else {
			document.getElementById("lastcheck").style.display = "block";
			let c = new Date(f.wwcal_update);
			let g = function (a) {
				return 9 < a ? a : "0" + a
			};
			document.getElementById("lastcheck").textContent += f.wwcal_update ? c.getDate() + "." + (c.getMonth() + 1) + "." + c.getFullYear() + ", בשעה " + g(c.getHours()) + ":" + g(c.getMinutes()) : "לא ידוע";
			const d = [], k = f.webwork_cal;
			Object.keys(k).forEach(a => {
				d.push([a, k[a]])
			});
			d.sort(r);
			c = [];
			g = [];
			for (let a = 0; a < d.length; a++) {
				let n = d[a][0].split("_")[0];
				let p = {
					header: d[a][1].h,
					description: "",
					course: m[n],
					final_date: d[a][1].due,
					is_new: !d[a][1].seen,
					goToFunc: () => new Promise((t, _) => t(chrome.tabs.create({url: `https://moodle24.technion.ac.il/mod/lti/launch.php?id=${n}`}))),
					toggleFunc: () => q(d[a][0]),
					timestamp: d[a][1].ts,
					sys: "ww"
				};
				1 == d[a][1].done ? g.push(p) : c.push(p);
				d[a][1].seen = 1
			}
			f = l.removeCalendarAlert(f.cal_seen);
			chrome.storage.local.set({cal_seen: f, webwork_cal: k});
			e({new_list: c, finished_list: g})
		}
	});
	l.progress(() => new Promise(u))
})();
