import {toggle} from "./common_calendar.js";

function insertMessage(messageText: string, errorEh: boolean = true) {
	const element = document.getElementById("error")!.appendChild(document.createElement("div"));
	element.className = errorEh ? "error_bar" : "attention";
	element.textContent = messageText;
}

function checkForEmpty() {
	["new_assignments", "finished_assignments"].forEach(tabID => {
		const tab = document.getElementById(tabID) as HTMLDivElement;
		tab.querySelectorAll("div.list_item:not(.hidden)").length === 0
			? tab.classList.add("empty_list") : tab.classList.remove("empty_list");
	});
}

function openAssignment(assignment: HTMLDivElement, gotoFunction: () => Promise<chrome.tabs.Tab>) {
	const button = assignment.querySelector("a.button") as HTMLAnchorElement;
	const originalText = button.textContent;
	button.textContent = "פותח...";
	button.classList.add("small_spinner");
	const resetButton = () => {
		button.classList.remove("small_spinner");
		button.textContent = originalText;
	};
	gotoFunction().then(resetButton).catch(_ => {
		assignment.style.background = "var(--status-danger) !important;";
		setTimeout(() => assignment.style.background = "", 1E3);
		resetButton();
	});
}

function insertAssignments(newAssignments: HWAssignment[], finishedAssignments: HWAssignment[]) {
	let courses: Set<string> = new Set;
	const insertAssignment =
		(assignmentData: HWAssignment, template: DocumentFragment, targetListID: "new_assignments" | "finished_assignments") => {
			const newAssigment = template.querySelector(".list_item") as HTMLDivElement;
			if (assignmentData.sys === "ua")
				insertUserAssignment(assignmentData, newAssigment, targetListID);
			else {
				if (assignmentData.newEh) newAssigment.classList.add("starred");
				if (assignmentData.sys === "cs") {
					assignmentData.course = assignmentData.description;
					assignmentData.description = "";
				}
				const icons = {
					webwork: ["webwork.svg", "וובוורק"],
					moodle: ["moodle.svg", "מודל"],
					cs: ["cs.png", 'מדמ"ח'],
				};
				courses.add(assignmentData.course!);
				(newAssigment.querySelector(".system") as HTMLImageElement).src = "../icons/" + icons[assignmentData.sys][0];
				(newAssigment.querySelector(".system") as HTMLImageElement).title = "מטלת" + icons[assignmentData.sys][1];
				newAssigment.querySelector(".assignment_name")!.textContent = assignmentData.name;
				newAssigment.querySelector(".course_name")!.textContent += assignmentData.course;
				newAssigment.dataset.course = "#" + assignmentData.course;
				newAssigment.querySelector(".assignment_description")!.textContent = assignmentData.description;
				newAssigment.querySelector(".end_time > span")!.textContent = assignmentData.finalDate!;
				const buttonElements = newAssigment.querySelectorAll("a.button");
				buttonElements[0].addEventListener("click", () => openAssignment(newAssigment, assignmentData.goToFunc!));
				buttonElements[1].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.eventID, newAssigment, 1));
				buttonElements[2].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.eventID, newAssigment, 0));
				newAssigment.querySelector(".assignment_name")!.addEventListener("click", () => openAssignment(newAssigment, assignmentData.goToFunc!));
				document.getElementById(targetListID)!.appendChild(newAssigment);
			}
		};

	const assignmentTemplate = loadTemplate("assignment"), userAgendaTemplate = loadTemplate("userAgenda"),
		sortAssignments = (a: HWAssignment, b: HWAssignment): number => a.timestamp === b.timestamp ? a.name.localeCompare(b.name) : a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
		chooseTemplate = (assignmentData: HWAssignment): DocumentFragment => "ua" === assignmentData.sys ? userAgendaTemplate.cloneNode(true) as DocumentFragment : assignmentTemplate.cloneNode(true) as DocumentFragment;
	newAssignments.sort(sortAssignments);
	finishedAssignments.sort(sortAssignments);
	newAssignments.forEach(assignmentData => insertAssignment(assignmentData, chooseTemplate(assignmentData), "new_assignments"));
	finishedAssignments.forEach(assignmentData => insertAssignment(assignmentData, chooseTemplate(assignmentData), "finished_assignments"));
	const courseFilterElement = document.getElementById("course_filter") as HTMLSelectElement;
	Array.from(courses).forEach(courseName => {
		let optionElement = courseFilterElement.appendChild(document.createElement("option"));
		optionElement.value = courseName;
		optionElement.textContent = courseName;
	});
	document.getElementById("spinner")!.style.display = "none";
	checkForEmpty();
}

