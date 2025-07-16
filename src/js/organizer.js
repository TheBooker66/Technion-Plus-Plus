'use strict';
import {toggle} from "./common_calendar.js";

const loadTemplate = (a, b = document) => document.importNode(b.querySelector("template#" + a).content, true);

function insertMessage(messageText, errorEh) {
	const element = document.getElementById("error").appendChild(document.createElement("div"));
	element.className = errorEh ? "error_bar" : "attention";
	element.textContent = messageText;
}

function checkForEmpty() {
	["new_assignments", "finished_assignments"].forEach(tab => {
		tab = document.getElementById(tab);
		tab.querySelectorAll("div.list_item:not(.hidden)").length === 0
			? tab.classList.add("empty_list") : tab.classList.remove("empty_list");
	});
}

function openAssignment(assignment, gotoFunction) {
	const button = assignment.querySelector("a.button"), originalText = button.textContent;
	button.textContent = "פותח...";
	button.classList.add("small_spinner");
	const resetButton = () => {
		button.classList.remove("small_spinner");
		button.textContent = originalText;
	};
	gotoFunction().then(resetButton).catch(_ => {
		assignment.setAttribute("style", "background-color: rgb(215, 0, 34, 0.8) !important;");
		setTimeout(() => assignment.setAttribute("style", ""), 1E3);
		resetButton();
	});
}

function insertAssignments(newAssignments, finishedAssignments) {
	let courses = new Set;
	const insertAssignment = (assignmentData, templateClone, targetListID) => {
		templateClone = templateClone.querySelector(".list_item");
		if (assignmentData.sys === "ua")
			insertUserAssignment(assignmentData, templateClone, targetListID);
		else {
			if (assignmentData.is_new) templateClone.classList.add("starred");
			if (assignmentData.sys === "cs") {
				assignmentData.course = assignmentData.description;
				assignmentData.description = "";
			}
			const icons = {
				webwork: ["webwork.svg", "וובוורק"],
				moodle: ["moodle.svg", "מודל"],
				cs: ["grpp.ico", 'מדמ"ח'],
			};
			courses.add(assignmentData.course);
			templateClone.querySelector(".system").src = "../icons/" + icons[assignmentData.sys][0];
			templateClone.querySelector(".system").title = "מטלת" + icons[assignmentData.sys][1];
			templateClone.querySelector(".assignment_header").textContent = assignmentData.header;
			templateClone.querySelector(".course_name").textContent += assignmentData.course;
			templateClone.dataset.course = "#" + assignmentData.course;
			templateClone.querySelector(".assignment_descripion").textContent = assignmentData.description;
			templateClone.querySelector(".end_time > span").textContent = assignmentData.final_date;
			const buttonElements = templateClone.querySelectorAll("a.button");
			buttonElements[1].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.event, templateClone, 1));
			buttonElements[2].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.event, templateClone, 0));
			buttonElements[0].addEventListener("click", () => openAssignment(templateClone, assignmentData.goToFunc));
			templateClone.querySelector(".assignment_header").addEventListener("click", () => openAssignment(templateClone, assignmentData.goToFunc));
			document.getElementById(targetListID).appendChild(templateClone);
		}
	}, assignmentTemplate = loadTemplate("assignment"), userAgendaTemplate = loadTemplate("userAgenda");
	const hw_sort = (a, b) => a.timestamp === b.timestamp ? a.header.localeCompare(b.header) : a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
	newAssignments.sort(hw_sort);
	finishedAssignments.sort(hw_sort);
	newAssignments.forEach(assignmentData => insertAssignment(assignmentData, "ua" === assignmentData.sys ? userAgendaTemplate.cloneNode(true) : assignmentTemplate.cloneNode(true), "new_assignments"));
	finishedAssignments.forEach(assignmentData => insertAssignment(assignmentData, "ua" === assignmentData.sys ? userAgendaTemplate.cloneNode(true) : assignmentTemplate.cloneNode(true), "finished_assignments"));
	const courseFilterElement = document.getElementById("course_filter");
	Array.from(courses).forEach(courseName => {
		let optionElement = courseFilterElement.appendChild(document.createElement("option"));
		optionElement.value = courseName;
		optionElement.textContent = courseName;
	});
	document.getElementById("spinner").style.display = "none";
	checkForEmpty();
}

