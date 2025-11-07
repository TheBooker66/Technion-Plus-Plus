import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';

(async function () {
	const popup = new CommonPopup("מטלות קרובות - וובוורק", ["calendar"], document.title);
	const calendar = new CommonCalendar(popup, "webwork", document.title);

	await calendar.progress(() => new Promise(async (resolve, reject) => {
		const storageData = await chrome.storage.local.get({
			cal_seen: 0,
			webwork_cal_events: {},
			webwork_cal_courses: {},
			webwork_cal_update: 0,
			pinned_assignments: [],
		});
		if (chrome.runtime.lastError) {
			console.error("TE_ww_cal: " + chrome.runtime.lastError.message);
			reject({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true,
			});
			return;
		}

		interface WebworkCourse {
			lti: string,
			name: string,
		}

		const courseMap: { [key: string]: string } = {};
		for (let course of Object.values(storageData.webwork_cal_courses))
			courseMap[(course as WebworkCourse).lti] = (course as WebworkCourse).name;

		const date = new Date(storageData.webwork_cal_update);
		document.getElementById("last_check")!.style.display = "block";
		document.getElementById("last_check")!.textContent += storageData.webwork_cal_update ?
			` ${date.toLocaleDateString('he-IL', {
				year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
			})}.` : " לא ידוע";

		let webworkCalendarData = storageData.webwork_cal_events,
			sortedAssignments: [string, { h: string, due: string, ts: number, seen: boolean, done: boolean }][] = [],
			newAssignmentsList: HWAssignment[] = [], finishedAssignmentsList: HWAssignment[] = [];
		Object.keys(webworkCalendarData).forEach(assignment => {
			sortedAssignments.push([assignment, webworkCalendarData[assignment]]);
		});
		sortedAssignments.sort((a, b) => {
			return (a[1].ts - b[1].ts) || a[1].h.localeCompare(b[1].h);
		});
		for (let i = 0; i < sortedAssignments.length; i++) {
			const assignment = sortedAssignments[i];
			const courseLTI = assignment[0].substring(0, assignment[0].indexOf("000"));
			const eventID = parseInt(assignment[0]);
			const assignmentObject: HWAssignment = {
				name: assignment[1].h,
				description: "",
				course: courseMap[courseLTI],
				finalDate: assignment[1].due,
				newEh: !assignment[1].seen,
				goToFunc: () => chrome.tabs.create({url: `https://moodle25.technion.ac.il/mod/lti/launch.php?id=${courseLTI}`}),
				eventID: eventID,
				timestamp: assignment[1].ts,
				sys: "webwork",
				done: assignment[1].done,
				pinned: (storageData.pinned_assignments as number[]).includes(eventID),
			};
			assignment[1].done ? finishedAssignmentsList.push(assignmentObject) : newAssignmentsList.push(assignmentObject);
			assignment[1].seen = true;
		}
		await chrome.storage.local.set({
			cal_seen: await calendar.removeCalendarAlert(storageData.cal_seen),
			webwork_cal_events: webworkCalendarData,
		});
		resolve({new_list: newAssignmentsList, finished_list: finishedAssignmentsList});
	}));
})();
