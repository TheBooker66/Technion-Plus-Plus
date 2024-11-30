'use strict';
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
$jscomp.polyfill = function (a, b, d, c) {
	b && ($jscomp.ISOLATE_POLYFILLS ? $jscomp.polyfillIsolated(a, b, d, c) : $jscomp.polyfillUnisolated(a, b, d, c))
};
$jscomp.polyfillUnisolated = function (a, b, d, c) {
	d = $jscomp.global;
	a = a.split(".");
	for (c = 0; c < a.length - 1; c++) {
		var e = a[c];
		if (!(e in d)) return;
		d = d[e]
	}
	a = a[a.length - 1];
	c = d[a];
	b = b(c);
	b != c && null != b && $jscomp.defineProperty(d, a, {configurable: !0, writable: !0, value: b})
};
$jscomp.polyfillIsolated = function (a, b, d, c) {
	var e = a.split(".");
	a = 1 === e.length;
	c = e[0];
	c = !a && c in $jscomp.polyfills ? $jscomp.polyfills : $jscomp.global;
	for (var f = 0; f < e.length - 1; f++) {
		var g = e[f];
		if (!(g in c)) return;
		c = c[g]
	}
	e = e[e.length - 1];
	d = $jscomp.IS_SYMBOL_NATIVE && "es6" === d ? c[e] : null;
	b = b(d);
	null != b && (a ? $jscomp.defineProperty($jscomp.polyfills, e, {
		configurable: !0,
		writable: !0,
		value: b
	}) : b !== d && ($jscomp.propertyToPolyfillSymbol[e] = $jscomp.IS_SYMBOL_NATIVE ? $jscomp.global.Symbol(e) : $jscomp.POLYFILL_PREFIX + e, e =
		$jscomp.propertyToPolyfillSymbol[e], $jscomp.defineProperty(c, e, {configurable: !0, writable: !0, value: b})))
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
		var c = a.call(this.context_.yieldAllIterator_, b);
		$jscomp.generator.ensureIteratorResultIsObject_(c);
		if (!c.done) return this.context_.stop_(), c;
		var e = c.value
	} catch (f) {
		return this.context_.yieldAllIterator_ = null, this.context_.throw_(f), this.nextStep_()
	}
	this.context_.yieldAllIterator_ = null;
	d.call(this.context_, e);
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
	function b(c) {
		return a.next(c)
	}

	function d(c) {
		return a.throw(c)
	}

	return new Promise(function (c, e) {
		function f(g) {
			g.done ? c(g.value) : Promise.resolve(g.value).then(b, d).then(f, e)
		}

		f(a.next())
	})
};
$jscomp.asyncExecutePromiseGeneratorFunction = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(a())
};
$jscomp.asyncExecutePromiseGeneratorProgram = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(new $jscomp.generator.Generator_(new $jscomp.generator.Engine_(a)))
};

function TE_forcedAutoLogin(a) {
	a = void 0 === a ? !1 : a;
	return new Promise((b, d) => {
		var c = f => {
			console.log("TE_back_M_login: could not connect to moodle. {reason: " + f + "}");
			d()
		}, e = f => {
			console.log("TE_auto_login: connection was made! " + Date.now());
			b(f)
		};
		chrome.storage.local.get({enable_external: !1}, f => {
			f.enable_external ? TE_forcedAutoLoginExternalPromise(e, c) : TE_forcedAutoLoginNormalPromise(e, c, a)
		})
	})
}

function TE_forcedAutoLoginNormalPromise(a, b, d) {
	var c = (e, f) => {
		30 <= f ? (chrome.tabs.remove(e), b("Could not reach moodle, possibly wrong username/password.")) : chrome.tabs.get(e, g => {
			"https://moodle24.technion.ac.il/" == g.url ? (console.log("close the tab"), chrome.tabs.remove(e), XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", d).then(k => a(k))) : setTimeout(() => c(e, f + 1), 500)
		})
	};
	XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", d).then(e => {
		e.responseURL.includes("microsoft") ?
			chrome.storage.local.get({username: "", server: !0, enable_login: !1}, f => {
				if (chrome.runtime.lastError) return b("b_storage - " + chrome.runtime.lastError.message);
				if (!f.enable_login) return b("No username/password");
				var g = e.responseURL.split("?"), k = new URLSearchParams(g[1]);
				k.delete("prompt");
				k.append("login_hint", f.username + "@" + (f.server ? "campus." : "") + "technion.ac.il");
				chrome.tabs.create({url: g[0] + "?" + k.toString(), active: !1}, p => c(p.id, 0))
			}) : a(e)
	}).catch(b)
}