function editUA(assignmentID) {
	chrome.storage.local.get({user_agenda: {}}, storage => {
		form.subject.value = storage.user_agenda[assignmentID].header;
		form.notes.value = storage.user_agenda[assignmentID].description;
		form.edit.value = assignmentID;
		if (0 < storage.user_agenda[assignmentID].timestamp) {
			form.no_end.checked = false;
			form.end_time.valueAsNumber = storage.user_agenda[assignmentID].timestamp;
		} else {
			form.no_end.checked = true;
			form.end_time.value = "";
		}

		form_manual_events();
		tabContents.forEach(optionElement => optionElement.style.display = "none");
		tabContents[2].style.display = "block";
	});
}

function removeUA(assignmentID) {
	chrome.storage.local.get({user_agenda: {}}, storage => {
		if (storage.user_agenda.hasOwnProperty(assignmentID))
			if (window.confirm(`המטלה "${storage.user_agenda[assignmentID].header}" תימחק!`)) {
				delete storage.user_agenda[assignmentID];
				chrome.storage.local.set({user_agenda: storage.user_agenda}, () => {
					document.getElementById(`U_${assignmentID}`).remove();
					checkForEmpty();
				});
			}
	});
}

function insertUserAssignment(assignmentData, container, targetListID = null, insertAtBeginning = false) {
	if ("div" !== container.nodeName.toLowerCase()) container = container.querySelector(".list_item");
	container.id = `U_${assignmentData.id}`;
	container.querySelector(".assignment_header").textContent = assignmentData.header;
	container.dataset.course = "#user-course";
	let textareaHeight = 20 * (assignmentData.description.split("\n").length + 1),
		textareaElement = container.querySelector(".assignment_descripion textarea");
	textareaElement.textContent = assignmentData.description;
	textareaElement.style.height = textareaHeight + "px";
	textareaHeight = container.querySelector(".end_time > span");
	if (0 < assignmentData.timestamp) {
		textareaHeight.parentNode.style.visibility = "visible";
		textareaHeight.textContent = (new Date(assignmentData.timestamp)).toLocaleString("iw-IL", {
			weekday: "long",
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} else textareaHeight.parentNode.style.visibility = "hidden";
	if (-1 == assignmentData.timestamp) container.classList.add("system_message");
	if (targetListID) {
		targetListID = document.getElementById(targetListID);
		container = insertAtBeginning ? targetListID.insertBefore(container, targetListID.children[0]) : targetListID.appendChild(container);
		targetListID = container.querySelectorAll("a.button");
		targetListID[0].addEventListener("click", () => editUA(assignmentData.id));
		targetListID[1].addEventListener("click", () => removeUA(assignmentData.id));
		targetListID[2].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.event, container, 1));
		targetListID[3].addEventListener("click", () => toggle(assignmentData.sys, assignmentData.event, container, 0));
	}
}

const assignments_promises = {}, CALENDARS = 3; // moodle, webwork, cs

export function addAssignmentsToList(calendarPromise, calendarType) {
	assignments_promises[calendarType] = calendarPromise;
	Object.keys(assignments_promises).length === CALENDARS && chrome.storage.local.get({
		moodle_cal: true,
		cs_cal: false,
		wwcal_switch: false,
		quick_login: true,
		enable_login: true,
		user_agenda: {},
	}, storage => {
		const enabledCalendars = {};
		enabledCalendars.moodle = storage.quick_login && storage.enable_login && storage.moodle_cal;
		enabledCalendars.webwork = storage.quick_login && storage.enable_login && storage.wwcal_switch;
		enabledCalendars.cs = storage.cs_cal;
		let newAssignmentsList = [], finishedAssignmentsList = [], promisesList = [];
		const userAgendaData = storage.user_agenda;
		Object.keys(userAgendaData).forEach(agendaID => {
			userAgendaData[agendaID].id = agendaID;
			userAgendaData[agendaID].event = agendaID;
			userAgendaData[agendaID].sys = "ua";
			userAgendaData[agendaID].done ? newAssignmentsList.push(userAgendaData[agendaID]) : finishedAssignmentsList.push(userAgendaData[agendaID]);
		});
		for (let calendarType of Object.keys(assignments_promises)) enabledCalendars[calendarType] && promisesList.push(assignments_promises[calendarType]);
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
	});
}

