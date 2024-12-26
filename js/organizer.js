'use strict';
import {CommonCalendar} from "./common_calendar.js";

export class OrganizerCalendar extends CommonCalendar {
	constructor(a, b) {
		super(a, b);
	}

	removeCalendarAlert(a) {
		a &= -12;
		navigator.appVersion.includes("Android") || a || chrome.action.setBadgeText({text: ""});
		return a
	}

	progress(a) {
		addAssignmentsToList(a, this.name)
	}
}

function loadTemplate(a, b) {
	b = void 0 === b ? document : b;
	a = b.querySelector("template#" + a).content;
	return document.importNode(a, !0)
}

function insertMessage(a, b) {
	var c = document.getElementById("error").appendChild(document.createElement("div"));
	c.className = b ? "error_bar" : "attention";
	c.textContent = a
}

function checkForEmpty() {
	["new_assignments", "finished_assignments"].forEach(a => {
		a = document.getElementById(a);
		0 == a.querySelectorAll("div.list_item:not(.hidden)").length ? a.classList.add("empty_list") : a.classList.remove("empty_list")
	})
}

function stopSpinning() {
	document.getElementById("spinner").style.display = "none";
	checkForEmpty()
}

function toggle(a, b, c) {
	b();
	[document.getElementById("new_assignments"), document.getElementById("finished_assignments")][c].appendChild(a);
	checkForEmpty()
}

function openAssignment(a, b) {
	var c = a.querySelector("a.button"), d = c.textContent;
	c.textContent = "\u05e4\u05d5\u05ea\u05d7...";
	c.classList.add("small_spinner");
	var f = () => {
		c.classList.remove("small_spinner");
		c.textContent = d
	};
	b().then(f).catch(() => {
		a.setAttribute("style", "background-color: rgba(215, 0, 34, 0.8) !important;");
		setTimeout(() => a.setAttribute("style", ""), 1E3);
		f()
	})
}

function hw_sort(a, b) {
	return a.timestamp === b.timestamp ? a.header.localeCompare(b.header) : a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0
}

function insertAssignments(a, b) {
	let c = new Set;
	var d = (e, g, l) => {
		g = g.querySelector(".list_item");
		if ("ua" == e.sys)
			insertUserAssignment(e, g, l);
		else {
			e.is_new && g.classList.add("starred");
			"cs" == e.sys && (e.course = e.description, e.description = "");
			var m = {
				ww: ["webwork.svg", "וובוורק"],
				m: ["moodle.svg", "מודל"],
				cs: ["grpp.ico", 'מדמ"ח']
			};
			// e.course = e.course.replace(/[0-9]+ - | - (\u05d7\u05d5\u05e8\u05e3|\u05e7\u05d9\u05e5|\u05d0\u05d1\u05d9\u05d1)/,
			// 	""); // חורף, קיץ, אביב
			// e.course = e.course.replace(/[^a-zA-Z0-9\u05d0-\u05ea ]/, ""); // א-ת
			// WHY WOULD YOU DO THIS?!
			c.add(e.course);
			g.querySelector(".system").src = "../icons/" + m[e.sys][0];
			g.querySelector(".system").title = "מטלת" + m[e.sys][1];
			g.querySelector(".assignment_header").textContent = e.header;
			g.querySelector(".course_name").textContent += e.course;
			g.dataset.course = "#" + e.course;
			g.querySelector(".assignment_descripion").textContent = e.description;
			g.querySelector(".end_time > span").textContent = e.final_date;
			m = g.querySelectorAll("a.button");
			m[1].addEventListener("click", _ => toggle(g, e.toggleFunc, 1));
			m[2].addEventListener("click", _ => toggle(g, e.toggleFunc, 0));
			m[0].addEventListener("click", _ => openAssignment(g, e.goToFunc));
			g.querySelector(".assignment_header").addEventListener("click", _ => openAssignment(g, e.goToFunc));
			document.getElementById(l).appendChild(g)
		}
	}, f = loadTemplate("assignment"), k = loadTemplate("userAgenda");
	a.sort(hw_sort);
	b.sort(hw_sort);
	a.forEach(e => d(e, "ua" == e.sys ? k.cloneNode(!0) : f.cloneNode(!0), "new_assignments"));
	b.forEach(e =>
		d(e, "ua" == e.sys ? k.cloneNode(!0) : f.cloneNode(!0), "finished_assignments"));
	var h = document.getElementById("course_filter");
	Array.from(c).forEach(e => {
		let g = h.appendChild(document.createElement("option"));
		g.value = e;
		g.textContent = e
	});
	stopSpinning()
}

function removeUA(a) {
	chrome.storage.local.get({user_agenda: {}}, b => {
		b.user_agenda.hasOwnProperty(a) && (console.log("h1"), window.confirm(`\u05d4\u05de\u05d8\u05dc\u05d4 "${b.user_agenda[a].header}" \u05ea\u05d9\u05de\u05d7\u05e7!`) && (console.log("h2"), delete b.user_agenda[a], chrome.storage.local.set({user_agenda: b.user_agenda}, () => {
			document.getElementById(`U_${a}`).remove();
			checkForEmpty()
		})))
	})
}