function TE_forcedAutoLoginExternalPromise(a, b) {
	var d = (c, e) => {
		8 <= e ? (chrome.tabs.remove(c), b("Could not login to moodle, possibly wrong username/password.")) : chrome.tabs.get(c, f => {
			XHR("https://moodle24.technion.ac.il/", "document", "").then(g => {
				g.response.querySelector(".usertext") ? (a(g), console.log("close the tab"), chrome.tabs.remove(c)) : setTimeout(() => d(c, e + 1), 1E3)
			})
		})
	};
	XHR("https://moodle24.technion.ac.il/", "document", "").then(c => {
		if (c.response.querySelector(".usertext")) return a(c);
		chrome.tabs.create({
			url: "https://moodle24.technion.ac.il/",
			active: !1
		}, e => d(e.id, 0))
	}).catch(b)
}

function TE_alertNewHW(a) {
	var b = [{mess: "מודל", binary_flag: 1}, {
		mess: 'מדמ"ח',
		binary_flag: 2
	}, {mess: "לא אמור לקרות", binary_flag: 4}, {mess: "WeBWorK", binary_flag: 8}][a];
	TE_reBadge(!1);
	chrome.storage.local.get({cal_seen: 0, hw_alerts: !0}, d => {
		chrome.runtime.lastError && console.log("TE_bg_HWA: " + chrome.runtime.lastError.message);
		d.hw_alerts && TE_notification(`יש לך מטלות חדשות ב${b.mess}!`, !1);
		TE_setStorage({cal_seen: d.cal_seen | b.binary_flag}, "HWA")
	})
}

function TE_loginToMoodle(a) {
	a = void 0 === a ? !1 : a;
	return new Promise((b, d) => {
		var c = f => {
			console.log("TE_back_M_login: could not connect to moodle. {reason: " + f + "}");
			d()
		}, e = f => {
			console.log("TE_auto_login: connection was made! " + Date.now());
			b(f)
		};
		XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", a).then(f => {
			f.responseURL.includes("microsoft") ? chrome.storage.local.get({
				username: "",
				server: !0,
				enable_login: !1
			}, g => {
				if (chrome.runtime.lastError) return c("b_storage - " + chrome.runtime.lastError.message);
				if (!g.enable_login) return c("No username/password");
				var k = f.responseURL.split("?"), p = new URLSearchParams(k[1]);
				p.delete("prompt");
				p.append("login_hint", g.username + "@" + (g.server ? "campus." : "") + "technion.ac.il");
				var h = document.createElement("iframe"), m = () => {
					h.getAttribute("login_over") || (h.setAttribute("timer_over", "1"), c("timer ended"))
				}, l = () => {
					h.getAttribute("timer_over") || (clearTimeout(m), h.setAttribute("login_over", "1"), h.removeEventListener("load", l), XHR("https://moodle24.technion.ac.il/auth/oidc/",
						"document", "", a).then(q => {
						q.responseURL.includes("microsoft") ? c("stuck on microsoft") : e(q)
					}))
				}, n = () => {
					h.addEventListener("load", l);
					h.removeEventListener("load", n)
				};
				document.body.appendChild(h);
				h.addEventListener("load", n);
				h.src = k[0] + "?" + p.toString();
				setTimeout(m, 4E3)
			}) : e(f)
		}).catch(c)
	})
}

function TE_getCoursesMoodle(a) {
	var b = {}, d = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/,
		c = / - (?:\u05e7\u05d9\u05e5|\u05d7\u05d5\u05e8\u05e3|\u05d0\u05d1\u05d9\u05d1)/; // קיץ|חורף|אביב
	a = a.response.getElementsByClassName("coursevisible");
	if (0 == a.length)
		console.log("TE_login: failed to fetch courses.");
	else {
		for (let f = 0; f < a.length; f++) {
			var e = a[f].getElementsByTagName("h3")[0].textContent.replace(c, "").match(d);
			e && (e = e.groups, b[e.cnum.trim()] = e.cname.trim())
		}
		0 < Object.keys(b).length && chrome.storage.local.set({u_courses: b}, () => {
			chrome.runtime.lastError && console.log("TE_chk_get_cnames" + mess + ": " + chrome.runtime.lastError.message)
		})
	}
}

function TE_checkCalendarProp(a) {
	"" === a && XHR("https://moodle24.technion.ac.il/calendar/export.php", "document").then(function (b) {
		var d = b.response.getElementsByName("sesskey")[0].value;
		XHR(b.responseURL, "document", "sesskey=" + d + "&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4").then(function (c) {
			c = "userid=" + c.response.getElementById("calendarexporturl").value.split("userid=")[1].split("&preset_what=all")[0];
			TE_setStorage({calendar_prop: c}, "cal2")
		}).catch(() => console.log("TE_back: prop error"))
	}).catch(() => console.log("TE_back: prop error"))
}

