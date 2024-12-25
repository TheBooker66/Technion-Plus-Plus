'use strict';

export class CommonCalendar {
	constructor(a, b) {
		this.template_file = "calendar";
		this.common = a;
		this.name = b;
		this.w_days = "ראשון שני שלישי רביעי חמישי שישי שבת".split(" ");
		this.flags = {moodle: 1, cs: 2, mathnet: 4, webwork: 8};
	}

	calendarWrap() {
		var a = [document.getElementById("new_assignments"), document.getElementById("finished_assignments")],
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

	checkForEmpty() {
		["new_assignments", "finished_assignments"].forEach(a => {
			a = document.getElementById(a);
			0 == a.childNodes.length ? a.classList.add("empty_list") : a.classList.remove("empty_list")
		})
	}

	stopSpinning() {
		document.getElementById("spinner").style.display = "none";
		this.checkForEmpty()
	}

	insertMessage(a, b) {
		this.stopSpinning();
		var d = document.getElementById("error").appendChild(document.createElement("div"));
		d.className = b ? "error_bar" : "attention";
		d.textContent = a
	}

	removeCalendarAlert(a) {
		a &= ~this.flags[this.name];
		navigator.appVersion.includes("Android") || a || chrome.action.setBadgeText({text: ""});
		return a
	}

	toggle(a, b, d) {
		b();
		[document.getElementById("new_assignments"), document.getElementById("finished_assignments")][d].appendChild(a);
		this.checkForEmpty()
	}

	openAssignment(a, b) {
		var d = a.querySelector("img");
		d.style.display = "none";
		d.parentNode.classList.add("small_spinner");
		var c = () => {
			d.style.display = "block";
			d.parentNode.classList.remove("small_spinner")
		};
		b().then(c).catch(() => {
			a.setAttribute("style", "background-color: rgba(215, 0, 34, 0.8) !important; border-radius: 3px;");
			setTimeout(() => a.setAttribute("style", ""), 1E3);
			c()
		})
	}

	insertAssignments(a, b) {
		var d = (c, e, f) => {
			e = e.querySelector(".list_item");
			c.is_new && e.classList.add("starred");
			e.querySelector(".assignment_header").textContent = c.header;
			e.querySelector(".course_name").textContent += c.course;
			e.querySelector(".assignment_descripion").textContent = c.description;
			e.querySelector(".end_time").textContent += c.final_date;
			var g = e.querySelectorAll("img");
			g[1].addEventListener("click", h => this.toggle(e, c.toggleFunc, 1));
			g[2].addEventListener("click", h => this.toggle(e, c.toggleFunc, 0));
			g[0].title = "moodle" == this.name ? "עבור להגשה במודל" : "עבור לאתר הקורס";
			g[0].addEventListener("click", h => this.openAssignment(e, c.goToFunc));
			e.querySelector(".assignment_header").addEventListener("click", h => this.openAssignment(e, c.goToFunc));
			document.getElementById(f).appendChild(e)
		};
		this.common.useTemplatesFile(this.template_file, c => {
			var e = this.common.loadTemplate("assignment", c);
			a.forEach(f => d(f, e.cloneNode(!0), "new_assignments"));
			b.forEach(f => d(f, e.cloneNode(!0), "finished_assignments"));
			0 == a.length + b.length && this.insertMessage("לא נמצאו אירועים קרובים לתצוגה.", !1);
			this.stopSpinning()
		})
	}

	progress(a) {
		a().then(b => this.insertAssignments(b.new_list, b.finished_list)).catch(b => this.insertMessage(b.msg, b.is_error))
	}
}