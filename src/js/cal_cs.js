'use strict';
import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {reverseString, xorStrings} from './utils.js';

(function () {
	const popup = new CommonPopup(document.title);
	popup.title = "מטלות קרובות - מודל";
	popup.css_list = ["calendar"];
	const calendar = new CommonCalendar(popup, "cs", document.title);
	popup.popupWrap();
	calendar.calendarWrap();

	calendar.progress(_ => new Promise((resolve, reject) => chrome.storage.local.get({
		cs_cal_finished: {},
		cs_cal_seen: {},
		uidn_arr: ["", ""],
		wcpass: "",
		cal_seen: 0,
	}, function (storageData) {
		if (chrome.runtime.lastError) {
			console.error("TE_cs_cal: " + chrome.runtime.lastError.message);
			reject({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true,
			});
			return;
		}
		const calendarPass = reverseString(xorStrings(storageData.uidn_arr[0] + "", storageData.uidn_arr[1]));
		if (calendarPass.length === "" || storageData.wcpass === "") {
			reject({
				msg: "לא הגדרת מספר זהות/סיסמת יומן; יש למלא פרטים אלו בהגדרות התוסף.",
				is_error: true,
			});
			return;
		}
		const calendarUrl = `https://grades.cs.technion.ac.il/cal/${calendarPass}/${encodeURIComponent(storageData.wcpass)}`;
		popup.XHR(calendarUrl, "text").then(responseData => {
			const eventSections = responseData.response.split("BEGIN:VEVENT");
			if (eventSections.length === 1) {
				resolve({new_list: [], finished_list: []});
				return;
			}
			const currentTime = Date.now(), regexPatterns = {
				banned: /Exam|moed| - Late|הרצאה|תרגול/,
				uid: /UID:([0-9.a-zA-Z-]+)/,
				summary: /SUMMARY;LANGUAGE=en-US:(.+)/,
				description: /DESCRIPTION;LANGUAGE=en-US:([^,]+)/,
				url: /URL:(.+)/,
				time: /(?<Y>\d{4})(?<M>\d{2})(?<D>\d{2})(T(?<TH>\d{2})(?<TM>\d{2}))?/,
			};
			let finishedItems = {}, seenItems = {}, toDoList = [], finishedList = [], courseName;
			for (let i = 1; i < eventSections.length; i++) {
				let newEventEh = eventSections[i].match(regexPatterns.summary)[1],
					parsedEvent = newEventEh.split("(")[0].trim();
				if (regexPatterns.banned.test(parsedEvent)) continue;

				let eventID = eventSections[i].match(regexPatterns.uid)[1] || newEventEh,
					timeMatchGroups = eventSections[i].match(regexPatterns.time).groups,
					eventDate = new Date(`${timeMatchGroups.Y}-${timeMatchGroups.M}-${timeMatchGroups.D}T${timeMatchGroups.TH || 23}:${timeMatchGroups.TM || 59}:00+03:00`);
				if (eventID.includes(".PHW")) {
					if (eventDate > currentTime) {
						let newEventUID = eventID.replace(".PHW", ".HW");
						parsedEvent = parsedEvent.replace("פרסום של ", "");
						// noinspection JSUnusedAssignment
						seenItems.hasOwnProperty(courseName) && (seenItems[courseName] = seenItems[courseName].replace("[[" + parsedEvent + "]]", ""));
						toDoList = toDoList.filter(element => element.uid !== newEventUID);
						finishedList = finishedList.filter(element => element.uid !== newEventUID);
					}
					continue;
				}
				if (eventDate < currentTime || eventDate > currentTime + 2592E6) continue;

				if (eventID === "icspasswordexpires" || eventID === "icspasswordexpires1") {
					if (eventID === "icspasswordexpires")
						reject({
							msg: "תוקף סיסמת הגישה ליומן המטלות של מדמ\"ח יפוג בשבוע הקרוב, הוראות לחידושה נמצאות בהגדרות התוסף.",
							is_error: false,
						});
					continue;
				}

				const formattedDate = "יום " + calendar.w_days[eventDate.getDay()] + ", " + timeMatchGroups.D + "." + timeMatchGroups.M + "." + timeMatchGroups.Y,
					description = eventSections[i].match(regexPatterns.description)[1],
					eventURL = eventSections[i].match(regexPatterns.url)[1],
					finishedEh = storageData.cs_cal_finished.hasOwnProperty(eventID);
				finishedItems[eventID] = !finishedEh;

				courseName = newEventEh.split("(")[1].split(")")[0];
				seenItems.hasOwnProperty(courseName) || (seenItems[courseName] = "");
				seenItems[courseName] += "[[" + parsedEvent + "]]";

				newEventEh = !(storageData.cs_cal_seen.hasOwnProperty(courseName) &&
					storageData.cs_cal_seen[courseName].includes("[[" + parsedEvent + "]]"));
				parsedEvent = {
					header: parsedEvent,
					description: description,
					final_date: formattedDate,
					is_new: newEventEh,
					goToFunc: () => new Promise(y => y(chrome.tabs.create({url: eventURL}))),
					event: eventID,
					timestamp: eventDate,
					sys: "cs",
					uid: eventID,
				};
				finishedEh ? finishedList.push(parsedEvent) : toDoList.push(parsedEvent);
			}
			void chrome.storage.local.set({
				cs_cal_finished: finishedItems,
				cs_cal_seen: seenItems,
				cal_seen: calendar.removeCalendarAlert(storageData.cal_seen),
				cscal_update: currentTime,
			});
			toDoList.sort((a, b) => a.timestamp - b.timestamp);
			resolve({new_list: toDoList, finished_list: finishedList});
		}).catch(errCode => {
			const err_msg =
				[
					'אירעה שגיאה בניסיון לגשת אל שרת הפקולטה למדמ"ח, אנא נסה שנית מאוחר יותר.',
					'השרת של הפקולטה למדמ"ח מסרב לקבל את סיסמת היומן שלך. הוראות לחידוש סיסמת יומן ה-GR++ נמצאות בהגדרות התוסף.',
				];
			reject({msg: errCode === 401 ? err_msg[1] : err_msg[0], is_error: true});
		});
	})));
})();
