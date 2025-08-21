import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {HWAssignment} from './utils.js';

(function () {
	const popup = new CommonPopup("מטלות קרובות - וובוורק", ["calendar"], document.title);
	const calendar = new CommonCalendar(popup, "webwork", document.title);

	calendar.progress(() => new Promise((resolve, reject) => chrome.storage.local.get({
		webwork_cal: {},
		cal_seen: 0,
		ww_cal_update: 0,
		webwork_courses: {},
	}, function (storageData) {
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
		for (let course of Object.values(storageData.webwork_courses))
			courseMap[(course as WebworkCourse).lti] = (course as WebworkCourse).name;

		let date = new Date(storageData.ww_cal_update),
			fixDate = (num: number) => 9 < num ? num : "0" + num;
		document.getElementById("lastcheck")!.style.display = "block";
		document.getElementById("lastcheck")!.textContent += storageData.ww_cal_update ? date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + ", בשעה " + fixDate(date.getHours()) + ":" + fixDate(date.getMinutes()) : "לא ידוע";

		let webworkCalendarData = storageData.webwork_cal,
			sortedAssignments: [string, { h: string, due: string, ts: number, seen: boolean, done: boolean }][] = [],
			newAssignmentsList: HWAssignment[] = [], finishedAssignmentsList: HWAssignment[] = [];
		Object.keys(webworkCalendarData).forEach(assignment => {
			sortedAssignments.push([assignment, webworkCalendarData[assignment]]);
		});
		sortedAssignments.sort((a, b) => {
			return a[1].ts === b[1].ts ? a[1].h.localeCompare(b[1].h) : 0 === a[1].ts ? 1 : 0 === b[1].ts || a[1].ts < b[1].ts ? -1 : a[1].ts > b[1].ts ? 1 : 0;
		});
		for (let i = 0; i < sortedAssignments.length; i++) {
			const assignment = sortedAssignments[i];
			const courseLTI = assignment[0].split("_")[0];
			const assignmentObject: HWAssignment = {
				name: assignment[1].h,
				description: "",
				course: courseMap[courseLTI],
				finalDate: assignment[1].due,
				newEh: !assignment[1].seen,
				goToFunc: () => chrome.tabs.create({url: `https://moodle24.technion.ac.il/mod/lti/launch.php?id=${courseLTI}`}),
				eventID: parseInt(assignment[0]),
				timestamp: assignment[1].ts,
				sys: "webwork",
			};
			assignment[1].done ? finishedAssignmentsList.push(assignmentObject) : newAssignmentsList.push(assignmentObject);
			assignment[1].seen = true;
		}
		void chrome.storage.local.set({
			cal_seen: calendar.removeCalendarAlert(storageData.cal_seen), webwork_cal: webworkCalendarData,
		});
		resolve({new_list: newAssignmentsList, finished_list: finishedAssignmentsList});
	})));
})();
