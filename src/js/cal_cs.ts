import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {reverseString, xorStrings} from './utils.js';

(function () {
	const popup = new CommonPopup("מטלות קרובות - מדמ\"ח", ["calendar"], document.title);
	const calendar = new CommonCalendar(popup, "cs", document.title);

	calendar.progress(() => new Promise((resolve, reject) => chrome.storage.local.get({
		cs_cal_finished: {},
		cs_cal_seen: {},
		uidn_arr: ["", ""],
		cs_pass: "",
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
		if (calendarPass.length === 0 || storageData.cs_pass === "") {
			reject({
				msg: "לא הגדרת מספר זהות/סיסמת יומן; יש למלא פרטים אלו בהגדרות התוסף.",
				is_error: true,
			});
			return;
		}
		const calendarUrl = `https://grades.cs.technion.ac.il/cal/${calendarPass}/${encodeURIComponent(storageData.cs_pass)}`;
		popup.XHR(calendarUrl, "text").then((responseData: { response: string, responseURL: string }) => {
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
			let finishedItems: { [key: string]: string | boolean } = {}, seenItems: { [key: string]: string } = {},
				toDoList: HWAssignment[] = [], finishedList: HWAssignment[] = [], courseName = "";
			for (let i = 1; i < eventSections.length; i++) {
				const eventSummary = (eventSections[i].match(regexPatterns.summary) as RegExpMatchArray)[1];
				let parsedEvent = eventSummary.split("(")[0].trim();
				if (regexPatterns.banned.test(parsedEvent)) continue;

				const eventID = (eventSections[i].match(regexPatterns.uid) as RegExpMatchArray)[1] || eventSummary,
					timeMatchGroups = (eventSections[i].match(regexPatterns.time) as RegExpMatchArray).groups as {
						[key: string]: string
					},
					eventDate = new Date(`${timeMatchGroups.Y}-${timeMatchGroups.M}-${timeMatchGroups.D}T${timeMatchGroups.TH || 23}:${timeMatchGroups.TM || 59}:00+03:00`);
				if (eventID.includes(".PHW")) {
					if (eventDate.getTime() > currentTime) {
						let newEventUID = eventID.replace(".PHW", ".HW");
						parsedEvent = parsedEvent.replace("פרסום של ", "");
						seenItems.hasOwnProperty(courseName) && (seenItems[courseName] = seenItems[courseName].replace("[[" + parsedEvent + "]]", ""));
						toDoList = toDoList.filter(element => element.eventID !== parseInt(newEventUID));
						finishedList = finishedList.filter(element => element.eventID !== parseInt(newEventUID));
					}
					continue;
				}
				if (eventDate.getTime() < currentTime || eventDate.getTime() > currentTime + 2592E6) continue;

				if (eventID === "icspasswordexpires" || eventID === "icspasswordexpires1") {
					if (eventID === "icspasswordexpires")
						reject({
							msg: "תוקף סיסמת הגישה ליומן המטלות של מדמ\"ח יפוג בשבוע הקרוב, הוראות לחידושה נמצאות בהגדרות התוסף.",
							is_error: false,
						});
					continue;
				}
				const days = "ראשון שני שלישי רביעי חמישי שישי שבת".split(" ");
				const formattedDate = "יום " + days[eventDate.getDay()] + ", " + timeMatchGroups.D + "." + timeMatchGroups.M + "." + timeMatchGroups.Y,
					description = (eventSections[i].match(regexPatterns.description) as RegExpMatchArray)[1],
					eventURL = (eventSections[i].match(regexPatterns.url) as RegExpMatchArray)[1],
					finishedEh = storageData.cs_cal_finished.hasOwnProperty(eventID);
				finishedItems[eventID] = !finishedEh;

				courseName = eventSummary.split("(")[1].split(")")[0];
				seenItems.hasOwnProperty(courseName) || (seenItems[courseName] = "");
				seenItems[courseName] += "[[" + parsedEvent + "]]";

				const newEventEh = !(storageData.cs_cal_seen.hasOwnProperty(courseName) &&
					storageData.cs_cal_seen[courseName].includes("[[" + parsedEvent + "]]"));
				const Assignment: HWAssignment = {
					name: parsedEvent,
					description: description,
					finalDate: formattedDate,
					newEh: newEventEh,
					goToFunc: () => new Promise(go => go(chrome.tabs.create({url: eventURL}))),
					eventID: parseInt(eventID),
					timestamp: eventDate.getTime(),
					sys: "cs",
					course: courseName,
					done: finishedEh,
				};
				finishedEh ? finishedList.push(Assignment) : toDoList.push(Assignment);
			}
			void chrome.storage.local.set({
				cs_cal_finished: finishedItems,
				cs_cal_seen: seenItems,
				cal_seen: calendar.removeCalendarAlert(storageData.cal_seen),
				cs_cal_update: currentTime,
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
