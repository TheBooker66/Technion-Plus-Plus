'use strict';
import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {OrganizerCalendar} from './organizer.js';
import {TE_forcedAutoLogin, TE_loginToMoodle} from "../service_worker.js";

(function () {
	function C(c, d) {
		return () => new Promise((e, b) => {
			const a = function (k) {
					k = k.response.querySelectorAll(".event[data-event-id='" + c + "'] a");
					if (k.length) {
						chrome.tabs.create({url: k[k.length - 1].getAttribute("href")});
						e();
					} else
						b(console.error("TE_cal_moodle: bad content"));
				},
				m = "https://moodle24.technion.ac.il/calendar/view.php?view=day&course=1&time=" + d / 1E3 + "#event_" + c;
			TE_forcedAutoLogin(true).then(() => popup.XHR(m, "document").then(a).catch(b)).catch(b);
		});
	}

	function D(c) {
		chrome.storage.local.get({cal_finished: {}},
			function (d) {
				if (chrome.runtime.lastError)
					console.error("TE_cal7: " + chrome.runtime.lastError.message);
				else {
					if (d.cal_finished.hasOwnProperty(c.toString()))
						delete d.cal_finished[c.toString()];
					else {
						d.cal_finished[c.toString()] = 0;
						chrome.storage.local.set({cal_finished: d.cal_finished});
					}
				}
			});
	}

	function x(c) {
		chrome.storage.local.get({calendar_prop: ""}, function (d) {
			if (chrome.runtime.lastError) console.error("TE_cal1: " + chrome.runtime.lastError.message), c({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true
			}); else if ("" === d.calendar_prop) {
				c({
					msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
					is_error: true
				});
				popup.XHR("https://moodle24.technion.ac.il/calendar/export.php", "document").then(function (b) {
					const a = b.response.getElementsByName("sesskey")[0].value;
					popup.XHR(b.responseURL, "document", "sesskey=" + a + "&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4")
						.then(function (m) {
							m = "userid=" + m.response.getElementById("calendarexporturl").value.split("userid=")[1].split("&preset_what=all")[0];
							chrome.storage.local.set({calendar_prop: m}, () => {
								chrome.runtime.lastError ? (console.error("TE_cal2: " +
									chrome.runtime.lastError.message), c({
									msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
									is_error: true
								})) : window.location.reload();
							})
						}).catch(err => console.error(err));
				}).catch(err => console.error(err));
			}
		});
	}

	function y(c, d) {
		chrome.storage.local.set({cal_seen: d, calendar_max: c}, () => {
			chrome.runtime.lastError && console.error("TE_cal_ra: " + chrome.runtime.lastError.message);
		});
	}

	const popup = new CommonPopup
	let r;
	popup.title = "מטלות קרובות - מודל";
	popup.css_list = ["calendar"];
	if (document.title === "ארגונית++") {
		r = new OrganizerCalendar(popup, "moodle");
	} else {
		r = new CommonCalendar(popup, "moodle");
		popup.popupWrap();
		r.calendarWrap();
	}

	chrome.storage.local.get({cal_killa: true}, function (c) {
		chrome.runtime.lastError ? (console.error("TE_cal: " + chrome.runtime.lastError.message), r.insertMessage("שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
			true)) : (document.getElementById("appeals_toggle").checked = c.cal_killa, document.getElementById("appeals_toggle").addEventListener("change", () => {
			chrome.storage.local.set({cal_killa: document.getElementById("appeals_toggle").checked}, () => {
				chrome.runtime.lastError ? console.error("TE_popup_remoodle: " + chrome.runtime.lastError.message) : location.reload()
			})
		}))
	});
	r.progress(_ => new Promise((d, e) => {
		chrome.storage.local.get({
				calendar_prop: "",
				calendar_max: 0,
				u_courses: {},
				cal_killa: true,
				cal_finished: {},
				cal_seen: 0
			},
			function (b) {
				chrome.runtime.lastError ? (console.error("TE_cal: " + chrome.runtime.lastError.message), e({
					msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
					is_error: true
				})) : "" === b.calendar_prop ? TE_loginToMoodle(true).then(() => x(e)).catch(_ => e({
					msg: "לפני משיכת המטלות הראשונית מהמודל יש להכנס אל המודל ולוודא שההתחברות בוצעה באופן תקין.",
					is_error: true
				})) : popup.XHR("https://moodle24.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&" + b.calendar_prop, "text").then(a => {
					if ("Invalid authentication" == a.response.trim()) chrome.storage.local.set({calendar_prop: ""}), TE_loginToMoodle(true).then(() => x(e)).catch(_ => e({
						msg: "לא ניתן למשוך מטלות מהמודל. נסה שנית מאוחר יותר, אם התקלה נמשכת - צור קשר עם המפתח.",
						is_error: true
					})); else if (a = a.response.split("BEGIN:VEVENT"), 1 == a.length) y(0, r.removeCalendarAlert(b.cal_seen)), d({
						new_list: [],
						finished_list: []
					}); else {
						const m = new Date;
						let k = 0, t = 0;
						const z = {}, E = {
							"200": "חורף",
							"100": "אביב",
							"300": "קיץ"
						}, A = [], B = [];
						for (let f = 1; f < a.length; f++) {
							let n = parseInt(a[f].split("UID:")[1].split("@moodle")[0]);
							t = n > t ? n : t;
							if (a[f].includes("CATEGORIES")) {
								let p = a[f].split("SUMMARY:")[1].split("\n")[0].trim();
								if (!("Attendance" === p || b.cal_killa && (p.includes("ערעור") || p.includes("זום")
									|| p.includes("Zoom") || p.includes("zoom") || p.includes("הרצא") || p.includes("תרגול")))) {
									let g = p.split(" ");
									if ("opens" !== g[g.length - 1] && "opens)" !== g[g.length - 1]) {
										g = a[f].split("DESCRIPTION:")[1].split("CLASS:")[0].replace(/\\n/g, "");
										g = 95 < g.length ? g.slice(0, 90) + "..." : g;
										let h = a[f].split("DTSTART")[1].split("\n")[0].replace(";VALUE=DATE:", "").replace(":", ""),
											w = h.includes("T") ? h.split("T")[1].replace(/([0-9]{2})([0-9]{2})([0-9]{2})/g, "$1:$2:$3") : "21:55:00Z";
										h = h.substring(0, 8).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/g, "$1-$2-$3").trim() + "T" + w.trim();
										h = new Date(h);
										if (!(h.getTime() < m.getTime() - 864E5)) {
											w = h.toLocaleString("iw-IL", {
												weekday: "long",
												day: "2-digit",
												month: "2-digit",
												year: "numeric"
											});
											let q = a[f].split("CATEGORIES:")[1].split("\n")[0].trim().split("."),
												u = q[0].replace(/[^0-9]/i, "").trim(),
												v = q[1].replace(/[^0-9]/i, "").trim();
											v = v ? ` - ${E[v]}` : "";
											u = b.u_courses.hasOwnProperty(u.toString()) ? b.u_courses[u] + v : q;
											q = 0;
											b.cal_finished.hasOwnProperty(n.toString()) && (q = 1, z[n.toString()] = 0);
											p = {
												header: p,
												description: g,
												course: u,
												final_date: w,
												is_new: n > b.calendar_max,
												goToFunc: C(n, h.getTime()),
												toggleFunc: () => D(n),
												timestamp: h.getTime(),
												sys: "m"
											};
											1 == q ? B.push(p) : A.push(p);
											k++;
										}
									}
								}
							}
						}
						chrome.storage.local.set({cal_finished: z});
						y(t, r.removeCalendarAlert(b.cal_seen));
						d({new_list: A, finished_list: B});
					}
				}).catch(err => {
					console.error(err);
					e({
						msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
						is_error: true
					});
				});
			});
	}));
})();
