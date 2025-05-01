'use strict';
import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {TE_forcedAutoLogin, TE_loginToMoodle} from "../service_worker.js";

(function () {
	function openMoodle(eventID, eventTimestamp) {
		return () => new Promise((resolve, reject) => {
			const handleResponse = function (eventLinks) {
					eventLinks = eventLinks.response.querySelectorAll(`.event[data-event-id='${eventID}'] a`);
					if (eventLinks.length) {
						chrome.tabs.create({url: eventLinks[eventLinks.length - 1].getAttribute("href")});
						resolve();
					} else
						reject(() => console.error("TE_cal_moodle: bad content"));
				},
				eventURL = "https://moodle24.technion.ac.il/calendar/view.php?view=day&course=1&time=" + eventTimestamp / 1E3 + "#event_" + eventID;
			TE_forcedAutoLogin(true).then(() => popup.XHR(eventURL, "document").then(handleResponse).catch(reject)).catch(reject);
		});
	}

	function initializeCalendarProperties(errorCallback) {
		chrome.storage.local.get({calendar_prop: ""}, function (storage) {
			if (chrome.runtime.lastError) {
				console.error("TE_cal1: " + chrome.runtime.lastError.message);
				errorCallback({
					msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
					is_error: true,
				});
			} else if ("" === storage.calendar_prop) {
				errorCallback({
					msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
					is_error: true,
				});
				popup.XHR("https://moodle24.technion.ac.il/calendar/export.php", "document").then(res => {
					const sessionKey = res.response.getElementsByName("sesskey")[0].value;
					popup.XHR(res.responseURL, "document", "sesskey=" + sessionKey + "&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4")
						.then(exportResponse => {
							exportResponse = "userid=" + exportResponse.response.getElementById("calendarexporturl").value.split("userid=")[1].split("&preset_what=all")[0];
							chrome.storage.local.set({calendar_prop: exportResponse}, () => {
								if (chrome.runtime.lastError) {
									console.error("TE_cal2: " + chrome.runtime.lastError.message);
									errorCallback({
										msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
										is_error: true,
									});
								} else window.location.reload();
							});
						}).catch(err => console.error(err));
				}).catch(err => console.error(err));
			}
		});
	}

	function updateCalendar(maxEventID, seenEventsCount) {
		chrome.storage.local.set({cal_seen: seenEventsCount, calendar_max: maxEventID}, () => {
			if (chrome.runtime.lastError)
				console.error("TE_cal_ra: " + chrome.runtime.lastError.message);
		});
	}

	const popup = new CommonPopup(document.title);
	popup.title = "מטלות קרובות - מודל";
	popup.css_list = ["calendar"];
	const calendar = new CommonCalendar(popup, "moodle", document.title);
	popup.popupWrap();
	calendar.calendarWrap();

	calendar.progress(_ => new Promise((resolve, reject) => {
		chrome.storage.local.get({
			calendar_prop: "",
			calendar_max: 0,
			u_courses: {},
			cal_finished: {},
			cal_seen: 0,
			filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
		}, storage => {
			if (chrome.runtime.lastError) {
				console.error("TE_cal: " + chrome.runtime.lastError.message);
				reject({
					msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
					is_error: true,
				});
				return;
			}
			if (storage.calendar_prop === "") {
				TE_loginToMoodle(true).then(() => initializeCalendarProperties(reject)).catch(_ => reject({
					msg: "לפני משיכת המטלות הראשונית מהמודל יש להכנס אל המודל ולוודא שההתחברות בוצעה באופן תקין.",
					is_error: true,
				}));
				return;
			}
			popup.XHR("https://moodle24.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&" + storage.calendar_prop, "text").then(res => {
				if ("Invalid authentication" === res.response.trim()) {
					chrome.storage.local.set({calendar_prop: ""}, () => {
						if (chrome.runtime.lastError)
							console.error("TE_cal_moodle: " + chrome.runtime.lastError.message);
					});
					TE_loginToMoodle(true).then(() => initializeCalendarProperties(reject)).catch(_ => reject({
						msg: "לא ניתן למשוך מטלות מהמודל. נסה שנית מאוחר יותר, אם התקלה נמשכת - צור קשר עם המפתח.",
						is_error: true,
					}));
					return;
				}
				const cal = res.response.split("BEGIN:VEVENT");
				if (cal.length === 1) {
					updateCalendar(0, calendar.removeCalendarAlert(storage.cal_seen));
					resolve({
						new_list: [],
						finished_list: [],
					});
					return;
				}
				const now = new Date(), semesters = {
					"200": "חורף",
					"201": "אביב",
					"202": "קיץ",
				}, datetimeFormat = {
					weekday: "long",
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
				};
				let maxEventID = 0, finishedEvents = {},
					newAssignmentsList = [], finishedAssignmentsList = [];
				for (let i = 1; i < cal.length; i++) {
					const eventID = parseInt(cal[i].split("UID:")[1].split("@moodle")[0]);
					maxEventID = eventID > maxEventID ? eventID : maxEventID;
					if (cal[i].includes("CATEGORIES")) {
						const eventTitle = cal[i].split("SUMMARY:")[1].split("\n")[0].trim();
						if ((storage.filter_toggles.appeals && eventTitle.includes("ערעור"))
							|| (storage.filter_toggles.zooms && (eventTitle.includes("זום") || eventTitle.includes("Zoom") || eventTitle.includes("zoom") || eventTitle.includes("הרצא") || eventTitle.includes("תרגול")))
							|| (storage.filter_toggles.attendance && (eventTitle.includes("נוכחות") || eventTitle.includes("Attendance") || eventTitle.includes("attendance")))
							|| (storage.filter_toggles.reserveDuty && eventTitle.includes("מילואים")))
							continue;

						const titleWords = eventTitle.split(" ");
						if ("opens" !== titleWords[titleWords.length - 1] && "opens)" !== titleWords[titleWords.length - 1]) {
							const courseInfo = cal[i].split("CATEGORIES:")[1].split("\n")[0].trim().split(".");
							const courseNum = courseInfo[0]?.replace(/[^0-9]/i, "").trim(),
								semesterNum = courseInfo[1]?.replace(/[^0-9]/i, "").trim();
							const course = storage.u_courses.hasOwnProperty(courseNum.toString()) ?
								storage.u_courses[courseNum] + (semesterNum ? ` - ${semesters[semesterNum]}` : "") : courseInfo;

							let eventDescription = cal[i].split("DESCRIPTION:")[1].split("CLASS:")[0].replace(/\\n/g, "");
							eventDescription = 95 < eventDescription.length ? eventDescription.slice(0, 90) + "..." : eventDescription;

							let eventDate = cal[i].split("DTSTART")[1].split("\n")[0].replace(";VALUE=DATE:", "").replace(":", ""),
								eventTime = !eventDate.includes("T") ? "21:55:00Z" :
									eventDate.split("T")[1].replace(/([0-9]{2})([0-9]{2})([0-9]{2})/g, "$1:$2:$3");
							eventDate = eventDate.substring(0, 8).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/g, "$1-$2-$3").trim() + "T" + eventTime.trim();
							eventDate = new Date(eventDate);
							if (eventDate.getTime() < now.getTime() - 864E5)
								continue;
							eventTime = eventDate.toLocaleString("iw-IL", datetimeFormat);

							let finishedEh = false;
							if (storage.cal_finished.hasOwnProperty(eventID.toString())) {
								finishedEh = true;
								finishedEvents[eventID.toString()] = 0;
							}
							const event = {
								header: eventTitle,
								description: eventDescription,
								course: course,
								final_date: eventTime,
								is_new: eventID > storage.calendar_max,
								goToFunc: openMoodle(eventID, eventDate.getTime()),
								event: eventID,
								timestamp: eventDate.getTime(),
								sys: "moodle",
							};
							finishedEh ? finishedAssignmentsList.push(event) : newAssignmentsList.push(event);
						}
					}
				}
				chrome.storage.local.set({cal_finished: finishedEvents}, () => {
					if (chrome.runtime.lastError)
						console.error("TE_cal_moodle: " + chrome.runtime.lastError.message);
				});
				updateCalendar(maxEventID, calendar.removeCalendarAlert(storage.cal_seen));
				resolve({new_list: newAssignmentsList, finished_list: finishedAssignmentsList});

			}).catch(err => {
				console.error(err);
				reject({
					msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
					is_error: true,
				});
			});
		});
	}));
})();
