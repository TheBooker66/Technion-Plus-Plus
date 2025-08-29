import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {TE_AutoLogin} from "../service_worker.js";

(function () {
	function openMoodle(eventID: number, eventTimestamp: number): () => Promise<chrome.tabs.Tab> {
		return () => new Promise((resolve, reject) => {
			const eventURL = "https://moodle24.technion.ac.il/calendar/view.php?view=day&course=1&time=" + eventTimestamp / 1E3 + "#event_" + eventID;
			TE_AutoLogin(true)
				.then(() => popup.XHR(eventURL, "document")
					.then((response: { response: any, responseURL: string }) => {
						const eventLinks = response.response.querySelectorAll(`.event[data-event-id='${eventID}'] a`);
						if (eventLinks.length)
							resolve(chrome.tabs.create({url: eventLinks[eventLinks.length - 1].getAttribute("href")}));
						else
							reject(() => console.error("TE_cal_moodle: bad content"));
					})
					.catch(reject))
				.catch(reject);
		});
	}

	function initializeCalendarProperties(errorCallback: ({msg, errorEh}: { msg: string, errorEh: boolean }) => void) {
		chrome.storage.local.get({calendar_prop: ""}, function (storage) {
			if (chrome.runtime.lastError) {
				console.error("TE_cal1: " + chrome.runtime.lastError.message);
				errorCallback({
					msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
					errorEh: true,
				});
			} else if ("" === storage.calendar_prop) {
				errorCallback({
					msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
					errorEh: true,
				});
				popup.XHR("https://moodle24.technion.ac.il/calendar/export.php", "document").then(res => {
					const sessionKey: string = res.response.querySelector("[name='sesskey']").value;
					popup.XHR(res.responseURL, "document", "sesskey=" + sessionKey + "&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4")
						.then(exportResponse => {
							const exportResponse2: string = "userid=" + exportResponse.response.getElementById("calendarexporturl").value.split("userid=")[1].split("&preset_what=all")[0];
							chrome.storage.local.set({calendar_prop: exportResponse2}, () => {
								if (chrome.runtime.lastError) {
									console.error("TE_cal2: " + chrome.runtime.lastError.message);
									errorCallback({
										msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
										errorEh: true,
									});
								} else window.location.reload();
							});
						}).catch(err => console.error(err));
				}).catch(err => console.error(err));
			}
		});
	}

	function updateCalendar(maxEventID: number, seenEventsCount: number = 0) {
		chrome.storage.local.set({cal_seen: seenEventsCount, calendar_max: maxEventID}, () => {
			if (chrome.runtime.lastError)
				console.error("TE_cal_ra: " + chrome.runtime.lastError.message);
		});
	}

	const popup = new CommonPopup("מטלות קרובות - מודל", ["calendar"], document.title);
	const calendar = new CommonCalendar(popup, "moodle", document.title);

	calendar.progress(() => new Promise((resolve, reject) => chrome.storage.local.get({
		calendar_prop: "",
		calendar_max: 0,
		u_courses: {},
		cal_finished: {},
		cal_seen: 0,
		filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
	}, storageData => {
		if (chrome.runtime.lastError) {
			console.error("TE_cal: " + chrome.runtime.lastError.message);
			reject({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true,
			});
			return;
		}
		if (storageData.calendar_prop === "") {
			TE_AutoLogin(true).then(() => initializeCalendarProperties(reject)).catch(_ => reject({
				msg: "לפני משיכת המטלות הראשונית מהמודל יש להכנס אל המודל ולוודא שההתחברות בוצעה באופן תקין.",
				is_error: true,
			}));
			return;
		}
		popup.XHR("https://moodle24.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&" + storageData.calendar_prop, "text").then(res => {
			if ("Invalid authentication" === res.response.trim()) {
				chrome.storage.local.set({calendar_prop: ""}, () => {
					if (chrome.runtime.lastError)
						console.error("TE_cal_moodle: " + chrome.runtime.lastError.message);
				});
				TE_AutoLogin(true).then(() => initializeCalendarProperties(reject)).catch(_ => reject({
					msg: "לא ניתן למשוך מטלות מהמודל. נסה שנית מאוחר יותר, אם התקלה נמשכת - צור קשר עם המפתח.",
					is_error: true,
				}));
				return;
			}
			const cal = res.response.split("BEGIN:VEVENT");
			if (cal.length === 1) {
				updateCalendar(0, calendar.removeCalendarAlert(storageData.cal_seen));
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
			};
			let maxEventID = 0, finishedEvents: { [key: string]: number } = {},
				newAssignmentsList: HWAssignment[] = [], finishedAssignmentsList: HWAssignment[] = [];
			for (let i = 1; i < cal.length; i++) {
				const eventID = parseInt(cal[i].split("UID:")[1].split("@moodle")[0]);
				maxEventID = eventID > maxEventID ? eventID : maxEventID;
				if (cal[i].includes("CATEGORIES")) {
					const eventTitle = cal[i].split("SUMMARY:")[1].split("\n")[0].trim();
					if ((storageData.filter_toggles.appeals && eventTitle.includes("ערעור"))
						|| (storageData.filter_toggles.zooms && (eventTitle.includes("זום") || eventTitle.includes("Zoom") || eventTitle.includes("zoom") || eventTitle.includes("הרצא") || eventTitle.includes("תרגול")))
						|| (storageData.filter_toggles.attendance && (eventTitle.includes("נוכחות") || eventTitle.includes("Attendance") || eventTitle.includes("attendance")))
						|| (storageData.filter_toggles.reserveDuty && eventTitle.includes("מילואים")))
						continue;

					const titleWords = eventTitle.split(" ");
					if ("opens" !== titleWords[titleWords.length - 1] && "opens)" !== titleWords[titleWords.length - 1]) {
						let eventDate = cal[i].split("DTSTART")[1].split("\n")[0].replace(";VALUE=DATE:", "")
								.replace(":", ""),
							eventTime = !eventDate.includes("T") ? "21:55:00Z" :
								eventDate.split("T")[1].replace(/([0-9]{2})([0-9]{2})([0-9]{2})/g, "$1:$2:$3");
						eventDate = eventDate.substring(0, 8)
							.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/g, "$1-$2-$3").trim() + "T" + eventTime.trim();
						eventDate = new Date(eventDate);
						if (eventDate.getTime() < now.getTime() - 864E5) // 24 hours
							continue;
						eventTime = eventDate.toLocaleString("iw-IL", {
							weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
						});

						const courseInfo: string = cal[i].split("CATEGORIES:")[1].split("\n")[0].trim().split(".");
						const courseNum = courseInfo[0]?.replace(/[^0-9]/i, "").trim(),
							semesterNum = courseInfo[1]?.replace(/[^0-9]/i, "").trim();
						const course = (storageData.u_courses.hasOwnProperty(courseNum) && semesterNum.toString() in semesters) ?
							storageData.u_courses[courseNum] + (semesterNum ? ` - ${semesters[semesterNum as "200" | "201" | "202"]}` : "") : courseInfo;

						let eventDescription: string = cal[i].split("DESCRIPTION:")[1].split("CLASS:")[0]
							.replace(/\\n/g, ' ').replace(/\\,/g, ',').trim();
						eventDescription = 95 < eventDescription.length ? eventDescription.slice(0, 90) + "..." : eventDescription;

						let finishedEh = false;
						if (storageData.cal_finished.hasOwnProperty(eventID.toString())) {
							finishedEh = true;
							finishedEvents[eventID.toString()] = 0;
						}
						const event: HWAssignment = {
							name: eventTitle,
							description: eventDescription,
							course: course,
							finalDate: eventTime,
							newEh: eventID > storageData.calendar_max,
							goToFunc: openMoodle(eventID, eventDate.getTime()),
							eventID: eventID,
							timestamp: eventDate.getTime(),
							sys: "moodle",
							done: finishedEh,
						};
						finishedEh ? finishedAssignmentsList.push(event) : newAssignmentsList.push(event);
					}
				}
			}
			chrome.storage.local.set({cal_finished: finishedEvents}, () => {
				if (chrome.runtime.lastError)
					console.error("TE_cal_moodle: " + chrome.runtime.lastError.message);
			});
			updateCalendar(maxEventID, calendar.removeCalendarAlert(storageData.cal_seen));
			resolve({new_list: newAssignmentsList, finished_list: finishedAssignmentsList});

		}).catch(err => {
			console.error(err);
			reject({
				msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
				is_error: true,
			});
		});
	})));
})();
