'use strict';
import {toggle} from "./common_calendar.js";

const loadTemplate = (a, b = document) => document.importNode(b.querySelector("template#" + a).content, true);

function insertMessage(a, b) {
	const c = document.getElementById("error").appendChild(document.createElement("div"));
	c.className = b ? "error_bar" : "attention";
	c.textContent = a;
}

function checkForEmpty() {
	["new_assignments", "finished_assignments"].forEach(tab => {
		tab = document.getElementById(tab);
		tab.querySelectorAll("div.list_item:not(.hidden)").length === 0
			? tab.classList.add("empty_list") : tab.classList.remove("empty_list");
	});
}

function openAssignment(a, b) {
	const c = a.querySelector("a.button"), d = c.textContent;
	c.textContent = "פותח...";
	c.classList.add("small_spinner");
	const f = () => {
		c.classList.remove("small_spinner");
		c.textContent = d;
	};
	b().then(f).catch(_ => {
		a.setAttribute("style", "background-color: rgba(215, 0, 34, 0.8) !important;");
		setTimeout(() => a.setAttribute("style", ""), 1E3);
		f();
	});
}

function insertAssignments(a, b) {
	let c = new Set;
	const d = (e, g, l) => {
		g = g.querySelector(".list_item");
		if (e.sys === "ua")
			insertUserAssignment(e, g, l);
		else {
			if (e.is_new) g.classList.add("starred");
			if (e.sys === "cs") {
				e.course = e.description;
				e.description = "";
			}
			const icons = {
				webwork: ["webwork.svg", "וובוורק"],
				moodle: ["moodle.svg", "מודל"],
				cs: ["grpp.ico", 'מדמ"ח']
			};
			c.add(e.course);
			g.querySelector(".system").src = "../icons/" + icons[e.sys][0];
			g.querySelector(".system").title = "מטלת" + icons[e.sys][1];
			g.querySelector(".assignment_header").textContent = e.header;
			g.querySelector(".course_name").textContent += e.course;
			g.dataset.course = "#" + e.course;
			g.querySelector(".assignment_descripion").textContent = e.description;
			g.querySelector(".end_time > span").textContent = e.final_date;
			const m = g.querySelectorAll("a.button");
			m[1].addEventListener("click", () => toggle(e.sys, e.event, g, 1));
			m[2].addEventListener("click", () => toggle(e.sys, e.event, g, 0));
			m[0].addEventListener("click", () => openAssignment(g, e.goToFunc));
			g.querySelector(".assignment_header").addEventListener("click", () => openAssignment(g, e.goToFunc));
			document.getElementById(l).appendChild(g);
		}
	}, f = loadTemplate("assignment"), k = loadTemplate("userAgenda");
	const hw_sort = (a, b) => a.timestamp === b.timestamp ? a.header.localeCompare(b.header) : a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
	a.sort(hw_sort);
	b.sort(hw_sort);
	a.forEach(e => d(e, "ua" === e.sys ? k.cloneNode(true) : f.cloneNode(true), "new_assignments"));
	b.forEach(e => d(e, "ua" === e.sys ? k.cloneNode(true) : f.cloneNode(true), "finished_assignments"));
	const h = document.getElementById("course_filter");
	Array.from(c).forEach(e => {
		let g = h.appendChild(document.createElement("option"));
		g.value = e;
		g.textContent = e;
	});
	document.getElementById("spinner").style.display = "none";
	checkForEmpty();
}

function editUA(a) {
	chrome.storage.local.get({user_agenda: {}}, b => {
		form.subject.value = b.user_agenda[a].header;
		form.notes.value = b.user_agenda[a].description;
		form.edit.value = a;
		if (0 < b.user_agenda[a].timestamp) {
			form.no_end.checked = false;
			form.end_time.valueAsNumber = b.user_agenda[a].timestamp
		} else {
			form.no_end.checked = true;
			form.end_time.value = "";
		}

		form_manual_events();
		po_list.forEach(c => c.style.display = "none");
		po_list[2].style.display = "block";
	});
}

function removeUA(a) {
	chrome.storage.local.get({user_agenda: {}}, b => {
		if (b.user_agenda.hasOwnProperty(a))
			if (window.confirm(`המטלה "${b.user_agenda[a].header}" תימחק!`)) {
				delete b.user_agenda[a];
				chrome.storage.local.set({user_agenda: b.user_agenda}, () => {
					document.getElementById(`U_${a}`).remove();
					checkForEmpty();
				});
			}
	});
}

