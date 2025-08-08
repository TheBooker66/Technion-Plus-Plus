'use strict';
import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';

(function () {
	const popup = new CommonPopup(document.title);
	popup.title = "מטלות קרובות - מודל";
	popup.css_list = ["calendar"];
	const calendar = new CommonCalendar(popup, "webwork", document.title);
	popup.popupWrap();
	calendar.calendarWrap();

	calendar.progress(_ => new Promise((resolve, reject) => chrome.storage.local.get({
		webwork_cal: {},
		cal_seen: 0,
		wwcal_update: 0,
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

		const courseMap = {};
		for (let course of Object.values(storageData.webwork_courses))
			courseMap[course.lti] = course.name;
		document.getElementById("lastcheck").style.display = "block";
		let date = new Date(storageData.wwcal_update);
		let fix_date = a => 9 < a ? a : "0" + a;
		document.getElementById("lastcheck").textContent += storageData.wwcal_update ? date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + ", בשעה " + fix_date(date.getHours()) + ":" + fix_date(date.getMinutes()) : "לא ידוע";
		const sortedAssignments = [], webworkCalendarData = storageData.webwork_cal;
		Object.keys(webworkCalendarData).forEach(assignment => {
			sortedAssignments.push([assignment, webworkCalendarData[assignment]]);
		});
		sortedAssignments.sort((a, b) => {
			return a[1].ts === b[1].ts ? a[1].h.localeCompare(b[1].h) : 0 === a[1].ts ? 1 : 0 === b[1].ts || a[1].ts < b[1].ts ? -1 : a[1].ts > b[1].ts ? 1 : 0;
		});
		let newAssignmentsList = [], finishedAssignmentsList = [];
		for (let i = 0; i < sortedAssignments.length; i++) {
			let courseLTI = sortedAssignments[i][0].split("_")[0];
			let assignmentObject = {
				header: sortedAssignments[i][1].h,
				description: "",
				course: courseMap[courseLTI],
				final_date: sortedAssignments[i][1].due,
				is_new: !sortedAssignments[i][1].seen,
				goToFunc: () => chrome.tabs.create({url: `https://moodle24.technion.ac.il/mod/lti/launch.php?id=${courseLTI}`}),
				event: sortedAssignments[i][0],
				timestamp: sortedAssignments[i][1].ts,
				sys: "webwork",
			};
			if (sortedAssignments[i][1].done) finishedAssignmentsList.push(assignmentObject);
			else newAssignmentsList.push(assignmentObject);
			sortedAssignments[i][1].seen = true;
		}
		storageData = calendar.removeCalendarAlert(storageData.cal_seen);
		void chrome.storage.local.set({cal_seen: storageData, webwork_cal: webworkCalendarData});
		resolve({new_list: newAssignmentsList, finished_list: finishedAssignmentsList});
	})));
})();
