'use strict';
import {CommonCalendar} from "./p_cal_common.js";
import {CommonPopup} from "./p_common.js";

var $jscomp = $jscomp || {};
$jscomp.scope = {};
$jscomp.ASSUME_ES5 = !1;
$jscomp.ASSUME_NO_NATIVE_MAP = !1;
$jscomp.ASSUME_NO_NATIVE_SET = !1;
$jscomp.SIMPLE_FROUND_POLYFILL = !1;
$jscomp.ISOLATE_POLYFILLS = !1;
$jscomp.defineProperty = $jscomp.ASSUME_ES5 || "function" == typeof Object.defineProperties ? Object.defineProperty : function (a, b, c) {
	if (a == Array.prototype || a == Object.prototype) return a;
	a[b] = c.value;
	return a
};
$jscomp.getGlobal = function (a) {
	a = ["object" == typeof globalThis && globalThis, a, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
	for (var b = 0; b < a.length; ++b) {
		var c = a[b];
		if (c && c.Math == Math) return c
	}
	throw Error("Cannot find global object");
};
$jscomp.global = $jscomp.getGlobal(this);
$jscomp.IS_SYMBOL_NATIVE = "function" === typeof Symbol && "symbol" === typeof Symbol("x");
$jscomp.TRUST_ES6_POLYFILLS = !$jscomp.ISOLATE_POLYFILLS || $jscomp.IS_SYMBOL_NATIVE;
$jscomp.polyfills = {};
$jscomp.propertyToPolyfillSymbol = {};
$jscomp.POLYFILL_PREFIX = "$jscp$";
var $jscomp$lookupPolyfilledValue = function (a, b) {
	var c = $jscomp.propertyToPolyfillSymbol[b];
	if (null == c) return a[b];
	c = a[c];
	return void 0 !== c ? c : a[b]
};
$jscomp.polyfill = function (a, b, c, d) {
	b && ($jscomp.ISOLATE_POLYFILLS ? $jscomp.polyfillIsolated(a, b, c, d) : $jscomp.polyfillUnisolated(a, b, c, d))
};
$jscomp.polyfillUnisolated = function (a, b, c, d) {
	c = $jscomp.global;
	a = a.split(".");
	for (d = 0; d < a.length - 1; d++) {
		var f = a[d];
		if (!(f in c)) return;
		c = c[f]
	}
	a = a[a.length - 1];
	d = c[a];
	b = b(d);
	b != d && null != b && $jscomp.defineProperty(c, a, {configurable: !0, writable: !0, value: b})
};
$jscomp.polyfillIsolated = function (a, b, c, d) {
	var f = a.split(".");
	a = 1 === f.length;
	d = f[0];
	d = !a && d in $jscomp.polyfills ? $jscomp.polyfills : $jscomp.global;
	for (var k = 0; k < f.length - 1; k++) {
		var h = f[k];
		if (!(h in d)) return;
		d = d[h]
	}
	f = f[f.length - 1];
	c = $jscomp.IS_SYMBOL_NATIVE && "es6" === c ? d[f] : null;
	b = b(c);
	null != b && (a ? $jscomp.defineProperty($jscomp.polyfills, f, {
		configurable: !0,
		writable: !0,
		value: b
	}) : b !== c && ($jscomp.propertyToPolyfillSymbol[f] = $jscomp.IS_SYMBOL_NATIVE ? $jscomp.global.Symbol(f) : $jscomp.POLYFILL_PREFIX + f, f =
		$jscomp.propertyToPolyfillSymbol[f], $jscomp.defineProperty(d, f, {configurable: !0, writable: !0, value: b})))
};
$jscomp.underscoreProtoCanBeSet = function () {
	var a = {a: !0}, b = {};
	try {
		return b.__proto__ = a, b.a
	} catch (c) {
	}
	return !1
};
$jscomp.setPrototypeOf = $jscomp.TRUST_ES6_POLYFILLS && "function" == typeof Object.setPrototypeOf ? Object.setPrototypeOf : $jscomp.underscoreProtoCanBeSet() ? function (a, b) {
	a.__proto__ = b;
	if (a.__proto__ !== b) throw new TypeError(a + " is not extensible");
	return a
} : null;
$jscomp.arrayIteratorImpl = function (a) {
	var b = 0;
	return function () {
		return b < a.length ? {done: !1, value: a[b++]} : {done: !0}
	}
};
$jscomp.arrayIterator = function (a) {
	return {next: $jscomp.arrayIteratorImpl(a)}
};
$jscomp.makeIterator = function (a) {
	var b = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];
	return b ? b.call(a) : $jscomp.arrayIterator(a)
};
$jscomp.generator = {};
$jscomp.generator.ensureIteratorResultIsObject_ = function (a) {
	if (!(a instanceof Object)) throw new TypeError("Iterator result " + a + " is not an object");
};
$jscomp.generator.Context = function () {
	this.isRunning_ = !1;
	this.yieldAllIterator_ = null;
	this.yieldResult = void 0;
	this.nextAddress = 1;
	this.finallyAddress_ = this.catchAddress_ = 0;
	this.finallyContexts_ = this.abruptCompletion_ = null
};
$jscomp.generator.Context.prototype.start_ = function () {
	if (this.isRunning_) throw new TypeError("Generator is already running");
	this.isRunning_ = !0
};
$jscomp.generator.Context.prototype.stop_ = function () {
	this.isRunning_ = !1
};
$jscomp.generator.Context.prototype.jumpToErrorHandler_ = function () {
	this.nextAddress = this.catchAddress_ || this.finallyAddress_
};
$jscomp.generator.Context.prototype.next_ = function (a) {
	this.yieldResult = a
};
$jscomp.generator.Context.prototype.throw_ = function (a) {
	this.abruptCompletion_ = {exception: a, isException: !0};
	this.jumpToErrorHandler_()
};
$jscomp.generator.Context.prototype.return = function (a) {
	this.abruptCompletion_ = {return: a};
	this.nextAddress = this.finallyAddress_
};
$jscomp.generator.Context.prototype.jumpThroughFinallyBlocks = function (a) {
	this.abruptCompletion_ = {jumpTo: a};
	this.nextAddress = this.finallyAddress_
};
$jscomp.generator.Context.prototype.yield = function (a, b) {
	this.nextAddress = b;
	return {value: a}
};
$jscomp.generator.Context.prototype.yieldAll = function (a, b) {
	a = $jscomp.makeIterator(a);
	var c = a.next();
	$jscomp.generator.ensureIteratorResultIsObject_(c);
	if (c.done) this.yieldResult = c.value, this.nextAddress = b; else return this.yieldAllIterator_ = a, this.yield(c.value, b)
};
$jscomp.generator.Context.prototype.jumpTo = function (a) {
	this.nextAddress = a
};
$jscomp.generator.Context.prototype.jumpToEnd = function () {
	this.nextAddress = 0
};
$jscomp.generator.Context.prototype.setCatchFinallyBlocks = function (a, b) {
	this.catchAddress_ = a;
	void 0 != b && (this.finallyAddress_ = b)
};
$jscomp.generator.Context.prototype.setFinallyBlock = function (a) {
	this.catchAddress_ = 0;
	this.finallyAddress_ = a || 0
};
$jscomp.generator.Context.prototype.leaveTryBlock = function (a, b) {
	this.nextAddress = a;
	this.catchAddress_ = b || 0
};
$jscomp.generator.Context.prototype.enterCatchBlock = function (a) {
	this.catchAddress_ = a || 0;
	a = this.abruptCompletion_.exception;
	this.abruptCompletion_ = null;
	return a
};
$jscomp.generator.Context.prototype.enterFinallyBlock = function (a, b, c) {
	c ? this.finallyContexts_[c] = this.abruptCompletion_ : this.finallyContexts_ = [this.abruptCompletion_];
	this.catchAddress_ = a || 0;
	this.finallyAddress_ = b || 0
};
$jscomp.generator.Context.prototype.leaveFinallyBlock = function (a, b) {
	b = this.finallyContexts_.splice(b || 0)[0];
	if (b = this.abruptCompletion_ = this.abruptCompletion_ || b) {
		if (b.isException) return this.jumpToErrorHandler_();
		void 0 != b.jumpTo && this.finallyAddress_ < b.jumpTo ? (this.nextAddress = b.jumpTo, this.abruptCompletion_ = null) : this.nextAddress = this.finallyAddress_
	} else this.nextAddress = a
};
$jscomp.generator.Context.prototype.forIn = function (a) {
	return new $jscomp.generator.Context.PropertyIterator(a)
};
$jscomp.generator.Context.PropertyIterator = function (a) {
	this.object_ = a;
	this.properties_ = [];
	for (var b in a) this.properties_.push(b);
	this.properties_.reverse()
};
$jscomp.generator.Context.PropertyIterator.prototype.getNext = function () {
	for (; 0 < this.properties_.length;) {
		var a = this.properties_.pop();
		if (a in this.object_) return a
	}
	return null
};
$jscomp.generator.Engine_ = function (a) {
	this.context_ = new $jscomp.generator.Context;
	this.program_ = a
};
$jscomp.generator.Engine_.prototype.next_ = function (a) {
	this.context_.start_();
	if (this.context_.yieldAllIterator_) return this.yieldAllStep_(this.context_.yieldAllIterator_.next, a, this.context_.next_);
	this.context_.next_(a);
	return this.nextStep_()
};
$jscomp.generator.Engine_.prototype.return_ = function (a) {
	this.context_.start_();
	var b = this.context_.yieldAllIterator_;
	if (b) return this.yieldAllStep_("return" in b ? b["return"] : function (c) {
		return {value: c, done: !0}
	}, a, this.context_.return);
	this.context_.return(a);
	return this.nextStep_()
};
$jscomp.generator.Engine_.prototype.throw_ = function (a) {
	this.context_.start_();
	if (this.context_.yieldAllIterator_) return this.yieldAllStep_(this.context_.yieldAllIterator_["throw"], a, this.context_.next_);
	this.context_.throw_(a);
	return this.nextStep_()
};
$jscomp.generator.Engine_.prototype.yieldAllStep_ = function (a, b, c) {
	try {
		var d = a.call(this.context_.yieldAllIterator_, b);
		$jscomp.generator.ensureIteratorResultIsObject_(d);
		if (!d.done) return this.context_.stop_(), d;
		var f = d.value
	} catch (k) {
		return this.context_.yieldAllIterator_ = null, this.context_.throw_(k), this.nextStep_()
	}
	this.context_.yieldAllIterator_ = null;
	c.call(this.context_, f);
	return this.nextStep_()
};
$jscomp.generator.Engine_.prototype.nextStep_ = function () {
	for (; this.context_.nextAddress;) try {
		var a = this.program_(this.context_);
		if (a) return this.context_.stop_(), {value: a.value, done: !1}
	} catch (b) {
		this.context_.yieldResult = void 0, this.context_.throw_(b)
	}
	this.context_.stop_();
	if (this.context_.abruptCompletion_) {
		a = this.context_.abruptCompletion_;
		this.context_.abruptCompletion_ = null;
		if (a.isException) throw a.exception;
		return {value: a.return, done: !0}
	}
	return {value: void 0, done: !0}
};
$jscomp.generator.Generator_ = function (a) {
	this.next = function (b) {
		return a.next_(b)
	};
	this.throw = function (b) {
		return a.throw_(b)
	};
	this.return = function (b) {
		return a.return_(b)
	};
	this[Symbol.iterator] = function () {
		return this
	}
};
$jscomp.generator.createGenerator = function (a, b) {
	b = new $jscomp.generator.Generator_(new $jscomp.generator.Engine_(b));
	$jscomp.setPrototypeOf && a.prototype && $jscomp.setPrototypeOf(b, a.prototype);
	return b
};
$jscomp.asyncExecutePromiseGenerator = function (a) {
	function b(d) {
		return a.next(d)
	}

	function c(d) {
		return a.throw(d)
	}

	return new Promise(function (d, f) {
		function k(h) {
			h.done ? d(h.value) : Promise.resolve(h.value).then(b, c).then(k, f)
		}

		k(a.next())
	})
};
$jscomp.asyncExecutePromiseGeneratorFunction = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(a())
};
$jscomp.asyncExecutePromiseGeneratorProgram = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(new $jscomp.generator.Generator_(new $jscomp.generator.Engine_(a)))
};