function insertUserAssignment(a, b, c = null, d = false) {
	if ("div" !== b.nodeName.toLowerCase()) b = b.querySelector(".list_item");
	b.id = `U_${a.id}`;
	b.querySelector(".assignment_header").textContent = a.header;
	b.dataset.course = "#user-course";
	let f = 20 * (a.description.split("\n").length + 1), k = b.querySelector(".assignment_descripion textarea");
	k.textContent = a.description;
	k.style.height = f + "px";
	f = b.querySelector(".end_time > span");
	0 < a.timestamp ? (f.parentNode.style.visibility = "visible", f.textContent =
		(new Date(a.timestamp)).toLocaleString("iw-IL", {
			weekday: "long",
			day: "2-digit",
			month: "2-digit",
			year: "numeric"
		})) : f.parentNode.style.visibility = "hidden";
	if (-1 == a.timestamp) b.classList.add("system_message");
	if (c) {
		c = document.getElementById(c);
		b = d ? c.insertBefore(b, c.children[0]) : c.appendChild(b);
		c = b.querySelectorAll("a.button");
		c[0].addEventListener("click", () => editUA(a.id));
		c[1].addEventListener("click", () => removeUA(a.id));
		c[2].addEventListener("click", () => toggle(a.sys, a.event, b, 1));
		c[3].addEventListener("click", () => toggle(a.sys, a.event, b, 0));
	}
}

const assignments_promises = {}, CALENDARS = 3; // moodle, webwork, cs