async function editUA(assignmentID: string | number) {
	const storageData = await chrome.storage.local.get({user_agenda: {}});
	const userAgenda: { [key: string]: HWAssignment } = storageData.user_agenda;
	form.subject.value = userAgenda[assignmentID].name;
	form.notes.value = userAgenda[assignmentID].description;
	form.edit.value = assignmentID;
	if (0 < userAgenda[assignmentID].timestamp) {
		form.no_end.checked = false;
		form.end_time.valueAsNumber = userAgenda[assignmentID].timestamp;
	} else {
		form.no_end.checked = true;
		form.end_time.value = "";
	}

	form_manual_events();
	tabContents.forEach(optionElement => optionElement.style.display = "none");
	tabContents[2].style.display = "block";
}

async function removeUA(assignmentID: string | number) {
	const storageData = await chrome.storage.local.get({user_agenda: {}});
	if (!storageData.user_agenda.hasOwnProperty(assignmentID)) return;
	if (!window.confirm(`המטלה "${storageData.user_agenda[assignmentID].name}" תימחק!`)) return;

	delete storageData.user_agenda[assignmentID];
	await chrome.storage.local.set({user_agenda: storageData.user_agenda});
	document.getElementById(`U_${assignmentID}`)?.remove();
	checkForEmpty();
}

function insertUserAssignment(assignmentData: HWAssignment, container: HTMLDivElement, targetListID: "new_assignments" | "finished_assignments" | "" = "", insertAtBeginning: boolean = false) {
	if (container.nodeName !== "DIV") container = container.querySelector(".list_item") as HTMLDivElement;
	container.id = `U_${assignmentData.eventID}`;
	container.querySelector(".assignment_name")!.textContent = assignmentData.name;
	container.dataset.course = "#user-course";
	let textareaHeight = 20 * (assignmentData.description.split("\n").length + 1),
		textareaElement = container.querySelector(".assignment_description textarea") as HTMLTextAreaElement,
		inputElement = container.querySelector(".end_time > span") as HTMLInputElement;
	textareaElement.textContent = assignmentData.description;
	textareaElement.style.height = textareaHeight + "px";
	if (0 < assignmentData.timestamp) {
		inputElement.parentElement!.style.visibility = "visible";
		inputElement.textContent = (new Date(assignmentData.timestamp)).toLocaleString("he-IL", {
			weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
		});
	} else inputElement.parentElement!.style.visibility = "hidden";
	if (assignmentData.timestamp === -1) container.classList.add("system_message");

	if (targetListID === "") return;
	const targetList = document.getElementById(targetListID) as HTMLDivElement;
	container = insertAtBeginning ? targetList.insertBefore(container, targetList.children[0]) : targetList.appendChild(container);
	const targetListButtons = container.querySelectorAll("a.button");
	targetListButtons[0].addEventListener("click", () => editUA(assignmentData.eventID));
	targetListButtons[1].addEventListener("click", () => removeUA(assignmentData.eventID));
	targetListButtons[2].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.eventID, container, 1));
	targetListButtons[3].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.eventID, container, 0));
}


