import {CommonPopup} from "./common_popup.js";
import {CommonCalendar} from "./common_calendar.js";

const popup = new CommonPopup("מטלות קרובות - וובוורק", ["calendar"], document.title);
const calendar = new CommonCalendar(popup, "webwork", document.title);

await calendar.progress(
	() =>
		new Promise(async (resolve) => {
			const storageData: StorageData = await chrome.storage.local.get({
				cal_seen: 0,
				webwork_cal_events: {},
				webwork_cal_courses: {},
				webwork_cal_update: 0,
				pinned_assignments: [],
			});

			const courseMap: {[key: string]: string} = {};
			for (const course of Object.values(storageData.webwork_cal_courses)) courseMap[course.lti] = course.name;

			const date = new Date(storageData.webwork_cal_update);
			document.getElementById("last_check")!.style.display = "block";
			document.getElementById("last_check")!.textContent += storageData.webwork_cal_update
				? ` ${date.toLocaleDateString("he-IL", {
						year: "numeric",
						month: "numeric",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}.`
				: " לא ידוע";

			const webworkCalendarData = storageData.webwork_cal_events,
				sortedAssignments: [number, {h: string; due: string; ts: number; seen: boolean; done: boolean}][] = [],
				newAssignmentsList: HWAssignment[] = [],
				finishedAssignmentsList: HWAssignment[] = [];
			Object.keys(webworkCalendarData).forEach((assignment) => {
				sortedAssignments.push([parseInt(assignment), webworkCalendarData[assignment]]);
			});
			sortedAssignments.sort((a, b) => {
				return a[1].ts - b[1].ts || a[1].h.localeCompare(b[1].h);
			});
			for (const assignment of sortedAssignments) {
				const courseLTI = assignment[0].toString().substring(0, assignment[0].toString().indexOf("000"));
				const eventID = assignment[0],
					eventURL = `https://moodle25.technion.ac.il/mod/lti/launch.php?id=${courseLTI}`;
				const assignmentObject: HWAssignment = {
					name: assignment[1].h,
					description: "",
					course: courseMap[courseLTI],
					finalDate: assignment[1].due,
					newEh: !assignment[1].seen,
					goToFunc: () => window.open(eventURL, "_blank"),
					eventID: eventID,
					timestamp: assignment[1].ts,
					sys: "webwork",
					done: assignment[1].done,
					pinned: storageData.pinned_assignments.includes(eventID),
				};
				if (assignment[1].done) finishedAssignmentsList.push(assignmentObject);
				else newAssignmentsList.push(assignmentObject);
				assignment[1].seen = true;
			}
			await chrome.storage.local.set({
				cal_seen: await calendar.removeCalendarAlert(storageData.cal_seen),
				webwork_cal_events: webworkCalendarData,
			});
			resolve({new_list: newAssignmentsList, finished_list: finishedAssignmentsList});
		})
);