function toggleFinishedUA(a) {
	chrome.storage.local.get({user_agenda: {}}, function (b) {
		chrome.runtime.lastError ? console.log("TE_organize7: " + chrome.runtime.lastError.message) : (b.user_agenda[a].done = 1 - b.user_agenda[a].done, chrome.storage.local.set({user_agenda: b.user_agenda}))
	})
}

function editUA(a) {
	chrome.storage.local.get({user_agenda: {}}, b => {
		form.subject.value = b.user_agenda[a].header;
		form.notes.value = b.user_agenda[a].description;
		form.edit.value = a;
		0 < b.user_agenda[a].timestamp ? (form.no_end.checked = !1, form.end_time.valueAsNumber = b.user_agenda[a].timestamp) : (form.no_end.checked = !0, form.end_time.value = "");
		form_manual_events();
		po_list.forEach(c => c.style.display = "none");
		po_list[2].style.display = "block"
	})
}

function insertUserAssignment(a, b, c, d) {
	c = void 0 === c ? null : c;
	d = void 0 === d ? !1 : d;
	"div" != b.nodeName.toLowerCase() && (b = b.querySelector(".list_item"));
	b.id = `U_${a.id}`;
	b.querySelector(".assignment_header").textContent = a.header;
	b.dataset.course = "#user-course";
	var f = 20 * (a.description.split("\n").length + 1);
	let k = b.querySelector(".assignment_descripion textarea");
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
	-1 == a.timestamp && b.classList.add("system_message");
	c && (c = document.getElementById(c), b = d ? c.insertBefore(b, c.children[0]) : c.appendChild(b), c = b.querySelectorAll("a.button"), c[0].addEventListener("click", () => editUA(a.id)), c[1].addEventListener("click", () => removeUA(a.id)), c[2].addEventListener("click", h => toggle(b, a.toggleFunc, 1)), c[3].addEventListener("click",
		h => toggle(b, a.toggleFunc, 0)))
}

const CALENDARS = 3; // moodle, webwork, cs
var assignments_promises = {};

function addAssignmentsToList(a, b) {
	assignments_promises[b] = a;
	Object.keys(assignments_promises).length == CALENDARS && chrome.storage.local.get({
		moodle_cal: !0,
		cs_cal: !1,
		wwcal_switch: !1,
		quick_login: !0,
		enable_login: !0,
		user_agenda: {}
	}, c => {
		var d = {};
		d.moodle = c.quick_login && c.enable_login && c.moodle_cal;
		d.webwork = c.quick_login && c.enable_login && c.wwcal_switch;
		d.cs = c.cs_cal;
		let f = [], k = 0, h = [], e = [];
		var g = c.user_agenda;
		Object.keys(g).forEach(l => {
			g[l].id = l;
			g[l].toggleFunc = () => toggleFinishedUA(l);
			g[l].sys = "ua";
			g[l].done ? e.push(g[l]) : h.push(g[l])
		});
		for (let l of Object.keys(assignments_promises)) d[l] && f.push(assignments_promises[l]);
		for (let l of f) l().then(m => {
			h = h.concat(m.new_list);
			e = e.concat(m.finished_list);
			++k == f.length && insertAssignments(h, e)
		}).catch(m => {
			insertMessage(m.msg, m.is_error);
			++k == f.length && insertAssignments(h, e)
		});
		0 == f.length && (insertAssignments(h, e), insertMessage(
			'משיכת מטלות הבית עבור מודל, וובוורק ומדמ"ח כבויה. ' +
			'יש להגדיר הצגת מטלות בית עבור המערכות הרצויות בהגדרות התוסף',
			!1))
	})
}