// function XHR(a, b, c, d) {
// 	c = void 0 === c ? "" : c;
// 	d = void 0 === d ? !1 : d;
// 	return new Promise((f, k) => {
// 		var h = {
// 			headers: {
// 				accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
// 				"accept-language": "en-US,en;q=0.9",
// 				"cache-control": "no-cache",
// 				pragma: "no-cache",
// 				"sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"'
// 			}
// 		};
// 		h.method = d ? "head" : "get";
// 		"" != c && (h.method = "post", h.body = c, h.headers["Content-type"] = "application/x-www-form-urlencoded");
// 		fetch(a, h).then(e => $jscomp.asyncExecutePromiseGeneratorFunction(function* () {
// 			if (e.ok) {
// 				var g = {response: "", responseURL: e.url};
// 				"json" == b ? g.response = yield e.json() : (g.response = yield e.text(), "document" == b && (g.response = (new DOMParser).parseFromString(g.response, "text/html")));
// 				f(g)
// 			} else k(e.error())
// 		})).catch(e => {
// 			k(e)
// 		})
// 	})
// }

function loadTemplate(a, b) {
	b = void 0 === b ? document : b;
	a = b.querySelector("template#" + a).content;
	return document.importNode(a, !0)
}

export class OrganizerPopup extends CommonPopup {
	constructor(a) {
		super(a);
		this.title = "";
		this.css_list = []
	}

	popupWrap() {
	}

	XHR(a, b, c) {
		return super.XHR(a, b, void 0 === c ? "" : c)
	}
}

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

const MAX_CALENDARS = 3;
var assignments_promises = {};

function addAssignmentsToList(a, b) {
	assignments_promises[b] = a;
	Object.keys(assignments_promises).length == MAX_CALENDARS && chrome.storage.local.get({
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