export async function addAssignmentsToList(
	calendarPromise: () => Promise<{ new_list: HWAssignment[], finished_list: HWAssignment[] }>,
	calendarType: HWSystem) {
	assignmentPromises[calendarType] = calendarPromise;
	if (Object.keys(assignmentPromises).length !== CALENDARS) return;

	const storageData = await chrome.storage.local.get({
		quick_login: true, enable_login: true, user_agenda: {},
		moodle_cal_enabled: true, cs_cal_enabled: false, webwork_cal_enabled: false,
	});
	const userAgendaData: { [key: string]: HWAssignment } = storageData.user_agenda,
		enabledCalendars = {
			"moodle": storageData.quick_login && storageData.enable_login && storageData.moodle_cal_enabled,
			"cs": storageData.cs_cal_enabled,
			"webwork": storageData.quick_login && storageData.enable_login && storageData.webwork_cal_enabled,
		};
	let newAssignmentsList: HWAssignment[] = [], finishedAssignmentsList: HWAssignment[] = [], promisesList = [];
	Object.keys(userAgendaData).forEach(agendaID => {
		userAgendaData[agendaID].eventID = parseInt(agendaID);
		userAgendaData[agendaID].sys = "ua";
		userAgendaData[agendaID].done ? newAssignmentsList.push(userAgendaData[agendaID]) : finishedAssignmentsList.push(userAgendaData[agendaID]);
	});
	for (let type of Object.keys(assignmentPromises)) if (enabledCalendars[type as "moodle" | "cs" | "webwork"]) promisesList.push(assignmentPromises[type]);
	let completedPromises = 0;
	for (let calendarPromise of promisesList) {
		calendarPromise().then(calendarData => {
			finishedAssignmentsList = finishedAssignmentsList.concat(calendarData.new_list);
			newAssignmentsList = newAssignmentsList.concat(calendarData.finished_list);
		}).catch(err => insertMessage(err.msg, err.is_error)).finally(() => {
			if (++completedPromises === promisesList.length) insertAssignments(finishedAssignmentsList, newAssignmentsList);
		});
	}
	if (promisesList.length === 0) {
		insertAssignments(finishedAssignmentsList, newAssignmentsList);
		insertMessage(`משיכת מטלות הבית עבור מודל, וובוורק ומדמ"ח כבויה. יש להגדיר הצגת מטלות בית עבור המערכות הרצויות בהגדרות התוסף.`, false);
	}
}

function form_manual_events() {
	const input_counters = form.querySelectorAll("span");
	input_counters[0].textContent = form.subject.value.length;
	input_counters[1].textContent = form.notes.value.length;
	form.end_time.disabled = form.no_end.checked;
}

function form_reset_all() {
	form.reset();
	form.edit.value = "0";
	form_manual_events();
}

async function form_submit() {
	if (form.subject.value.length === 0) {
		alert("חובה למלא נושא למטלה");
		return;
	}
	if (!(form.no_end.checked || "" !== form.end_time.value)) {
		alert('חובה לבחור תאריך סיום או לסמן את "ללא תאריך סיום"');
		return;
	}
	if (!form.no_end.checked && form.end_time.valueAsNumber < Date.now()) {
		alert("תאריך הסיום שבחרת כבר עבר, נא לבחור תאריך סיום חדש");
		return;
	}
	const storageData = await chrome.storage.local.get({user_agenda: {}});
	let userAgenda: { [key: string]: HWAssignment } = storageData.user_agenda;
	const assignmentID = parseInt(form.edit.value);
	const isExistingAssignment = 0 < assignmentID ? userAgenda.hasOwnProperty(assignmentID) : false;
	const finalAssignmentID = isExistingAssignment ? assignmentID : Date.now();
	userAgenda[finalAssignmentID] = {
		eventID: finalAssignmentID,
		name: form.subject.value.slice(0, 50),
		description: form.notes.value.slice(0, 280),
		sys: "ua",
		timestamp: !form.no_end.checked && 0 < parseInt(form.end_time.valueAsNumber) ? parseInt(form.end_time.valueAsNumber) : 0,
		done: isExistingAssignment ? userAgenda[finalAssignmentID].done : false,
	};
	if (50 < Object.keys(userAgenda).length) {
		alert("לא ניתן ליצור יותר מ־50 מטלות משתמש.");
		return;
	}
	await chrome.storage.local.set({user_agenda: userAgenda});
	let assignmentElement;
	if (isExistingAssignment) {
		assignmentElement = document.querySelector(`#U_${finalAssignmentID}`) as HTMLDivElement;
		insertUserAssignment(userAgenda[finalAssignmentID], assignmentElement);
		(document.querySelector(".tab .current") as HTMLDivElement)?.click();
	} else {
		assignmentElement = loadTemplate("userAgenda").cloneNode(true) as HTMLDivElement;
		insertUserAssignment(userAgenda[finalAssignmentID], assignmentElement, "new_assignments", true);
		checkForEmpty();
		tabHeaders[0].click();
	}
	form_reset_all();
}