function form_manual_events() {
	input_counters[0].textContent = form.subject.value.length;
	input_counters[1].textContent = form.notes.value.length;
	form.end_time.disabled = form.no_end.checked;
}

function form_reset_all() {
	form.reset();
	form.edit.value = "0";
	form_manual_events();
}

function form_submit() {
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
	chrome.storage.local.get({user_agenda: {}}, a => {
		let agenda = a.user_agenda, assignmentID = parseInt(form.edit.value),
			isExistingAssignment = 0 < assignmentID ? agenda.hasOwnProperty(assignmentID) : false,
			finalAssignmentID = isExistingAssignment ? assignmentID : Date.now();
		agenda[finalAssignmentID] = {
			header: form.subject.value.slice(0, 50),
			description: form.notes.value.slice(0, 280),
			timestamp: !form.no_end.checked && 0 < parseInt(form.end_time.valueAsNumber) ? parseInt(form.end_time.valueAsNumber) : 0,
			done: isExistingAssignment ? agenda[finalAssignmentID].done : false,
		};
		if (50 < Object.keys(agenda).length) {
			alert("לא ניתן ליצור יותר מ־50 מטלות משתמש.");
			return;
		}
		chrome.storage.local.set({user_agenda: agenda}, () => {
			let assignmentElement;
			agenda[finalAssignmentID].id = finalAssignmentID;
			if (isExistingAssignment) {
				assignmentElement = document.querySelector(`#U_${finalAssignmentID}`);
				insertUserAssignment(agenda[finalAssignmentID], assignmentElement);
				document.querySelector(".tab.current").click();
			} else {
				assignmentElement = loadTemplate("userAgenda");
				agenda[finalAssignmentID].event = finalAssignmentID;
				insertUserAssignment(agenda[finalAssignmentID], assignmentElement, "new_assignments", true);
				checkForEmpty();
				tabHeaders[0].click();
			}
			form_reset_all();
		});
	});
}

function setUpFilters() {
	const filtersDiv = document.getElementById("filters_div"),
		typeFiltersDiv = document.getElementById("type_filters_div"),
		typeFilterToggle = document.getElementById("type_filter_toggle"),
		typeFilters = document.querySelectorAll("#type_filters_div input"),
		courseFiltersDiv = document.getElementById("course_filters_div"),
		courseFilterToggle = document.getElementById("course_filter_toggle"),
		courseFilters = document.querySelector("#course_filters_div select");

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
		typeFilters[i].addEventListener("change", () => {
			chrome.storage.local.get({
				filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
			}, storage => {
				if (chrome.runtime.lastError) {
					console.error("TE_cal: " + chrome.runtime.lastError.message);
					insertMessage("שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסו שנית.", true);
					return;
				}
				for (const type in storage.filter_toggles) {
					storage.filter_toggles[type] = document.getElementById(type).checked;
				}
				chrome.storage.local.set({filter_toggles: storage.filter_toggles}, () => {
					if (chrome.runtime.lastError)
						console.error("TE_popup_remoodle: " + chrome.runtime.lastError.message);
					else location.reload();
				});
			});
		});
	}
	courseFilters.addEventListener("change", () => {
		document.querySelectorAll(`.list_item[data-course^='#${courseFilters.value.replace(/"/g, '\\"').replace(/'/g, "\\'")}']`)
			.forEach(event => event.classList.remove("hidden"));
		document.querySelectorAll(`.list_item:not([data-course^='#${courseFilters.value.replace(/"/g, '\\"').replace(/'/g, "\\'")}'])`)
			.forEach(event => event.classList.add("hidden"));
		checkForEmpty();
	});

	chrome.storage.local.get({
		filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
	}, storage => {
		if (chrome.runtime.lastError) {
			console.error("TE_cal: " + chrome.runtime.lastError.message);
			insertMessage("שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסו שנית.", true);
			return;
		}
		let filtersEnabledEh = false;
		for (const type in storage.filter_toggles) {
			document.getElementById(type).checked = storage.filter_toggles[type];
			if (!filtersEnabledEh && storage.filter_toggles[type]) {
				filtersEnabledEh = true;
				typeFilterToggle.textContent = "בטל סינון";
				typeFiltersDiv.classList.remove("hidden");
				filtersDiv.classList.remove("hidden");
			}
		}
	});
}

