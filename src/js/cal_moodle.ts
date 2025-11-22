import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {TE_AutoLogin} from "./service_worker.js";

(async function () {
	function openMoodle(eventID: number, eventTimestamp: number): () => Promise<chrome.tabs.Tab> {
		return async () => {
			try {
				const eventURL = `https://moodle25.technion.ac.il/calendar/view.php?view=day&course=1&time=${eventTimestamp / 1E3}#event_${eventID}`;
				await TE_AutoLogin(true);
				const response = await popup.XHR(eventURL, "document");
				const eventLinks = response.response.querySelectorAll(`.event[data-event-id='${eventID}'] a`);
				if (eventLinks.length) {
					const lastLink = eventLinks[eventLinks.length - 1];
					const url = lastLink.getAttribute("href");
					return await chrome.tabs.create({url: url});
				} else {
					throw new Error("TE_cal_moodle: bad content");
				}
			} catch (err) {
				console.error("Failed to open Moodle event:", err);
				throw err;
			}
		};
	}

	async function initializeCalendarProperties(errorCallback: ({msg, errorEh}: {
		msg: string,
		errorEh: boolean
	}) => void) {
		try {
			const storageData = await chrome.storage.local.get({moodle_cal_prop: ""});

			if (chrome.runtime.lastError) {
				console.error("TE_cal1: " + chrome.runtime.lastError.message);
				return errorCallback({
					msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
					errorEh: true,
				});
			}

			if (storageData.moodle_cal_prop === "") {
				errorCallback({
					msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
					errorEh: true,
				});

				const res = await popup.XHR("https://moodle25.technion.ac.il/calendar/export.php", "document");
				const sessionKey: string = res.response.querySelector("[name='sesskey']").value;
				const exportResponse = await popup.XHR(res.responseURL, "document", "sesskey=" + sessionKey + "&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4");
				const exportResponse2: string = "userid=" + exportResponse.response.getElementById("calendarexporturl").value.split("userid=")[1].split("&preset_what=all")[0];

				await chrome.storage.local.set({moodle_cal_prop: exportResponse2});
				if (chrome.runtime.lastError) {
					console.error("TE_cal2: " + chrome.runtime.lastError);
					errorCallback({
						msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
						errorEh: true,
					});
				} else window.location.reload();
			}
		} catch (err) {
			console.error(err);
		}
	}

	const popup = new CommonPopup("מטלות קרובות - מודל", ["calendar"], document.title);
	const calendar = new CommonCalendar(popup, "moodle", document.title);

	await calendar.progress(() => new Promise(async (resolve, reject) => {
		const storageData = await chrome.storage.local.get({
			cal_seen: 0,
			moodle_cal_finished: [],
			moodle_cal_prop: "",
			moodle_cal_max: 0,
			moodle_cal_courses: {},
			filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
			pinned_assignments: [],
		}) as StorageData;
		if (chrome.runtime.lastError) {
			console.error("TE_cal: " + chrome.runtime.lastError.message);
			reject({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true,
			});
			return;
		}

		if (storageData.moodle_cal_prop === "") {
			TE_AutoLogin(true).then(() => initializeCalendarProperties(reject)).catch(_ => reject({
				msg: "לפני משיכת המטלות הראשונית מהמודל יש להכנס אל המודל ולוודא שההתחברות בוצעה באופן תקין.",
				is_error: true,
			}));
			return;
		}

		const calendarData = await popup.XHR("https://moodle25.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&" + storageData.moodle_cal_prop, "text");
		try {
			if ("Invalid authentication" === calendarData.response.trim()) {
				await chrome.storage.local.set({moodle_cal_prop: ""});
				if (chrome.runtime.lastError) console.error("TE_cal_moodle: " + chrome.runtime.lastError);
				TE_AutoLogin(true).then(() => initializeCalendarProperties(reject)).catch(_ => reject({
					msg: "לא ניתן למשוך מטלות מהמודל. נסה שנית מאוחר יותר, אם התקלה נמשכת - צור קשר עם המפתח.",
					is_error: true,
				}));
				return;
			}
			const cal: string[] = calendarData.response.split("BEGIN:VEVENT");
			if (cal.length === 1) {
				await chrome.storage.local.set({
					cal_seen: await calendar.removeCalendarAlert(storageData.cal_seen), moodle_cal_max: 0,
				});
				resolve({
					new_list: [],
					finished_list: [],
				});
				return;
			}
			const ONE_DAY = 864E5, now = new Date(), semesters = {
				"200": "חורף",
				"201": "אביב",
				"202": "קיץ",
			};
			let maxEventID = 0, finishedEvents: number[] = [],
				newAssignmentsList: HWAssignment[] = [], finishedAssignmentsList: HWAssignment[] = [];
			for (let i = 1; i < cal.length; i++) {
				const eventID = parseInt(cal[i].split("UID:")[1].split("@moodle")[0]);
				maxEventID = eventID > maxEventID ? eventID : maxEventID;

				if (!cal[i].includes("CATEGORIES")) continue;

				const eventTitle = cal[i].split("SUMMARY:")[1].split("\n")[0].trim();
				if ((storageData.filter_toggles.appeals && eventTitle.includes("ערעור"))
					|| (storageData.filter_toggles.zooms && (eventTitle.includes("זום") || eventTitle.includes("Zoom") || eventTitle.includes("zoom") || eventTitle.includes("הרצא") || eventTitle.includes("תרגול")))
					|| (storageData.filter_toggles.attendance && (eventTitle.includes("נוכחות") || eventTitle.includes("Attendance") || eventTitle.includes("attendance")))
					|| (storageData.filter_toggles.reserveDuty && eventTitle.includes("מילואים")))
					continue;

				const titleWords = eventTitle.split(" ");
				if (!("opens" !== titleWords[titleWords.length - 1] && "opens)" !== titleWords[titleWords.length - 1])) continue;

				let eventDateStr: string = cal[i].split("DTSTART")[1].split("\n")[0]
						.replace(";VALUE=DATE:", "").replace(":", ""),
					eventTimeStr: string = eventDateStr.includes("T") ? eventDateStr.split("T")[1]
						.replace(/([0-9]{2})([0-9]{2})([0-9]{2})/g, "$1:$2:$3") : "21:55:00Z";
				eventDateStr = eventDateStr.substring(0, 8)
					.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/g, "$1-$2-$3").trim() + "T" + eventTimeStr.trim();
				const eventDate = new Date(eventDateStr);
				if (eventDate.getTime() < now.getTime() - ONE_DAY) continue;

				const eventTimeFinal = eventDate.toLocaleString("he-IL", {
					weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
				});

				const courseInfo: string[] = cal[i].split("CATEGORIES:")[1].split("\n")[0].trim().split(".");
				const courseNum = courseInfo[0]?.replace(/[^0-9]/i, "").trim(),
					semesterNum = (courseInfo[2] ?? courseInfo[1])?.replace(/[^0-9]/i, "").trim();
				const course = (storageData.moodle_cal_courses.hasOwnProperty(courseNum) && semesterNum.toString() in semesters) ?
					storageData.moodle_cal_courses[courseNum] + (semesterNum ? ` - ${semesters[semesterNum as "200" | "201" | "202"]}` : "")
					: courseInfo.toString();

				let eventDescription: string = cal[i].split("DESCRIPTION:")[1].split("CLASS:")[0]
					.replace(/\\n/g, ' ').replace(/\\,/g, ',').trim();
				eventDescription = 95 < eventDescription.length ? eventDescription.slice(0, 90) + "..." : eventDescription;

				const finishedEh = (storageData.moodle_cal_finished as number[]).includes(eventID);
				if (finishedEh) finishedEvents.push(eventID);

				const event: HWAssignment = {
					name: eventTitle,
					description: eventDescription,
					course: course,
					finalDate: eventTimeFinal,
					newEh: eventID > storageData.moodle_cal_max,
					goToFunc: openMoodle(eventID, eventDate.getTime()),
					eventID: eventID,
					timestamp: eventDate.getTime(),
					sys: "moodle",
					done: finishedEh,
					pinned: storageData.pinned_assignments.includes(eventID),
				};
				finishedEh ? finishedAssignmentsList.push(event) : newAssignmentsList.push(event);
			}
			await chrome.storage.local.set({
				cal_seen: await calendar.removeCalendarAlert(storageData.cal_seen),
				moodle_cal_finished: finishedEvents,
				moodle_cal_max: maxEventID,
			});
			if (chrome.runtime.lastError) console.error("TE_cal_moodle: " + chrome.runtime.lastError);
			newAssignmentsList.sort((a, b) => (a.timestamp - b.timestamp) || a.name.localeCompare(b.name));
			finishedAssignmentsList.sort((a, b) => (a.timestamp - b.timestamp) || a.name.localeCompare(b.name));
			resolve({new_list: newAssignmentsList, finished_list: finishedAssignmentsList});
		} catch (err) {
			console.error(err);
			reject({
				msg: "אירעה שגיאה בניסיון לגשת אל שרת ה-Moodle, אנא נסה שנית מאוחר יותר.",
				is_error: true,
			});
		}
	}));
})();