async function setUpFilters() {
	const filtersDiv = document.getElementById("filters_div") as HTMLDivElement,
		typeFiltersDiv = document.getElementById("type_filters_div") as HTMLDivElement,
		typeFilterToggle = document.getElementById("type_filter_toggle") as HTMLAnchorElement,
		typeFilters = document.querySelectorAll("#type_filters_div input") as NodeListOf<HTMLInputElement>,
		courseFiltersDiv = document.getElementById("course_filters_div") as HTMLDivElement,
		courseFilterToggle = document.getElementById("course_filter_toggle") as HTMLAnchorElement,
		courseFilters = document.querySelector("#course_filters_div select") as HTMLSelectElement;

	typeFilterToggle.addEventListener("click", () => {
		if (typeFilterToggle.textContent === "בטל סינון") {
			for (let i = 0; i < typeFilters.length; i++)
				typeFilters[i].checked = false;
			typeFilters[0].dispatchEvent(new Event("change"));
			typeFilterToggle.textContent = "סינון מטלות לפי סוג";
		} else
			typeFilterToggle.textContent = "בטל סינון";
		typeFiltersDiv.classList.toggle("hidden");
		if (courseFilterToggle.textContent === "סינון מטלות לפי קורס")
			filtersDiv.classList.toggle("hidden");
	});
	courseFilterToggle.addEventListener("click", () => {
		courseFilters.selectedIndex = 0;
		courseFilters.dispatchEvent(new Event("change"));
		courseFilterToggle.textContent =
			courseFilterToggle.textContent === "סינון מטלות לפי קורס" ? "בטל סינון" : "סינון מטלות לפי קורס";
		courseFiltersDiv.classList.toggle("hidden");
		if (typeFilterToggle.textContent === "סינון מטלות לפי סוג")
			filtersDiv.classList.toggle("hidden");
	});

	for (let i = 0; i < typeFilters.length; i++) {
		typeFilters[i].addEventListener("change", async () => {
			const storageData = await chrome.storage.local.get({
				filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
			});
			if (chrome.runtime.lastError) {
				console.error("TE_cal: " + chrome.runtime.lastError.message);
				insertMessage("שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסו שנית.");
				return;
			}
			for (const type in storageData.filter_toggles) {
				storageData.filter_toggles[type] = (document.getElementById(type) as HTMLInputElement).checked;
			}
			await chrome.storage.local.set({filter_toggles: storageData.filter_toggles});
			if (chrome.runtime.lastError) console.error("TE_popup_remoodle: " + chrome.runtime.lastError);
			else location.reload();
		});
	}
	courseFilters.addEventListener("change", () => {
		document.querySelectorAll(`.list_item[data-course^='#${courseFilters.value.replace(/"/g, '\\"').replace(/'/g, "\\'")}']`)
			.forEach(event => event.classList.remove("hidden"));
		document.querySelectorAll(`.list_item:not([data-course^='#${courseFilters.value.replace(/"/g, '\\"').replace(/'/g, "\\'")}'])`)
			.forEach(event => event.classList.add("hidden"));
		checkForEmpty();
	});

	const storageData = await chrome.storage.local.get({
		filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
	});
	if (chrome.runtime.lastError) {
		console.error("TE_cal: " + chrome.runtime.lastError.message);
		insertMessage("שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסו שנית.");
		return;
	}
	let filtersEnabledEh = false;
	for (const type in storageData.filter_toggles) {
		(document.getElementById(type) as HTMLInputElement).checked = storageData.filter_toggles[type];
		if (!filtersEnabledEh && storageData.filter_toggles[type]) {
			filtersEnabledEh = true;
			typeFilterToggle.textContent = "בטל סינון";
			typeFiltersDiv.classList.remove("hidden");
			filtersDiv.classList.remove("hidden");
		}
	}
}

