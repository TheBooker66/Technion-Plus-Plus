'use strict';
import {addAssignmentsToList} from "./organizer.js";

export class CommonCalendar {
	constructor(popup, system, type) {
		this.common = popup;
		this.type = type;
		this.name = system;
		this.w_days = "ראשון שני שלישי רביעי חמישי שישי שבת".split(" ");
		this.flags = {moodle: 1, cs: 2, mathnet: 4, webwork: 8};
	}

	calendarWrap() {
		if (this.type === "ארגונית++") return;
		const assignmentTabs = [document.getElementById("new_assignments"), document.getElementById("finished_assignments")],
			tabButtons = document.getElementById("tabs").getElementsByTagName("div");
		for (let tabIndex = 0; tabIndex < tabButtons.length; tabIndex++) {
			tabButtons[tabIndex].addEventListener("click", () => {
				for (let listIndex = 0; listIndex < 2; listIndex++) {
					tabButtons[listIndex].className = listIndex === tabIndex ? "tab current" : "tab";
					assignmentTabs[listIndex].style.display = listIndex === tabIndex ? "block" : "none";
				}
			});
		}
	}

	removeCalendarAlert(currentAlertFlags) {
		if (this.type === "ארגונית++") currentAlertFlags &= -12; else currentAlertFlags &= ~this.flags[this.name];
		if (!navigator.userAgent.includes("Android") && !currentAlertFlags) void chrome.action.setBadgeText({text: ""});
		return currentAlertFlags;
	}

	insertAssignments(newAssignmentsList, finishedAssignmentsList) {
		const createAssignmentElement = (assignmentData, templateNode, containerId) => {
			templateNode = templateNode.querySelector(".list_item");
			if (assignmentData.is_new) templateNode.classList.add("starred");
			templateNode.querySelector(".assignment_header").textContent = assignmentData.header;
			templateNode.querySelector(".course_name").textContent += assignmentData.course;
			templateNode.querySelector(".assignment_description").textContent = assignmentData.description;
			templateNode.querySelector(".end_time").textContent += assignmentData.final_date;
			const actionButtons = templateNode.querySelectorAll("img");
			actionButtons[1].addEventListener("click", () => toggle(this.name, assignmentData.event, templateNode, 1));
			actionButtons[2].addEventListener("click", () => toggle(this.name, assignmentData.event, templateNode, 0));
			actionButtons[0].title = "moodle" === this.name ? "עבור להגשה במודל" : "עבור לאתר הקורס";
			actionButtons[0].addEventListener("click", () => openAssignment(templateNode, assignmentData.goToFunc));
			templateNode.querySelector(".assignment_header").addEventListener("click", () => openAssignment(templateNode, assignmentData.goToFunc));
			document.getElementById(containerId).appendChild(templateNode);
		};
		this.common.useTemplatesFile("calendar", templateHtml => {
			const assignmentTemplate = this.common.loadTemplate("assignment", templateHtml);
			newAssignmentsList.forEach(f => createAssignmentElement(f, assignmentTemplate.cloneNode(true), "new_assignments"));
			finishedAssignmentsList.forEach(f => createAssignmentElement(f, assignmentTemplate.cloneNode(true), "finished_assignments"));
			0 === newAssignmentsList.length + finishedAssignmentsList.length && insertMessage("לא נמצאו אירועים קרובים לתצוגה.", false);
			stopSpinning();
		});
	}

	progress(promiseCreator) {
		if (this.type === "ארגונית++") addAssignmentsToList(promiseCreator, this.name);
		else promiseCreator().then(b => this.insertAssignments(b.new_list, b.finished_list)).catch(err => insertMessage(err.msg, err.is_error));
	}
}


function checkForEmpty() {
	["new_assignments", "finished_assignments"].forEach(tab => {
		tab = document.getElementById(tab);
		tab.childNodes.length === 0 ? tab.classList.add("empty_list") : tab.classList.remove("empty_list");
	});
}

function stopSpinning() {
	document.getElementById("spinner").style.display = "none";
	checkForEmpty();
}

function insertMessage(msg, errorEh) {
	stopSpinning();
	const messageElement = document.getElementById("error").appendChild(document.createElement("div"));
	messageElement.className = errorEh ? "error_bar" : "attention";
	messageElement.textContent = msg;
}

export function toggle(sys, event, item, VorX) {
	if (sys === "ua") {
		chrome.storage.local.get({user_agenda: {}}, storageData => {
			if (chrome.runtime.lastError) console.error("TE_organize7: " + chrome.runtime.lastError.message);
			else {
				storageData.user_agenda[event].done = 1 - storageData.user_agenda[event].done;
				void chrome.storage.local.set({user_agenda: storageData.user_agenda});
			}
		});
	} else {
		let calendar = {
			moodle: "cal_finished",
			cs: "cs_cal_finished",
			webwork: "webwork_cal",
		}[sys];
		chrome.storage.local.get(calendar, storageData => {
			if (chrome.runtime.lastError)
				console.error("TE_cal7: " + chrome.runtime.lastError.message);
			else {
				if (storageData[calendar].hasOwnProperty(event.toString())) delete storageData[calendar][event.toString()];
				else storageData[calendar][event.toString()] = 0;
				void chrome.storage.local.set({[calendar]: storageData[calendar]});
			}
		});
	}
	[document.getElementById("new_assignments"), document.getElementById("finished_assignments")][VorX].appendChild(item);
	checkForEmpty();
}

function openAssignment(assignmentItem, openFunction) {
	const spinner = assignmentItem.querySelector("img");
	spinner.style.display = "none";
	spinner.parentNode.classList.add("small_spinner");
	openFunction().catch(_ => {
		assignmentItem.style.borderRadius = "3px";
		assignmentItem.style.backgroundColor = "rgb(215, 0, 34, 0.8)" + "!important";
		setTimeout(() => assignmentItem.style.backgroundColor = "", 1E3);
	}).finally(() => {
		spinner.style.display = "block";
		spinner.parentNode.classList.remove("small_spinner");
	});
}
