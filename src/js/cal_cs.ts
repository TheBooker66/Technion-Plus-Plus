import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {reverseString, xorStrings} from './utils.js';

(async function () {
	const popup = new CommonPopup("מטלות קרובות - מדמ\"ח", ["calendar"], document.title);
	const calendar = new CommonCalendar(popup, "cs", document.title);

	await calendar.progress(() => new Promise(async (resolve, reject) => {
		const storageData = await chrome.storage.local.get({
			cal_seen: 0,
			cs_cal_finished: [],
			cs_cal_seen: {},
			cs_cal_pass: "",
			uidn_arr: ["", ""],
		});
		if (chrome.runtime.lastError) {
			console.error("TE_cs_cal: " + chrome.runtime.lastError.message);
			reject({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true,
			});
			return;
		}

		const calendarPass = reverseString(xorStrings(storageData.uidn_arr[0] + "", storageData.uidn_arr[1]));
		if (calendarPass.length === 0 || storageData.cs_cal_pass === "") {
			reject({
				msg: "לא הגדרת מספר זהות/סיסמת יומן; יש למלא פרטים אלו בהגדרות התוסף.",
				is_error: true,
			});
			return;
		}

		const calendarUrl = `https://grades.cs.technion.ac.il/cal/${calendarPass}/${encodeURIComponent(storageData.cs_cal_pass)}`;
		try {
			const responseData: { response: string, responseURL: string } = await popup.XHR(calendarUrl, "text");
			const eventSections = responseData.response.split("BEGIN:VEVENT");
			if (eventSections.length === 1) {
				resolve({new_list: [], finished_list: []});
				return;
			}
			const THIRTY_DAYS = 2592E6, currentTime = Date.now(),
				DAYS = "ראשון שני שלישי רביעי חמישי שישי שבת".split(" "),
				regexPatterns = {
					summary: /SUMMARY;LANGUAGE=en-US:(.+)/,
					banned: /Exam|moed| - Late|הרצאה|תרגול/,
					uid: /UID:[0-9.]+HW([0-9]+)/,
					time: /(?<Y>\d{4})(?<M>\d{2})(?<D>\d{2})(T(?<TH>\d{2})(?<TM>\d{2}))?/,
					description: /DESCRIPTION;LANGUAGE=en-US:([^,]+)/,
					url: /URL:(.+)/,
				};
			let finishedItems: number[] = [], seenItems: { [key: string]: string } = {},
				toDoList: HWAssignment[] = [], finishedList: HWAssignment[] = [], courseName = "";
			for (let i = 1; i < eventSections.length; i++) {
				const summary = eventSections[i].match(regexPatterns.summary)![1];
				let trimmedSummary = summary.split("(")[0].trim();
				if (regexPatterns.banned.test(trimmedSummary)) continue;

				if (eventSections[i].includes("icspasswordexpired") || eventSections[i].includes("icspasswordexpired1")) {
					reject({
						msg: "סיסמת היומן של הצגת המטלות של מדמ\"ח פגה! כנס בדחיפות להגדרות התוסף להוראות חידוש הסיסמה!",
						is_error: true,
					});
					break;
				}

				const eventUIDMatch = eventSections[i].match(regexPatterns.uid)?.[1];
				if (!eventUIDMatch) continue;
				const eventID = parseInt(eventUIDMatch);
				if (isNaN(eventID)) continue;

				const timeMatch = eventSections[i].match(regexPatterns.time)!.groups as { [key: string]: string };
				const dueDate = new Date(`${timeMatch.Y}-${timeMatch.M}-${timeMatch.D}T${timeMatch.TH || 23}:${timeMatch.TM || 59}:00+03:00`);
				if (dueDate.getTime() < currentTime || dueDate.getTime() > currentTime + THIRTY_DAYS) continue;

				if (eventSections[i].includes(".PHW")) {
					if (dueDate.getTime() > currentTime) {
						trimmedSummary = trimmedSummary.replace("פרסום של ", "");
						if (seenItems.hasOwnProperty(courseName))
							(seenItems[courseName] = seenItems[courseName].replace("[[" + trimmedSummary + "]]", ""));
						toDoList = toDoList.filter(element => element.eventID !== eventID);
						finishedList = finishedList.filter(element => element.eventID !== eventID);
					}
					continue;
				}
				const formattedDate = "יום " + DAYS[dueDate.getDay()] + ", " + timeMatch.D + "." + timeMatch.M + "." + timeMatch.Y;

				const description = (eventSections[i].match(regexPatterns.description) as RegExpMatchArray)[1],
					eventURL = (eventSections[i].match(regexPatterns.url) as RegExpMatchArray)[1];

				courseName = summary.split("(")[1].split(")")[0];
				seenItems.hasOwnProperty(courseName) || (seenItems[courseName] = "");
				seenItems[courseName] += "[[" + trimmedSummary + "]]";

				const newEventEh = !(storageData.cs_cal_seen.hasOwnProperty(courseName) &&
					storageData.cs_cal_seen[courseName].includes("[[" + trimmedSummary + "]]"));

				const finishedEh = (storageData.cs_cal_finished as number[]).includes(eventID);
				if (finishedEh) finishedItems.push(eventID);

				const Assignment: HWAssignment = {
					name: trimmedSummary,
					description: description,
					finalDate: formattedDate,
					newEh: newEventEh,
					goToFunc: () => new Promise(go => go(chrome.tabs.create({url: eventURL}))),
					eventID: eventID,
					timestamp: dueDate.getTime(),
					sys: "cs",
					course: courseName,
					done: finishedEh,
				};
				finishedEh ? finishedList.push(Assignment) : toDoList.push(Assignment);
			}
			await chrome.storage.local.set({
				cal_seen: await calendar.removeCalendarAlert(storageData.cal_seen),
				cs_cal_finished: finishedItems,
				cs_cal_seen: seenItems,
				cs_cal_update: currentTime,
			});
			toDoList.sort((a, b) => a.timestamp - b.timestamp);
			resolve({new_list: toDoList, finished_list: finishedList});
		} catch (errCode) {
			const err_msg =
				[
					'אירעה שגיאה בניסיון לגשת אל שרת הפקולטה למדמ"ח, אנא נסה שנית מאוחר יותר.',
					'השרת של הפקולטה למדמ"ח מסרב לקבל את סיסמת היומן שלך. הוראות לחידוש סיסמת יומן ה-GR++ נמצאות בהגדרות התוסף.',
				];
			reject({msg: errCode === 401 ? err_msg[1] : err_msg[0], is_error: true});
		}
	}));
})();