// Initial setup and data load
const form = document.querySelector("form") as HTMLFormElement,
	tabContents = document.querySelectorAll("#bodies > .body") as NodeListOf<HTMLDivElement>,
	tabHeaders = document.querySelectorAll("#tabs > .tab") as NodeListOf<HTMLDivElement>,
	loadTemplate = (templateID: string, documentContext: Document | Element = document) => {
		return document.importNode((documentContext.querySelector(`template#${templateID}`) as HTMLTemplateElement)?.content, true);
	},
	assignmentPromises: {
		[key: string]: () => Promise<{ new_list: HWAssignment[], finished_list: HWAssignment[] }>
	} = {},
	CALENDARS: number = 3; // moodle, webwork, cs

if (document.title === "ארגונית++") {
	form.addEventListener("submit", async event => {
		event.preventDefault();
		await form_submit();
	});
	const form_buttons = form.querySelectorAll("a.button") as NodeListOf<HTMLAnchorElement>;
	form_buttons[0].addEventListener("click", () => form_submit());
	form_buttons[1].addEventListener("click", () => {
		form_reset_all();
		let currentTab = document.querySelector(".tab.current") as HTMLDivElement;
		currentTab === tabHeaders[2] ? tabHeaders[0].click() : currentTab.click();
	});
	tabHeaders[2].addEventListener("click", () => form_reset_all());

	const need_refresh = document.querySelector("#need_refresh") as HTMLDivElement;
	need_refresh.querySelector("a.button")?.addEventListener("click", () => window.location.reload());
	setInterval(async () => {
		const storageData = await chrome.storage.local.get({cal_seen: 0});
		if (storageData.cal_seen !== 0) need_refresh.style.display = "block";
	}, 6E4);

	const filtersDiv = document.getElementById("filters_div") as HTMLDivElement,
		typeFilterToggle = document.getElementById("type_filter_toggle") as HTMLAnchorElement,
		courseFilterToggle = document.getElementById("course_filter_toggle") as HTMLAnchorElement;
	for (let i = 0; i < tabHeaders.length; i++)
		tabHeaders[i].addEventListener("click", () => {
			for (let j = 0; j < tabHeaders.length; j++) {
				tabHeaders[j].className = j === i ? "tab current" : "tab";
				tabContents[j].style.display = j === i ? "block" : "none";
				if (i === 2)
					filtersDiv.classList.add("hidden");
				else if (typeFilterToggle.textContent !== "סינון מטלות לפי סוג" || courseFilterToggle.textContent !== "סינון מטלות לפי קורס")
					filtersDiv.classList.remove("hidden");
			}
		});

	window.addEventListener("contextmenu", event => event.preventDefault());
	const input_counters = form.querySelectorAll("span");
	form.subject.addEventListener("input", () => input_counters[0].textContent = form.subject.value.length);
	form.notes.addEventListener("input", () => input_counters[1].textContent = form.notes.value.length);
	form.no_end.addEventListener("input", () => form.end_time.disabled = form.no_end.checked);
	await setUpFilters();

	const storageData = await chrome.storage.local.get({organizer_fullscreen: false, dark_mode: false});
	const fullscreenCheckbox = document.getElementById("fullscreen") as HTMLInputElement;
	if (storageData.organizer_fullscreen) {
		fullscreenCheckbox.checked = true;
		await chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: "maximized"});
	}
	fullscreenCheckbox.addEventListener("change", async _ => {
		await chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: fullscreenCheckbox.checked ? "maximized" : "normal"});
		await chrome.storage.local.set({organizer_fullscreen: fullscreenCheckbox.checked});
	});
	storageData.dark_mode ? document.querySelector("html")?.setAttribute("tplus", "dm") :
		document.querySelector("html")?.removeAttribute("tplus");
}