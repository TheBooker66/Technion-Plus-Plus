import {addAssignmentsToList} from "./organizer.js";
import {CommonPopup} from "./common_popup.js";

export class CommonCalendar {
	private readonly common: CommonPopup;
	private readonly system: HWSystem;
	private readonly flags: { moodle: 1; cs: 2; webwork: 4 };
	private readonly organiser: string;

	constructor(popup: CommonPopup, system: "moodle" | "cs" | "webwork", organiser: string) {
		this.common = popup;
		this.system = system;
		this.flags = {moodle: 1, cs: 2, webwork: 4};
		this.organiser = organiser;

		if (this.organiser === "ארגונית++") return;

		const tabButtons = document.getElementById("tabs")?.querySelectorAll("div");
		if (!tabButtons) return;

		const assignmentTabs = [document.getElementById("new_assignments"), document.getElementById("finished_assignments")];
		for (let tabIndex = 0; tabIndex < tabButtons.length; tabIndex++) {
			tabButtons[tabIndex].addEventListener("click", () => {
				for (let listIndex = 0; listIndex < 2; listIndex++) {
					tabButtons[listIndex].className = listIndex === tabIndex ? "tab current" : "tab";
					assignmentTabs[listIndex]!.style.display = listIndex === tabIndex ? "block" : "none";
				}
			});
		}
	}

	removeCalendarAlert(currentAlertFlag: number) {
		if (this.organiser === "ארגונית++" || this.system === "ua") currentAlertFlag &= -12;
		else currentAlertFlag &= ~this.flags[this.system];

		if (!navigator.userAgent.includes("Android") && !currentAlertFlag)
			void chrome.action.setBadgeText({text: ""});
		return currentAlertFlag;
	}

	insertAssignments(newAssignmentsList: HWAssignment[], finishedAssignmentsList: HWAssignment[]) {
		const createAssignmentElement =
			(assignmentData: HWAssignment, template: DocumentFragment, containerId: "new_assignments" | "finished_assignments") => {
				const newAssigment = template.querySelector(".list_item") as HTMLDivElement;
				if (assignmentData.newEh) newAssigment.classList.add("starred");
				newAssigment.querySelector(".assignment_header")!.textContent = assignmentData.name;
				newAssigment.querySelector(".course_name")!.textContent += assignmentData.course;
				newAssigment.querySelector(".assignment_description")!.textContent = assignmentData.description;
				newAssigment.querySelector(".end_time")!.textContent += assignmentData.finalDate;
				const actionButtons = newAssigment.querySelectorAll("img");
				actionButtons[1].addEventListener("click", () => toggle(this.system, assignmentData.eventID, newAssigment, 1));
				actionButtons[2].addEventListener("click", () => toggle(this.system, assignmentData.eventID, newAssigment, 0));
				actionButtons[0].title = "moodle" === this.system ? "עבור להגשה במודל" : "עבור לאתר הקורס";
				actionButtons[0].addEventListener("click", () => openAssignment(newAssigment, assignmentData.goToFunc));
				newAssigment.querySelector(".assignment_header")!.addEventListener("click", () => openAssignment(newAssigment, assignmentData.goToFunc));
				document.getElementById(containerId)?.appendChild(newAssigment);
			};
		this.common.useTemplatesFile("calendar", (documentContext: Document) => {
			const assignmentTemplate = this.common.loadTemplate("assignment", documentContext);
			newAssignmentsList.forEach(assignment =>
				createAssignmentElement(assignment, assignmentTemplate.cloneNode(true) as DocumentFragment, "new_assignments"));
			finishedAssignmentsList.forEach(assignment =>
				createAssignmentElement(assignment, assignmentTemplate.cloneNode(true) as DocumentFragment, "finished_assignments"));
			0 === newAssignmentsList.length + finishedAssignmentsList.length && insertMessage("לא נמצאו אירועים קרובים לתצוגה.", false);
			stopSpinning();
		});
	}

	progress(promiseCreator: () => Promise<{ new_list: HWAssignment[], finished_list: HWAssignment[] }>) {
		if (this.organiser === "ארגונית++")
			addAssignmentsToList(promiseCreator, this.system);
		else promiseCreator()
			.then(result => this.insertAssignments(result.new_list, result.finished_list))
			.catch((err: any) => insertMessage(err.msg, err.is_error));
	}
}


function checkForEmpty() {
	["new_assignments", "finished_assignments"].forEach(tabID => {
		const tab = document.getElementById(tabID);
		if (!tab) return;
		tab.childNodes.length === 0 ? tab.classList.add("empty_list") : tab.classList.remove("empty_list");
	});
}

function stopSpinning() {
	document.getElementById("spinner")!.style.display = "none";
	checkForEmpty();
}

function insertMessage(msg: string, errorEh: boolean) {
	stopSpinning();
	const messageElement = document.getElementById("error")!.appendChild(document.createElement("div"));
	messageElement.className = errorEh ? "error_bar" : "attention";
	messageElement.textContent = msg;
}

export function toggle(sys: HWSystem, event: number, item: HTMLDivElement, VorX: 0 | 1) {
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
	[document.getElementById("new_assignments"), document.getElementById("finished_assignments")][VorX]?.appendChild(item);
	checkForEmpty();
}

function openAssignment(assignmentItem: HTMLDivElement, openFunction: () => Promise<chrome.tabs.Tab>) {
	const spinner = assignmentItem.querySelector("img") as HTMLImageElement;
	spinner.style.display = "none";
	spinner.parentElement?.classList.add("small_spinner");
	openFunction().catch(() => {
		assignmentItem.style.borderRadius = "3px";
		assignmentItem.style.backgroundColor = "rgb(215, 0, 34, 0.8)" + "!important";
		setTimeout(() => assignmentItem.style.backgroundColor = "", 1E3);
	}).finally(() => {
		spinner.style.display = "block";
		spinner.parentElement?.classList.remove("small_spinner");
	});
}