function TE_alertMoodleCalendar(a, b, d, c) {
	a & 1 ? TE_reBadge(!1) : "" !== b && XHR("https://moodle24.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&" + b, "text").then(function (e) {
		var f = d;
		e = e.response.split("BEGIN:VEVENT");
		for (let k = 1; k < e.length; k++) {
			var g = e[k].split("SUMMARY:")[1].split("\n")[0].trim();
			"Attendance" === g || c || g.includes("ערעור") || g.includes("זום") || g.includes("Zoom")
			|| g.includes("הרצאה") || g.includes("תרגול")
			|| (g = g.split(" "), "opens" !== g[g.length - 1] && "opens)" !== g[g.length - 1]
			&& (g = parseInt(e[k].split("UID:")[1].split("@moodle")[0]),
				f = g > f ? g : f))
		}
		f <= d || TE_alertNewHW(0)
	}).catch(() => console.log("TE_back: moodle_cal_error"))
}

function TE_csCalendarCheck(a, b, d) {
	a = maor_p_t(a[0], "", a[1]);
	"" != a && "" != b && (b = `https://grades.cs.technion.ac.il/cal/${a}/${encodeURIComponent(b)}`, XHR(b, "text").then(function (c) {
		console.log("Checking GR++...");
		c = c.response.split("BEGIN:VEVENT");
		if (1 != c.length) {
			for (var e = Date.now(), f = new Set, g = {
					banned: /Exam|moed| - Late|\u05d4\u05e8\u05e6\u05d0\u05d4|\u05ea\u05e8\u05d2\u05d5\u05dc/,
					summary: /SUMMARY;LANGUAGE=en-US:(.+)/,
					uid: /UID:([0-9.a-zA-Z-]+)/,
					time: /(?<Y>[0-9]{4})(?<M>[0-9]{2})(?<D>[0-9]{2})(T(?<TH>[0-9]{2})(?<TM>[0-9]{2}))?/
				},
				     k = 1; k < c.length; k++) {
				var p = c[k].match(g.summary)[1];
				let m = p.split("(")[0].trim();
				if (g.banned.test(m)) continue;
				let l = c[k].match(g.uid)[1] || p;
				var h = c[k].match(g.time).groups;
				h = new Date(`${h.Y}-${h.M}-${h.D}T${h.TH || 23}:${h.TM || 59}:00+03:00`);
				if (!(h < e || h > e + 2592E6)) {
					if ("icspasswordexpires" == l) {
						f.clear();
						TE_notification('\u05e1\u05d9\u05e1\u05de\u05ea \u05d4\u05d9\u05d5\u05de\u05df \u05e9\u05dc \u05d4\u05e6\u05d2\u05ea \u05d4\u05de\u05d8\u05dc\u05d5\u05ea \u05e9\u05dc \u05de\u05d3\u05de"\u05d7 \u05ea\u05e4\u05d5\u05d2 \u05d1\u05e7\u05e8\u05d5\u05d1, \u05d0\u05e0\u05d0 \u05db\u05e0\u05e1 \u05d1\u05d3\u05d7\u05d9\u05e4\u05d5\u05ea \u05dc\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05ea\u05d5\u05e1\u05e3 \u05dc\u05d4\u05d5\u05e8\u05d0\u05d5\u05ea \u05d7\u05d9\u05d3\u05d5\u05e9 \u05d4\u05e1\u05d9\u05e1\u05de\u05d4!',
							!1);
						break
					}
					h = l.includes(".PHW");
					p = p.split("(")[1].split(")")[0];
					h ? f.delete(l.replace(".PHW", ".HW")) : (f.add(l), d.hasOwnProperty(p) && d[p].includes("[[" + m + "]]") && f.delete(l))
				}
			}
			0 < f.size && TE_alertNewHW(1);
			TE_setStorage({cscal_update: e}, "cal332122")
		}
	}).catch(() => console.log("TE_back: cal_cs_error")))
}

