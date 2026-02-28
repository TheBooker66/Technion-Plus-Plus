import {CommonPopup} from "./common_popup.js";
import {CommonCalendar} from "./common_calendar.js";
import {reverseString, xorStrings} from "./utils.js";

const popup = new CommonPopup('מטלות קרובות - מדמ"ח', ["calendar"], document.title);
const calendar = new CommonCalendar(popup, "cs", document.title);

await calendar.progress(async () => {
	const storageData: StorageData = await chrome.storage.local.get({
		cal_seen: 0,
		cs_cal_finished: [],
		cs_cal_seen: {},
		cs_cal_pass: "",
		uidn_arr: ["", ""],
		pinned_assignments: [],
	});

	const calendarPass = reverseString(xorStrings(`${storageData.uidn_arr[0]}`, storageData.uidn_arr[1]));
	if (calendarPass.length === 0 || storageData.cs_cal_pass === "")
		throw new Error("לא הגדרת מספר זהות/סיסמת יומן; יש למלא פרטים אלו בהגדרות התוסף.");

	const calendarUrl = `https://grades.cs.technion.ac.il/cal/${calendarPass}/${encodeURIComponent(storageData.cs_cal_pass)}`;
	let eventSections: string[];
	try {
		const responseData: {response: string; responseURL: string} = await popup.XHR(calendarUrl, "text");
		eventSections = responseData.response.split("BEGIN:VEVENT");
	} catch (errCode) {
		const errorMessages = [
			'אירעה שגיאה בניסיון לגשת אל שרת הפקולטה למדמ"ח, אנא נסה שנית מאוחר יותר.',
			'השרת של הפקולטה למדמ"ח מסרב לקבל את סיסמת היומן שלך. הוראות לחידוש סיסמת יומן ה-GR++ נמצאות בהגדרות התוסף.',
		];
		const errorMessage = errCode === 401 ? errorMessages[1] : errorMessages[0];
		// eslint-disable-next-line preserve-caught-error
		throw new Error(errorMessage);
	}
	if (eventSections.length === 1) return {new_list: [], finished_list: []};

	const THIRTY_DAYS = 2592e6,
		currentTime = Date.now(),
		DAYS = "ראשון שני שלישי רביעי חמישי שישי שבת".split(" "),
		regexPatterns = {
			summary: /SUMMARY;LANGUAGE=en-US:(.+)/,
			banned: /Exam|moed| - Late|הרצאה|תרגול/,
			uid: /UID:[0-9.]+HW([0-9]+)/,
			time: /(?<Y>\d{4})(?<M>\d{2})(?<D>\d{2})(T(?<TH>\d{2})(?<TM>\d{2}))?/,
			description: /DESCRIPTION;LANGUAGE=en-US:([^,]+)/,
			url: /URL:(.+)/,
		};
	const finishedItems: number[] = [],
		seenItems: {[key: string]: string} = {};
	let toDoList: HWAssignment[] = [],
		finishedList: HWAssignment[] = [],
		courseName = "";
	for (let i = 1; i < eventSections.length; i++) {
		const summary = eventSections[i].match(regexPatterns.summary)![1];
		let trimmedSummary = summary.split("(")[0].trim();
		if (regexPatterns.banned.test(trimmedSummary)) continue;

		if (eventSections[i].includes("icspasswordexpired") || eventSections[i].includes("icspasswordexpired1")) {
			throw new Error('סיסמת היומן של הצגת המטלות של מדמ"ח פגה! כנס בדחיפות להגדרות התוסף להוראות חידוש הסיסמה!');
		}

		const eventUIDMatch = eventSections[i].match(regexPatterns.uid)?.[1];
		if (!eventUIDMatch) continue;
		const eventID = parseInt(eventUIDMatch);
		if (isNaN(eventID)) continue;

		const timeMatch = eventSections[i].match(regexPatterns.time)!.groups as {[key: string]: string};
		const dueDate = new Date(
			`${timeMatch.Y}-${timeMatch.M}-${timeMatch.D}T${timeMatch.TH || 23}:${timeMatch.TM || 59}:00+03:00`
		);
		if (dueDate.getTime() < currentTime || dueDate.getTime() > currentTime + THIRTY_DAYS) continue;

		if (eventSections[i].includes(".PHW")) {
			if (dueDate.getTime() > currentTime) {
				trimmedSummary = trimmedSummary.replace("פרסום של ", "");
				if (Object.hasOwn(seenItems, courseName))
					seenItems[courseName] = seenItems[courseName].replace(`[[${trimmedSummary}]]`, "");
				toDoList = toDoList.filter((element) => element.eventID !== eventID);
				finishedList = finishedList.filter((element) => element.eventID !== eventID);
			}
			continue;
		}
		const formattedDate = `יום ${DAYS[dueDate.getDay()]}, ${timeMatch.D}.${timeMatch.M}.${timeMatch.Y}`;

		const description = (eventSections[i].match(regexPatterns.description) as RegExpMatchArray)[1],
			eventURL = (eventSections[i].match(regexPatterns.url) as RegExpMatchArray)[1];

		courseName = summary.split("(")[1].split(")")[0];
		if (!Object.hasOwn(seenItems, courseName)) seenItems[courseName] = "";
		seenItems[courseName] += `[[${trimmedSummary}]]`;

		const newEventEh = !(
			Object.hasOwn(storageData.cs_cal_seen, courseName) &&
			storageData.cs_cal_seen[courseName].includes(`[[${trimmedSummary}]]`)
		);

		const finishedEh = storageData.cs_cal_finished.includes(eventID);
		if (finishedEh) finishedItems.push(eventID);

		const Assignment: HWAssignment = {
			name: trimmedSummary,
			description: description,
			finalDate: formattedDate,
			newEh: newEventEh,
			goToFunc: () => window.open(eventURL, "_blank"),
			eventID: eventID,
			timestamp: dueDate.getTime(),
			sys: "cs",
			course: courseName,
			done: finishedEh,
			pinned: storageData.pinned_assignments.includes(eventID),
		};
		if (finishedEh) finishedList.push(Assignment);
		else toDoList.push(Assignment);
	}
	await chrome.storage.local.set({
		cal_seen: await calendar.removeCalendarAlert(storageData.cal_seen),
		cs_cal_finished: finishedItems,
		cs_cal_seen: seenItems,
		cs_cal_update: currentTime,
	});
	toDoList.sort((a, b) => a.timestamp - b.timestamp || a.name.localeCompare(b.name));
	finishedList.sort((a, b) => a.timestamp - b.timestamp || a.name.localeCompare(b.name));
	return {new_list: toDoList, finished_list: finishedList};
});
