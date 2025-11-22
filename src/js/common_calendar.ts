import {addAssignmentsToList} from "./organizer.js";
import {resetBadge} from "./utils.js";
import {CommonPopup} from "./common_popup.js";

export class CommonCalendar {
	private readonly common: CommonPopup;
	private readonly system: HWSystem;
	private readonly flags: { moodle: 1; cs: 2; webwork: 4 };
	private readonly organiser: boolean;

	constructor(popup: CommonPopup, system: "moodle" | "cs" | "webwork", context: string) {
		this.common = popup;
		this.system = system;
		this.flags = {moodle: 1, cs: 2, webwork: 4};
		this.organiser = context === "ארגונית++";

		if (this.organiser) return;

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

	async removeCalendarAlert(currentAlertFlag: number) {
		// noinspection JSBitwiseOperatorUsage
		if (this.organiser || this.system === "ua") currentAlertFlag &= -12;
		// noinspection JSBitwiseOperatorUsage
		else currentAlertFlag &= ~this.flags[this.system];

		if (!currentAlertFlag) await resetBadge();
		return currentAlertFlag;
	}

	async insertAssignments(newAssignmentsList: HWAssignment[], finishedAssignmentsList: HWAssignment[]) {
		const createAssignmentElement =
			(assignmentData: HWAssignment, template: DocumentFragment, containerId: "new_assignments" | "finished_assignments") => {
				const newAssigment = template.querySelector(".list_item") as HTMLDivElement;
				if (assignmentData.newEh) newAssigment.classList.add("starred");
				newAssigment.querySelector(".assignment_name")!.textContent = assignmentData.name;
				newAssigment.querySelector(".course_name")!.textContent += assignmentData.course;
				newAssigment.querySelector(".assignment_description")!.textContent = assignmentData.description;
				newAssigment.querySelector(".end_time")!.textContent += assignmentData.finalDate;
				const actionButtons = newAssigment.querySelectorAll("img");
				actionButtons[1].addEventListener("click", () => toggleDoneOriginal(this.system, assignmentData.eventID, newAssigment, true));
				actionButtons[2].addEventListener("click", () => toggleDoneOriginal(this.system, assignmentData.eventID, newAssigment, false));
				actionButtons[0].title = "moodle" === this.system ? "עבור להגשה במודל" : "עבור לאתר הקורס";
				actionButtons[0].addEventListener("click", () => openAssignment(newAssigment, assignmentData.goToFunc!));
				newAssigment.querySelector(".assignment_name")!.addEventListener("click", () => openAssignment(newAssigment, assignmentData.goToFunc!));
				document.getElementById(containerId)?.appendChild(newAssigment);
			};
		await this.common.useTemplatesFile("calendar", (documentContext: Document) => {
			const assignmentTemplate = this.common.loadTemplate("assignment", documentContext);
			newAssignmentsList.forEach(assignment =>
				createAssignmentElement(assignment, assignmentTemplate.cloneNode(true) as DocumentFragment, "new_assignments"));
			finishedAssignmentsList.forEach(assignment =>
				createAssignmentElement(assignment, assignmentTemplate.cloneNode(true) as DocumentFragment, "finished_assignments"));
			0 === newAssignmentsList.length + finishedAssignmentsList.length && insertMessage("לא נמצאו אירועים קרובים לתצוגה.", false);
			stopSpinning();
		});
	}

	async progress(promiseCreator: () => Promise<{ new_list: HWAssignment[], finished_list: HWAssignment[] }>) {
		if (this.organiser)
			await addAssignmentsToList(promiseCreator, this.system);
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

export async function toggleDoneOriginal(sys: HWSystem, eventID: number, item: HTMLDivElement, finishEh: boolean) {
	document.getElementById(finishEh ? "finished_assignments" : "new_assignments")?.appendChild(item);
	checkForEmpty();

	const keyMap: Record<string, keyof StorageData> = {
		webwork: "webwork_cal_events", moodle: "moodle_cal_finished", cs: "cs_cal_finished",
	};
	const key = keyMap[sys];
	if (!key) return;

	const storageData = await chrome.storage.local.get(key) as StorageData;
	if (chrome.runtime.lastError) return console.error(`TE_cal: ${chrome.runtime.lastError.message}`);

	let newCalendar;
	if (sys === "webwork") {
		newCalendar = storageData[key] as StorageData["webwork_cal_events"];
		newCalendar[eventID].done = !newCalendar[eventID].done;
	} else {
		newCalendar = storageData[key] as StorageData["moodle_cal_finished"] | StorageData["cs_cal_finished"];
		finishEh ? newCalendar.push(eventID) : newCalendar.splice(newCalendar.indexOf(eventID), 1);
	}

	await chrome.storage.local.set({[key]: newCalendar});
}

function openAssignment(assignmentItem: HTMLDivElement, openFunction: () => Promise<chrome.tabs.Tab>) {
	const spinner = assignmentItem.querySelector("img") as HTMLImageElement;
	spinner.style.display = "none";
	spinner.parentElement?.classList.add("small_spinner");
	openFunction().catch(() => {
		assignmentItem.style.borderRadius = "3px;";
		assignmentItem.style.backgroundColor = "var(--status-danger) !important;";
		setTimeout(() => assignmentItem.style.backgroundColor = "", 1E3);
	}).finally(() => {
		spinner.style.display = "block";
		spinner.parentElement?.classList.remove("small_spinner");
	});
}
