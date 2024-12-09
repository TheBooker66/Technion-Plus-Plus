'use strict';

import {CommonPopup} from './common_popup.js';

var $jscomp = $jscomp || {};
$jscomp.scope = {};
$jscomp.ASSUME_ES5 = !1;
$jscomp.ASSUME_NO_NATIVE_MAP = !1;
$jscomp.ASSUME_NO_NATIVE_SET = !1;
$jscomp.SIMPLE_FROUND_POLYFILL = !1;
$jscomp.ISOLATE_POLYFILLS = !1;
$jscomp.defineProperty = $jscomp.ASSUME_ES5 || "function" == typeof Object.defineProperties ? Object.defineProperty : function (a, b, d) {
	if (a == Array.prototype || a == Object.prototype) return a;
	a[b] = d.value;
	return a
};
$jscomp.getGlobal = function (a) {
	a = ["object" == typeof globalThis && globalThis, a, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
	for (var b = 0; b < a.length; ++b) {
		var d = a[b];
		if (d && d.Math == Math) return d
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
	var d = $jscomp.propertyToPolyfillSymbol[b];
	if (null == d) return a[b];
	d = a[d];
	return void 0 !== d ? d : a[b]
};
$jscomp.polyfill = function (a, b, d, e) {
	b && ($jscomp.ISOLATE_POLYFILLS ? $jscomp.polyfillIsolated(a, b, d, e) : $jscomp.polyfillUnisolated(a, b, d, e))
};
$jscomp.polyfillUnisolated = function (a, b, d, e) {
	d = $jscomp.global;
	a = a.split(".");
	for (e = 0; e < a.length - 1; e++) {
		var f = a[e];
		if (!(f in d)) return;
		d = d[f]
	}
	a = a[a.length - 1];
	e = d[a];
	b = b(e);
	b != e && null != b && $jscomp.defineProperty(d, a, {configurable: !0, writable: !0, value: b})
};
$jscomp.polyfillIsolated = function (a, b, d, e) {
	var f = a.split(".");
	a = 1 === f.length;
	e = f[0];
	e = !a && e in $jscomp.polyfills ? $jscomp.polyfills : $jscomp.global;
	for (var l = 0; l < f.length - 1; l++) {
		var n = f[l];
		if (!(n in e)) return;
		e = e[n]
	}
	f = f[f.length - 1];
	d = $jscomp.IS_SYMBOL_NATIVE && "es6" === d ? e[f] : null;
	b = b(d);
	null != b && (a ? $jscomp.defineProperty($jscomp.polyfills, f, {
		configurable: !0,
		writable: !0,
		value: b
	}) : b !== d && ($jscomp.propertyToPolyfillSymbol[f] = $jscomp.IS_SYMBOL_NATIVE ? $jscomp.global.Symbol(f) : $jscomp.POLYFILL_PREFIX + f, f =
		$jscomp.propertyToPolyfillSymbol[f], $jscomp.defineProperty(e, f, {configurable: !0, writable: !0, value: b})))
};
$jscomp.underscoreProtoCanBeSet = function () {
	var a = {a: !0}, b = {};
	try {
		return b.__proto__ = a, b.a
	} catch (d) {
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
	var d = a.next();
	$jscomp.generator.ensureIteratorResultIsObject_(d);
	if (d.done) this.yieldResult = d.value, this.nextAddress = b; else return this.yieldAllIterator_ = a, this.yield(d.value, b)
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
$jscomp.generator.Context.prototype.enterFinallyBlock = function (a, b, d) {
	d ? this.finallyContexts_[d] = this.abruptCompletion_ : this.finallyContexts_ = [this.abruptCompletion_];
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
	if (b) return this.yieldAllStep_("return" in b ? b["return"] : function (d) {
		return {value: d, done: !0}
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
$jscomp.generator.Engine_.prototype.yieldAllStep_ = function (a, b, d) {
	try {
		var e = a.call(this.context_.yieldAllIterator_, b);
		$jscomp.generator.ensureIteratorResultIsObject_(e);
		if (!e.done) return this.context_.stop_(), e;
		var f = e.value
	} catch (l) {
		return this.context_.yieldAllIterator_ = null, this.context_.throw_(l), this.nextStep_()
	}
	this.context_.yieldAllIterator_ = null;
	d.call(this.context_, f);
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
	function b(e) {
		return a.next(e)
	}

	function d(e) {
		return a.throw(e)
	}

	return new Promise(function (e, f) {
		function l(n) {
			n.done ? e(n.value) : Promise.resolve(n.value).then(b, d).then(l, f)
		}

		l(a.next())
	})
};
$jscomp.asyncExecutePromiseGeneratorFunction = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(a())
};
$jscomp.asyncExecutePromiseGeneratorProgram = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(new $jscomp.generator.Generator_(new $jscomp.generator.Engine_(a)))
};
(function () {
	function a(c) {
		var h = [], k = 0;
		for (let g = c.length - 1; 0 <= g; g--) h[k++] = c[g];
		return h.join("")
	}

	function b(c, h) {
		var k = c.split("");
		for (let g = 0; g < k.length; g++) k[g] = String.fromCharCode(c.charCodeAt(g) ^ h.charCodeAt(g));
		return k
	}

	function d(c, h, k) {
		for (let g = 0; g < c.length; g++)
			c[g].addEventListener("click", () => {
				if (!c[g].classList.contains("current")) {
					for (let m = 0; m < c.length; m++)
						c[m].className = m === g ? "tab current" : "tab", h[m].style.display = m === g ? "block" : "none";
					k && k(g)
				}
			})
	}

	var e = new CommonPopup;
	e.css_list = ["main"];
	e.popupWrap();

	function checkOS() {
		if (navigator.userAgentData) {
			const hints = ["architecture", "model", "platform", "platformVersion", "uaFullVersion"];
			navigator.userAgentData.getHighEntropyValues(hints)
				.then(ua => {
					console.log(ua);
				});
			return navigator.userAgentData;
		} else {
			console.log(n.userAgent);
			return "navigator.userAgentData is not supported!";
		}
	}

	checkOS().toString().includes("Android") || chrome.action.getBadgeBackgroundColor({}, c => {
		chrome.action.getBadgeText({}, h => {
			215 == c[0] && 0 == c[1] && 34 == c[2] && "!" == h && (chrome.action.setBadgeText({text: ""}), document.getElementById("bus_error").style.display = "block")
		})
	});
	var f = document.getElementById("microsoft_open");
	f.addEventListener("click", () => f.className = "collapsed");
	document.getElementById("microsoft_link").addEventListener("click", function () {
		window.open("https://techwww.technion.ac.il/cgi-bin/newuser/newuser.pl")
	});
	e = document.getElementById("more_links");
	var l = document.getElementById("print"), n = document.getElementById("apps_links");
	[{b: "gotoPrint", from: e, to: l},
		{b: "gotoApps", from: e, to: n},
		{b: "returnFromPrint", from: l, to: e},
		{b: "returnFromApps", from: n, to: e}].forEach(c => {
		document.getElementById(c.b).addEventListener("click", () => {
			c.to.style.display = "block";
			c.from.style.display = "none";
			f.className = "collapse"
		})
	});
	var r = {
		type: "popup", focused: !0, state: "normal", url: "html/organizer.html", height: Math.min(window.screen.height -
			40, 720), width: Math.min(window.screen.width - 20, 1200), top: 0, left: 0
	};
	r.top = parseInt((window.screen.height - r.height) / 2);
	r.left = parseInt((window.screen.width - r.width) / 2);
	document.getElementById("organizer").addEventListener("click", () => chrome.windows.create(r));
	var t = document.getElementById("tools_content").getElementsByTagName("a");
	for (let c = 0; c < t.length; c++)
		[3, 4, 6].includes(c) || t[c].addEventListener("click", () => { // 3 - Organiser, 4 - grades sheet, 6 - printer
			window.location.href = "html/" + t[c].id + ".html"
		});
	e = document.querySelectorAll("#more_links > div");
	d(e[0].querySelectorAll(".tab"), Array.from(e).slice(1), c => {
		f.className = "collapse"
	});
	e = document.getElementById("secondary_tabs").getElementsByTagName("div");
	l = document.getElementById("print").getElementsByTagName("div");
	d(e, l, null);
	document.getElementById("cantlogin").getElementsByTagName("u")[0].addEventListener("click", function () {
		chrome.runtime.openOptionsPage(function () {
			chrome.runtime.lastError && console.log("TE_p: " + chrome.runtime.lastError.message)
		})
	});
	document.getElementById("quick_login").addEventListener("change", function () {
		chrome.storage.local.set({quick_login: document.getElementById("quick_login").checked}, () => {
			chrome.runtime.lastError && console.log("TE_popup_login: " + chrome.runtime.lastError.message)
		})
	});
	document.getElementById("mutealerts_toggle").addEventListener("change", function () {
		chrome.storage.local.set({alerts_sound: document.getElementById("mutealerts_toggle").checked}, () => {
			chrome.runtime.lastError && console.log("TE_popup_mutealerts: " +
				chrome.runtime.lastError.message)
		})
	});
	chrome.storage.local.get({
		enable_login: !1,
		quick_login: !0,
		alerts_sound: !0,
		gmail: !0,
		moodle_cal: !0,
		remoodle: !1,
		remoodle_angle: 120,
		cal_seen: 0,
		cs_cal: !1,
		uidn_arr: ["", ""],
		wwcal_switch: !1,
		dl_current: 0,
		username: "",
		server: !0
	}, function (c) {
		document.getElementById("quick_login").checked = c.quick_login;
		document.getElementById("mutealerts_toggle").checked = c.alerts_sound;
		document.getElementById("cantlogin").style.display = c.enable_login ? "none" : "block";
		document.getElementById("cal_moodle").style.display =
			c.enable_login && c.moodle_cal && c.quick_login ? "block" : "none";
		document.getElementById("cal_cs").style.display = c.cs_cal ? "block" : "none";
		document.getElementById("cal_webwork").style.display = c.enable_login && c.quick_login && c.wwcal_switch ? "block" : "none";
		var h = ["cal_moodle", "cal_cs", "cal_mathnet", "cal_webwork"];
		for (var k = 0; k < h.length; k++)
			c.cal_seen & Math.pow(2, k) && (document.getElementById(h[k]).className = "major hw");
		0 != c.dl_current && document.getElementById("downloads").classList.add("active");
		h = a(b(c.uidn_arr[0] + "", c.uidn_arr[1]));
		h = "" == h ? "הקלד מספר זהות כאן" : h;
		k = c.gmail && !chrome.runtime.lastError;
		var g = document.getElementById("print").getElementsByTagName("a");
		for (let p = 0; p < g.length; p++)
			g[p].setAttribute("href", k ? "https://mail.google.com/mail/u/0/?view=cm&to=print." + g[p].id + "@campus.technion.ac.il&su=" + h + "&fs=1&tf=1" : "mailto:print." + g[p].id + "@campus.technion.ac.il?subject=" +
				h), "הקלד מספר זהות כאן" === h && g[p].addEventListener("click", () => {
				chrome.runtime.sendMessage({
						mess_t: "silent_notification",
						message: 'מיד ייפתח חלון לשליחת מייל בהתאם לבחירתך. עלייך למלא מספר ת"ז בנושא ולצרף את הקבצים המבוקשים להדפסה.'
					},
					{}, () => {
						chrome.runtime.lastError && console.log("TE_popup_printers: " + chrome.runtime.lastError.message)
					})
			});
		var m = document.getElementById("UGS_Link"), v = () => {
			m.textContent = 7 > m.textContent.length ? m.textContent + "." : "\u05d8\u05d5\u05e2\u05df"
		};
		m.addEventListener("click", function () {
			return $jscomp.asyncExecutePromiseGeneratorFunction(function* () {
				let p = setInterval(v, 500);
				var q = yield fetch("https://students.technion.ac.il/auth/oidc/", {method: "HEAD"}).then(w => w.url).catch(() => "https://students.technion.ac.il/auth/oidc/");
				if (c.enable_login && c.quick_login && q.includes("?")) {
					q = q.split("?");
					var u = new URLSearchParams(q[1]);
					u.delete("prompt");
					u.append("login_hint", c.username + "@" + (c.server ? "campus." : "") + "technion.ac.il");
					q = q[0] + "?" + u.toString()
				}
				chrome.tabs.create({url: q}, () => {
					clearInterval(p);
					m.textContent = "Students"
				})
			})
		})
	})
})();
