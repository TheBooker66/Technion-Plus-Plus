'use strict';
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
		var e = a[d];
		if (!(e in c)) return;
		c = c[e]
	}
	a = a[a.length - 1];
	d = c[a];
	b = b(d);
	b != d && null != b && $jscomp.defineProperty(c, a, {configurable: !0, writable: !0, value: b})
};
$jscomp.polyfillIsolated = function (a, b, c, d) {
	var e = a.split(".");
	a = 1 === e.length;
	d = e[0];
	d = !a && d in $jscomp.polyfills ? $jscomp.polyfills : $jscomp.global;
	for (var h = 0; h < e.length - 1; h++) {
		var f = e[h];
		if (!(f in d)) return;
		d = d[f]
	}
	e = e[e.length - 1];
	c = $jscomp.IS_SYMBOL_NATIVE && "es6" === c ? d[e] : null;
	b = b(c);
	null != b && (a ? $jscomp.defineProperty($jscomp.polyfills, e, {
		configurable: !0,
		writable: !0,
		value: b
	}) : b !== c && ($jscomp.propertyToPolyfillSymbol[e] = $jscomp.IS_SYMBOL_NATIVE ? $jscomp.global.Symbol(e) : $jscomp.POLYFILL_PREFIX + e, e =
		$jscomp.propertyToPolyfillSymbol[e], $jscomp.defineProperty(d, e, {configurable: !0, writable: !0, value: b})))
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
		var e = d.value
	} catch (h) {
		return this.context_.yieldAllIterator_ = null, this.context_.throw_(h), this.nextStep_()
	}
	this.context_.yieldAllIterator_ = null;
	c.call(this.context_, e);
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

	return new Promise(function (d, e) {
		function h(f) {
			f.done ? d(f.value) : Promise.resolve(f.value).then(b, c).then(h, e)
		}

		h(a.next())
	})
};
$jscomp.asyncExecutePromiseGeneratorFunction = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(a())
};
$jscomp.asyncExecutePromiseGeneratorProgram = function (a) {
	return $jscomp.asyncExecutePromiseGenerator(new $jscomp.generator.Generator_(new $jscomp.generator.Engine_(a)))
};

function str_rev(a) {
	var b = [], c = 0;
	for (let d = a.length - 1; 0 <= d; d--) b[c++] = a[d];
	return b.join("")
}

function maor_p_e(a, b) {
	var c = a.split("");
	for (let d = 0; d < c.length; d++) c[d] = String.fromCharCode(a.charCodeAt(d) ^ b.charCodeAt(d));
	return c
}

function maor_p_t(a, b, c) {
	return str_rev(maor_p_e(a + b, c))
}

function TE_getBrowser() {
	return "undefined" !== typeof browser ? "Firefox" : "Chromium"
}

function TE_setStorage(a, b) {
	chrome.storage.local.set(a, () => {
		chrome.runtime.lastError && console.log("TE_bg_" + b + ": " + chrome.runtime.lastError.message)
	})
}

function TE_reBadge(a) {
	navigator.appVersion.includes("Android") || chrome.browserAction.getBadgeBackgroundColor({}, b => {
		chrome.browserAction.getBadgeText({}, c => {
			if (215 != b[0] || 0 != b[1] || 34 != b[2] || "!" != c) chrome.browserAction.setBadgeBackgroundColor({color: a ? [215, 0, 34, 185] : [164, 127, 0, 185]}), chrome.browserAction.setBadgeText({text: "!"})
		})
	})
}

function XHR(a, b, c, d) {
	c = void 0 === c ? "" : c;
	d = void 0 === d ? !1 : d;
	return new Promise((e, h) => {
		var f = {headers: {}};
		f.method = d ? "head" : "get";
		"" != c && (f.method = "post", f.body = c, f.headers["Content-type"] = "application/x-www-form-urlencoded");
		fetch(a, f).then(g => $jscomp.asyncExecutePromiseGeneratorFunction(function* () {
			if (g.ok) {
				var k = {response: "", responseURL: g.url};
				"json" == b ? k.response = yield g.json() : (k.response = yield g.text(), "document" == b && (k.response = (new DOMParser).parseFromString(k.response, "text/html")));
				e(k)
			} else h(g.error())
		})).catch(g => {
			h(g)
		})
	})
}

function TE_notification(a, b, c) {
	c = void 0 === c ? "" : c;
	var d = new Date, e = d.getHours();
	d = d.getMinutes();
	a += "\n\u05d4\u05ea\u05e8\u05d0\u05d4 \u05d4\u05ea\u05e7\u05d1\u05dc\u05d4 \u05d1\u05e9\u05e2\u05d4: " + (10 > e ? "0" + e : e) + ":" + (10 > d ? "0" + d : d);
	a = {type: "basic", iconUrl: chrome.runtime.getURL("icons/icon-48.png"), title: "Technion Plus", message: a};
	"Chromium" == TE_getBrowser() && (a.silent = !0);
	"" != c && chrome.notifications.clear(c);
	chrome.notifications.create(c, a, h => {
		b || chrome.storage.local.get({notif_vol: 1, alerts_sound: !0}, f => {
			if (chrome.runtime.lastError) console.log("TE_bg_notification_err: " + chrome.runtime.lastError.message); else if (f.alerts_sound) {
				var g = document.createElement("audio");
				g.setAttribute("preload", "auto");
				g.setAttribute("autobuffer", "true");
				g.volume = f.notif_vol;
				g.src = chrome.runtime.getURL("notification.mp3");
				g.play()
			}
		})
	})
};