const tabContents = document.querySelectorAll("#bodies > .body"),
	tabHeaders = document.querySelectorAll("#tabs > .tab"),
	form = document.querySelector("form");
let input_counters;
if (document.title === "ארגונית++") {
	form.addEventListener("submit", event => {
		event.preventDefault();
		form_submit();
	});
	const form_buttons = form.querySelectorAll("a.button");
	form_buttons[0].addEventListener("click", () => form_submit());
	form_buttons[1].addEventListener("click", () => {
		form_reset_all();
		let currentTab = document.querySelector(".tab.current");
		currentTab === tabHeaders[2] ? tabHeaders[0].click() : currentTab.click();
	});
	tabHeaders[2].addEventListener("click", () => form_reset_all());

	const need_refresh = document.querySelector("#need_refresh");
	need_refresh.querySelector("a.button").addEventListener("click", () => window.location.reload());
	setInterval(() => chrome.storage.local.get({cal_seen: 0}, storage => {
		if (0 !== storage.cal_seen) need_refresh.style.display = "block";
	}), 6E4);

	const typeFilterToggle = document.getElementById("type_filter_toggle"),
		courseFilterToggle = document.getElementById("course_filter_toggle");
	for (let i = 0; i < tabHeaders.length; i++)
		tabHeaders[i].addEventListener("click", () => {
			for (let j = 0; j < tabHeaders.length; j++) {
				tabHeaders[j].className = j === i ? "tab current" : "tab";
				tabContents[j].style.display = j === i ? "block" : "none";
				if (i === 2)
					document.getElementById("filters_div").classList.add("hidden");
				else if (typeFilterToggle.textContent !== "סינון מטלות לפי סוג" || courseFilterToggle.textContent !== "סינון מטלות לפי קורס")
					document.getElementById("filters_div").classList.remove("hidden");
			}
		});

	window.addEventListener("contextmenu", event => event.preventDefault());
	input_counters = form.querySelectorAll("span");
	form.subject.addEventListener("input", () => input_counters[0].textContent = form.subject.value.length);
	form.notes.addEventListener("input", () => input_counters[1].textContent = form.notes.value.length);
	form.no_end.addEventListener("input", () => form.end_time.disabled = form.no_end.checked);
	setUpFilters();

	chrome.storage.local.get({organizer_fullscreen: false, organizer_darkmode: false}, storage => {
		const fullscreenCheckbox = document.getElementById("fullscreen"),
			darkmodeCheckbox = document.getElementById("darkmode");
		if (storage.organizer_fullscreen) {
			fullscreenCheckbox.checked = true;
			chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: "maximized"});
		}
		fullscreenCheckbox.addEventListener("change", _ => {
			chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: fullscreenCheckbox.checked ? "maximized" : "normal"});
			chrome.storage.local.set({organizer_fullscreen: fullscreenCheckbox.checked});
		});
		if (storage.organizer_darkmode) {
			darkmodeCheckbox.checked = true;
			document.querySelector("html").setAttribute("tplus", "dm");
		}
		darkmodeCheckbox.addEventListener("change", _ => {
			darkmodeCheckbox.checked ? document.querySelector("html").setAttribute("tplus", "dm") : document.querySelector("html").removeAttribute("tplus");
			chrome.storage.local.set({organizer_darkmode: darkmodeCheckbox.checked});
		});
	});
}