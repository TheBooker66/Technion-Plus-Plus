'use strict';
import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';

(function () {
	const popup = new CommonPopup(document.title);
	popup.title = "מטלות קרובות - מודל";
	popup.css_list = ["calendar"];
	const calendar = new CommonCalendar(popup, "webwork", document.title);
	popup.popupWrap();
	calendar.calendarWrap();

	calendar.progress(() => new Promise((e, b) => chrome.storage.local.get({
		webwork_cal: {},
		cal_seen: 0,
		wwcal_update: 0,
		webwork_courses: {}
	}, function (f) {
		const m = {};
		for (let c of Object.values(f.webwork_courses)) m[c.lti] = c.name;
		if (chrome.runtime.lastError) {
			console.error("TE_ww_cal: " + chrome.runtime.lastError.message);
			b({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true
			})
		} else {
			document.getElementById("lastcheck").style.display = "block";
			let date = new Date(f.wwcal_update);
			let fix_date = a => 9 < a ? a : "0" + a;
			document.getElementById("lastcheck").textContent += f.wwcal_update ? date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + ", בשעה " + fix_date(date.getHours()) + ":" + fix_date(date.getMinutes()) : "לא ידוע";
			const d = [], k = f.webwork_cal;
			Object.keys(k).forEach(a => {
				d.push([a, k[a]])
			});
			d.sort((a, b) => {
				return a[1].ts === b[1].ts ? a[1].h.localeCompare(b[1].h) : 0 === a[1].ts ? 1 : 0 === b[1].ts || a[1].ts < b[1].ts ? -1 : a[1].ts > b[1].ts ? 1 : 0;
			});
			let c = [], g = [];
			for (let a = 0; a < d.length; a++) {
				let n = d[a][0].split("_")[0];
				let p = {
					header: d[a][1].h,
					description: "",
					course: m[n],
					final_date: d[a][1].due,
					is_new: !d[a][1].seen,
					goToFunc: () => new Promise((t, _) => t(chrome.tabs.create({url: `https://moodle24.technion.ac.il/mod/lti/launch.php?id=${n}`}))),
					event: d[a][0],
					timestamp: d[a][1].ts,
					sys: "webwork",
				};
				1 == d[a][1].done ? g.push(p) : c.push(p);
				d[a][1].seen = 1
			}
			f = calendar.removeCalendarAlert(f.cal_seen);
			chrome.storage.local.set({cal_seen: f, webwork_cal: k});
			e({new_list: c, finished_list: g})
		}
	})));
})();
