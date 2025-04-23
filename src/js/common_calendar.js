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
		const a = [document.getElementById("new_assignments"), document.getElementById("finished_assignments")],
			b = document.getElementById("tabs").getElementsByTagName("div");
		for (let d = 0; d < b.length; d++) {
			b[d].addEventListener("click", () => {
				for (let c = 0; c < 2; c++) {
					b[c].className = c === d ? "tab current" : "tab";
					a[c].style.display = c === d ? "block" : "none";
				}
			});
		}
	}

	removeCalendarAlert(a) {
		if (this.type === "ארגונית++") a &= -12; else a &= ~this.flags[this.name];
		if (!navigator.userAgent.includes("Android") && !a) chrome.action.setBadgeText({text: ""});
		return a;
	}

	insertAssignments(a, b) {
		const d = (c, e, f) => {
			e = e.querySelector(".list_item");
			if (c.is_new) e.classList.add("starred");
			e.querySelector(".assignment_header").textContent = c.header;
			e.querySelector(".course_name").textContent += c.course;
			e.querySelector(".assignment_descripion").textContent = c.description;
			e.querySelector(".end_time").textContent += c.final_date;
			const g = e.querySelectorAll("img");
			g[1].addEventListener("click", () => toggle(this.name, c.event, e, 1));
			g[2].addEventListener("click", () => toggle(this.name, c.event, e, 0));
			g[0].title = "moodle" === this.name ? "עבור להגשה במודל" : "עבור לאתר הקורס";
			g[0].addEventListener("click", () => openAssignment(e, c.goToFunc));
			e.querySelector(".assignment_header").addEventListener("click", () => openAssignment(e, c.goToFunc));
			document.getElementById(f).appendChild(e);
		};
		this.common.useTemplatesFile("calendar", c => {
			const e = this.common.loadTemplate("assignment", c);
			a.forEach(f => d(f, e.cloneNode(true), "new_assignments"));
			b.forEach(f => d(f, e.cloneNode(true), "finished_assignments"));
			0 === a.length + b.length && insertMessage("לא נמצאו אירועים קרובים לתצוגה.", false);
			stopSpinning();
		});
	}

	progress(a) {
		if (this.type === "ארגונית++") addAssignmentsToList(a, this.name);
		else a().then(b => this.insertAssignments(b.new_list, b.finished_list)).catch(err => insertMessage(err.msg, err.is_error));
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
	const d = document.getElementById("error").appendChild(document.createElement("div"));
	d.className = errorEh ? "error_bar" : "attention";
	d.textContent = msg;
}

export function toggle(sys, event, item, VorX) {
	if (sys === "ua") {
		chrome.storage.local.get({user_agenda: {}}, b => {
			if (chrome.runtime.lastError) console.error("TE_organize7: " + chrome.runtime.lastError.message);
			else {
				b.user_agenda[event].done = 1 - b.user_agenda[event].done;
				chrome.storage.local.set({user_agenda: b.user_agenda});
			}
		});
	} else {
		let calendar = {
			moodle: "cal_finished",
			cs: "cs_cal_finished",
			webwork: "webwork_cal",
		}[sys];
		chrome.storage.local.get(calendar, d => {
			if (chrome.runtime.lastError)
				console.error("TE_cal7: " + chrome.runtime.lastError.message);
			else {
				if (d[calendar].hasOwnProperty(event.toString())) delete d[calendar][event.toString()];
				else d[calendar][event.toString()] = 0;
				chrome.storage.local.set({[calendar]: d[calendar]});
			}
		});
	}
	[document.getElementById("new_assignments"), document.getElementById("finished_assignments")][VorX].appendChild(item);
	checkForEmpty();
}

function openAssignment(a, b) {
	const d = a.querySelector("img");
	d.style.display = "none";
	d.parentNode.classList.add("small_spinner");
	b().catch(_ => {
		a.setAttribute("style", "background-color: rgb(215, 0, 34, 0.8) !important; border-radius: 3px;");
		setTimeout(() => a.setAttribute("style", ""), 1E3);
	}).finally(() => {
		d.style.display = "block";
		d.parentNode.classList.remove("small_spinner");
	});
}