if (document.title === "ארגונית++") {
	var po_list = [document.getElementById("new_assignments"), document.getElementById("finished_assignments"), document.getElementById("add_assignment")],
		po_tabs = document.querySelectorAll("#tabs > .tab");
	for (let a = 0; a < po_tabs.length; a++) po_tabs[a].addEventListener("click", () => {
		for (let b = 0; b < po_tabs.length; b++)
			po_tabs[b].className = b === a ? "tab current" : "tab", po_list[b].style.display = b === a ? "block" : "none"
	});
	chrome.storage.local.get({gmail: !0}, a => {
		var b = {
				ad: "ethan.amiran@gmail.com",
				su: "יצירת קשר - Technion++"
			},
			c = a.gmail ? "https://mail.google.com/mail/u/0/?view=cm&to={1}&su={2}&fs=1&tf=1" : "mailto:{1}?subject={2}";
		c = c.replace("{1}", b.ad).replace("{2}", b.su);
		document.getElementById("mailtome").setAttribute("href", c);
		a.gmail && document.getElementById("mailtome").setAttribute("target", "_blank")
	});
	document.getElementById("goToSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
	window.addEventListener("contextmenu", a => a.preventDefault());
	var form = document.querySelector("form"), input_counters = form.querySelectorAll("span");
	form.subject.addEventListener("input", () => input_counters[0].textContent = form.subject.value.length);
	form.notes.addEventListener("input", () => input_counters[1].textContent = form.notes.value.length);
	form.no_end.addEventListener("input", () => form.end_time.disabled = form.no_end.checked);
}

function form_manual_events() {
	input_counters[0].textContent = form.subject.value.length;
	input_counters[1].textContent = form.notes.value.length;
	form.end_time.disabled = form.no_end.checked
}

function form_reset_all() {
	form.reset();
	form.edit.value = "0";
	form_manual_events()
}

function form_submit() {
	0 == form.subject.value.length ? alert("חובה למלא נושא למטלה") : form.no_end.checked || "" !== form.end_time.value ? !form.no_end.checked && form.end_time.valueAsNumber < Date.now() ? alert("תאריך הסיום שבחרת כבר עבר, נא לבחור תאריך סיום חדש") :
		chrome.storage.local.get({user_agenda: {}}, a => {
			let b = a.user_agenda;
			a = parseInt(form.edit.value);
			let c = 0 < a ? b.hasOwnProperty(a) : !1, d = c ? a : Date.now();
			b[d] = {
				header: form.subject.value.slice(0, 50),
				description: form.notes.value.slice(0, 280),
				timestamp: !form.no_end.checked && 0 < parseInt(form.end_time.valueAsNumber) ? parseInt(form.end_time.valueAsNumber) : 0,
				done: c ? b[d].done : !1
			};
			50 < Object.keys(b).length ? alert("לא ניתן ליצור יותר מ־50 מטלות משתמש.") :
				chrome.storage.local.set({user_agenda: b}, () => {
					b[d].id = d;
					if (c) {
						var f = document.querySelector(`#U_${d}`);
						insertUserAssignment(b[d], f);
						document.querySelector(".tab.current").click()
					} else f = loadTemplate("userAgenda"), b[d].toggleFunc = () => toggleFinishedUA(d), insertUserAssignment(b[d], f, "new_assignments", !0), checkForEmpty(), po_tabs[0].click();
					form_reset_all()
				})
		}) : alert('חובה לבחור תאריך סיום או לסמן את "ללא תאריך סיום"')
}

if (document.title == "ארגונית++") {
	form.addEventListener("submit", a => {
		a.preventDefault();
		form_submit()
	});
	var form_buttons = form.querySelectorAll("a.button");
	form_buttons[0].addEventListener("click", () => form_submit());
	form_buttons[1].addEventListener("click", () => {
		form_reset_all();
		let a = document.querySelector(".tab.current");
		a == po_tabs[2] ? po_tabs[0].click() : a.click()
	});
	po_tabs[2].addEventListener("click", form_reset_all);
	var need_refresh = document.querySelector("#need_refresh");
	need_refresh.querySelector("a.button").addEventListener("click", () => window.location.reload());
	setInterval(() => chrome.storage.local.get({cal_seen: 0}, a => {
		0 != a.cal_seen && (need_refresh.style.display = "block")
	}), 6E4);
	var filters_div = document.getElementById("filtering"), filter = document.getElementById("course_filter"),
		filters_toggle = document.getElementById("filters_toggle");
	filter.addEventListener("change", () => {
		document.querySelectorAll(`.list_item[data-course^='#${filter.value.replace('"', '\\"').replace("'", "\\'")}']`)
			.forEach(a => a.classList.remove("hidden"));
		document.querySelectorAll(`.list_item:not([data-course^='#${filter.value.replace('"', '\\"').replace("'", "\\'")}'])`)
			.forEach(a => a.classList.add("hidden"));
		checkForEmpty()
	});
	filters_toggle.addEventListener("click", () => {
		filter.selectedIndex = 0;
		filter.dispatchEvent(new Event("change"));
		filters_toggle.textContent = "סינון מטלות" == filters_toggle.textContent ? "בטל סינון" : "סינון מטלות";
		filters_div.classList.toggle("hidden")
	});
	chrome.storage.local.get({organizer_fullscreen: !1, organizer_darkmode: !1}, a => {
		let b = document.getElementById("fullscreen");
		a.organizer_fullscreen && (b.checked = !0, chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: "maximized"}));
		b.addEventListener("change", d => {
			chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {state: b.checked ? "maximized" : "normal"});
			chrome.storage.local.set({organizer_fullscreen: b.checked})
		});
		let c = document.getElementById("darkmode");
		a.organizer_darkmode && (c.checked = !0,
			document.querySelector("html").setAttribute("tplus", "dm"));
		c.addEventListener("change", d => {
			c.checked ? document.querySelector("html").setAttribute("tplus", "dm") : document.querySelector("html").removeAttribute("tplus");
			chrome.storage.local.set({organizer_darkmode: c.checked})
		})
	});
}