function TE_getWebwork(a, b) {
	return $jscomp.asyncExecutePromiseGeneratorFunction(function* () {
		var d = {}, c = /(?<cname>.+)\s*-\s*(?<cnum>[0-9]+)/,
			e = / - (?:\u05e7\u05d9\u05e5|\u05d7\u05d5\u05e8\u05e3|\u05d0\u05d1\u05d9\u05d1)/,
			f = /webwork|\u05d5\u05d5\u05d1\u05d5\u05d5\u05e8\u05e7|\u05d5\u05d5\u05d1-\u05d5\u05d5\u05e8\u05e7/i,
			g = "104000 104003 104004 104012 104013 104016 104018 104019 104022 104031 104032 104033 104034 104035 104036 104038 104041 104042 104043 104044 104064 104065 104066 104131 104136 104166 104174 104192 104195 104215 104220 104221 104228 104281 104285 104295".split(" "),
			k = a.response.getElementsByClassName("coursevisible");
		if (0 == k.length) console.log("TE_login: failed to fetch webwork courses."); else {
			var p = l => {
				l = l.response.querySelectorAll(".mod_index .lastcol a");
				var n = "";
				for (let q = 0; q < l.length; q++) f.test(l[q].textContent) && (n = l[q]);
				return n ? n.getAttribute("href").split("id=")[1] : ""
			};
			for (let l = 0; l < k.length; l++) {
				var h = k[l].getElementsByTagName("h3")[0].textContent.replace(e, "").match(c);
				if (h) {
					h = h.groups;
					var m = parseInt(h.cnum).toString();
					if (g.includes(m)) {
						m = k[l].getElementsByClassName("coursestyle2url")[0].getAttribute("href").split("id=")[1];
						if (b.hasOwnProperty(m)) {
							d[m] = b[m];
							continue
						}
						let n = yield XHR(`https://moodle24.technion.ac.il/mod/lti/index.php?id=${m}`, "document").then(p);
						"" != n && (d[m] = {name: h.cname.trim(), lti: n})
					}
				}
			}
			TE_setStorage({webwork_courses: d}, "webworkCourses");
			TE_webworkScan()
		}
	})
}

function TE_webworkStep(a, b) {
	b = void 0 === b ? "" : b;
	return $jscomp.asyncExecutePromiseGeneratorFunction(function* () {
		var d = /webwork/i;
		return yield XHR(a, "document", b).then(c => {
			var e = c.response.querySelector("form");
			if (!e) return !1;
			c = e.getAttribute("action");
			e = new FormData(e);
			var f = e.get("redirect_uri") || e.get("target_link_uri") || c;
			return d.test(f) ? [c, e] : !1
		})
	})
}

function TE_webworkScan() {
	chrome.storage.local.get({webwork_courses: {}, webwork_cal: {}}, function (a) {
		return $jscomp.asyncExecutePromiseGeneratorFunction(function* () {
			var b = /(?<day>[0-9]{2}).(?<month>[0-9]{2}).(?<year>[0-9]{4}) @ (?<hour>[0-9]{2}):(?<minute>[0-9]{2})/,
				d = /^\u05d9\u05d9\u05e4\u05ea\u05d7|^\u05e1\u05d2\u05d5\u05e8/, c = {}, e = !1;
			for (let g of Object.values(a.webwork_courses)) {
				var f = yield TE_webworkStep(`https://moodle24.technion.ac.il/mod/lti/launch.php?id=${g.lti}`);
				if (!f) continue;
				f = yield TE_webworkStep(f[0],
					(new URLSearchParams(f[1])).toString());
				if (!f) continue;
				f = yield TE_webworkStep(f[0], (new URLSearchParams(f[1])).toString());
				if (!f) continue;
				let k = (new URLSearchParams(f[1])).toString();
				f = yield XHR(f[0], "document", k).then(p => {
					let h = {};
					p = p.response.querySelectorAll(".problem_set_table tr");
					for (let l = 1; l < p.length; l++) {
						var m = p[l].getElementsByTagName("td");
						if (d.test(m[1].textContent)) continue;
						let n = b.exec(m[1].textContent).groups;
						m = m[0].textContent;
						let q = `${g.lti}_${m}`, r = 0, t = 0;
						a.webwork_cal.hasOwnProperty(q) ?
							(r = a.webwork_cal[q].seen, t = a.webwork_cal[q].done) : e = !0;
						h[q] = {
							h: m,
							ts: (new Date(n.year, parseInt(n.month) - 1, n.day, n.hour, n.minute)).getTime(),
							due: `${n.day}.${n.month}.${n.year} - ${n.hour}:${n.minute}`,
							seen: r,
							done: t
						}
					}
					return h
				});
				Object.assign(c, f)
			}
			TE_setStorage({webwork_cal: c, wwcal_update: Date.now()}, "wwcfail_1");
			e && TE_alertNewHW(3)
		})
	})
}

function TE_userCalendar() {
	chrome.storage.local.get({user_agenda: {}}, a => {
		var b = [], d = Date.now();
		Object.keys(a.user_agenda).forEach(c => {
			let e = a.user_agenda[c].timestamp;
			0 < e && 1728E5 < d - e && b.push(c)
		});
		for (let c of b) delete a.user_agenda[c];
		TE_setStorage({user_agenda: a.user_agenda})
	})
};