export function addAssignmentsToList(a, b) {
	assignments_promises[b] = a;
	Object.keys(assignments_promises).length === CALENDARS && chrome.storage.local.get({
		moodle_cal: true,
		cs_cal: false,
		wwcal_switch: false,
		quick_login: true,
		enable_login: true,
		user_agenda: {}
	}, c => {
		const d = {};
		d.moodle = c.quick_login && c.enable_login && c.moodle_cal;
		d.webwork = c.quick_login && c.enable_login && c.wwcal_switch;
		d.cs = c.cs_cal;
		let e = [], h = [], f = [];
		const g = c.user_agenda;
		Object.keys(g).forEach(l => {
			g[l].id = l;
			g[l].event = l;
			g[l].sys = "ua";
			g[l].done ? e.push(g[l]) : h.push(g[l])
		});
		for (let l of Object.keys(assignments_promises)) d[l] && f.push(assignments_promises[l]);
		let k = 0;
		for (let l of f) {
			l().then(m => {
				h = h.concat(m.new_list);
				e = e.concat(m.finished_list);
			}).catch(err => insertMessage(err.msg, err.is_error)).finally(() => {
				if (++k === f.length) insertAssignments(h, e);
			});
		}
		if (f.length === 0) {
			insertAssignments(h, e);
			insertMessage(`משיכת מטלות הבית עבור מודל, וובוורק ומדמ"ח כבויה. יש להגדיר הצגת מטלות בית עבור המערכות הרצויות בהגדרות התוסף`, false);
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
		alert("תאריך הסיום שבחרת כבר עבר, נא לבחור תאריך סיום חדש")
		return;
	}
	chrome.storage.local.get({user_agenda: {}}, a => {
		let agenda = a.user_agenda, b = parseInt(form.edit.value),
			c = 0 < b ? agenda.hasOwnProperty(b) : false, d = c ? b : Date.now();
		agenda[d] = {
			header: form.subject.value.slice(0, 50),
			description: form.notes.value.slice(0, 280),
			timestamp: !form.no_end.checked && 0 < parseInt(form.end_time.valueAsNumber) ? parseInt(form.end_time.valueAsNumber) : 0,
			done: c ? agenda[d].done : false
		};
		if (50 < Object.keys(agenda).length) {
			alert("לא ניתן ליצור יותר מ־50 מטלות משתמש.")
			return;
		}
		chrome.storage.local.set({user_agenda: agenda}, () => {
			let f;
			agenda[d].id = d;
			if (c) {
				f = document.querySelector(`#U_${d}`);
				insertUserAssignment(agenda[d], f);
				document.querySelector(".tab.current").click()
			} else f = loadTemplate("userAgenda"), agenda[d].event = d, insertUserAssignment(agenda[d], f, "new_assignments", true), checkForEmpty(), po_tabs[0].click();
			form_reset_all();
		});
	});
}

const po_list = [document.getElementById("new_assignments"), document.getElementById("finished_assignments"), document.getElementById("add_assignment")],
	po_tabs = document.querySelectorAll("#tabs > .tab"), form = document.querySelector("form");
let input_counters;
if (document.title === "ארגונית++") {
	form.addEventListener("submit", a => {
		a.preventDefault();
		form_submit();
	});
	const form_buttons = form.querySelectorAll("a.button");
	form_buttons[0].addEventListener("click", () => form_submit());
	form_buttons[1].addEventListener("click", () => {
		form_reset_all();
		let a = document.querySelector(".tab.current");
		a == po_tabs[2] ? po_tabs[0].click() : a.click();
	});
	po_tabs[2].addEventListener("click", form_reset_all);
	const need_refresh = document.querySelector("#need_refresh");
	need_refresh.querySelector("a.button").addEventListener("click", () => window.location.reload());
	setInterval(() => chrome.storage.local.get({cal_seen: 0}, a => {
		if (0 != a.cal_seen) need_refresh.style.display = "block";
	}), 6E4);
	const filters_div = document.getElementById("filtering"), filter = document.getElementById("course_filter"),
		filters_toggle = document.getElementById("filters_toggle");
	filter.addEventListener("change", () => {
		document.querySelectorAll(`.list_item[data-course^='#${filter.value.replace(/"/g, '\\"').replace(/'/g, "\\'")}']`)
			.forEach(a => a.classList.remove("hidden"));
		document.querySelectorAll(`.list_item:not([data-course^='#${filter.value.replace(/"/g, '\\"').replace(/'/g, "\\'")}'])`)
			.forEach(a => a.classList.add("hidden"));
		checkForEmpty();
	});
	filters_toggle.addEventListener("click", () => {
		filter.selectedIndex = 0;
		filter.dispatchEvent(new Event("change"));
		filters_toggle.textContent = "סינון מטלות" === filters_toggle.textContent ? "בטל סינון" : "סינון מטלות";
		filters_div.classList.toggle("hidden");
	});
	for (let a = 0; a < po_tabs.length; a++) po_tabs[a].addEventListener("click", () => {
		for (let b = 0; b < po_tabs.length; b++) {
			po_tabs[b].className = b === a ? "tab current" : "tab";
			po_list[b].style.display = b === a ? "block" : "none";
		}
	});
	document.getElementById("goToSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
	window.addEventListener("contextmenu", a => a.preventDefault());
	input_counters = form.querySelectorAll("span");
	form.subject.addEventListener("input", () => input_counters[0].textContent = form.subject.value.length);
	form.notes.addEventListener("input", () => input_counters[1].textContent = form.notes.value.length);
	form.no_end.addEventListener("input", () => form.end_time.disabled = form.no_end.checked);

	chrome.storage.local.get({gmail: true}, a => {
		const b = {
			ad: "ethan.amiran@gmail.com",
			su: "יצירת קשר - Technion++"
		};
		let c = a.gmail ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1" : "mailto:{1}?subject={2}";
		c = c.replace("{1}", b.ad).replace("{2}", b.su);
		document.getElementById("mailtome").setAttribute("href", c);
		if (a.gmail) document.getElementById("mailtome").setAttribute("target", "_blank");
	});
	chrome.storage.local.get({organizer_fullscreen: false, organizer_darkmode: false}, a => {
		let b = document.getElementById("fullscreen");
		if (a.organizer_fullscreen) {
			b.checked = true;
			chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: "maximized"});
		}
		b.addEventListener("change", _ => {
			chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: b.checked ? "maximized" : "normal"});
			chrome.storage.local.set({organizer_fullscreen: b.checked})
		});
		let c = document.getElementById("darkmode");
		if (a.organizer_darkmode) {
			c.checked = true;
			document.querySelector("html").setAttribute("tplus", "dm");
		}
		c.addEventListener("change", _ => {
			c.checked ? document.querySelector("html").setAttribute("tplus", "dm") : document.querySelector("html").removeAttribute("tplus");
			chrome.storage.local.set({organizer_darkmode: c.checked});
		});
	});
}