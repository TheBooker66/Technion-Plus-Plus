'use strict';

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
	navigator.appVersion.includes("Android") || chrome.action.getBadgeBackgroundColor({}, b => {
		chrome.action.getBadgeText({}, c => {
			if (215 != b[0] || 0 != b[1] || 34 != b[2] || "!" != c) chrome.action.setBadgeBackgroundColor({color: a ? [215, 0, 34, 185] : [164, 127, 0, 185]}), chrome.action.setBadgeText({text: "!"})
		})
	})
}

function XHR(a, b, c, d) {
	c = void 0 === c ? "" : c;
	d = void 0 === d ? !1 : d;
	return new Promise((e, g) => {
		var f = {
			headers: {},
			method: d ? "head" : "get"
		};
		if (c != "") {
			f.method = "post";
			f.body = c;
			f.headers["Content-type"] = "application/x-www-form-urlencoded";
		}
		(async () => {
			try {
				const response = await fetch(a, f);

				if (!response.ok) {
					throw new Error(response.statusText);
				}

				var data = {
					response: (new DOMParser).parseFromString(await response.text(), "text/html"),
					responseURL: response.url
				};

				e({ response: data, responseURL: response.url });
			} catch (error) {
				g(error);
			}
		})();
	})
}

function TE_notification(a, b, c) {
	c = void 0 === c ? "" : c;
	var d = new Date, e = d.getHours();
	d = d.getMinutes();
	a += "התראה התקבלה בשעה: " + (10 > e ? "0" + e : e) + ":" + (10 > d ? "0" + d : d);
	a = {
		type: "basic",
		iconUrl: chrome.runtime.getURL("../icons/technion_plus_plus/icon-48.png"),
		title: "Technion",
		message: a
	};
	"Chromium" == TE_getBrowser() && (a.silent = !0);
	"" != c && chrome.notifications.clear(c);
	chrome.notifications.create(c, a, h => {
		b || chrome.storage.local.get({notif_vol: 1, alerts_sound: !0}, f => {
			if (chrome.runtime.lastError) console.log("TE_bg_notification_err: " + chrome.runtime.lastError.message);
			else if (f.alerts_sound) {
				var g = document.createElement("audio");
				g.setAttribute("preload", "auto");
				g.setAttribute("autobuffer", "true");
				g.volume = f.notif_vol;
				g.src = chrome.runtime.getURL("resources/notification.mp3");
				g.play()
			}
		})
	})
}

export function TE_forcedAutoLogin(a) {
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

export function TE_loginToMoodle(a) {
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
					h.getAttribute("timer_over") || (clearTimeout(m), h.setAttribute("login_over", "1"),
						h.removeEventListener("load", l),
						XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", a).then(q => {
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
		c = / - (?:קיץ|חורף|אביב)/;
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
			"Attendance" === g || c || g.includes("ערעור") || g.includes("זום") || g.includes("Zoom") || g.includes("zoom")
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
	return (async () => {
		var d = {}, c = /(?<cname>.+)\s*-\s*(?<cnum>[0-9]+)/,
			e = / - (?:קיץ|חורף|אביב)/,
			f = /webwork|וובוורק|ווב-וורק/i, // The Next line is HARDCODED COURSE NUMBERS
			// g = "104000 104003 104004 104012 104013 104016 104018 104019 104022 104031 104032 104033 104034 104035 104036 104038 104041 104042 104043 104044 104064 104065 104066 104131 104136 104166 104174 104192 104195 104215 104220 104221 104228 104281 104285 104295".split(" "),
			g = "01040000 01040003 01040004 01040012 01040013 01040016 01040018 01040019 01040022 01040031 01040032 01040033 01040034 01040035 01040036 01040038 01040041 01040042 01040043 01040044 01040064 01040065 01040066 01040131 01040136 01040166 01040174 01040192 01040195 01040215 01040220 01040221 01040228 01040281 01040285 01040295".split(" "),
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
						let n = await XHR(`https://moodle24.technion.ac.il/mod/lti/index.php?id=${m}`, "document").then(p);
						"" != n && (d[m] = {name: h.cname.trim(), lti: n})
					}
				}
			}
			TE_setStorage({webwork_courses: d}, "webworkCourses");
			TE_webworkScan()
		}
	})();
}

function TE_webworkStep(a, b) {
	b = void 0 === b ? "" : b;
	return (async () => {
		var d = /webwork/i;
		return await XHR(a, "document", b).then(c => {
			var e = c.response.querySelector("form");
			if (!e) return !1;
			c = e.getAttribute("action");
			e = new FormData(e);
			var f = e.get("redirect_uri") || e.get("target_link_uri") || c;
			return d.test(f) ? [c, e] : !1
		})
	})();
}

function TE_webworkScan() {
	chrome.storage.local.get({webwork_courses: {}, webwork_cal: {}}, function (a) {
		return (async () => {
			var b = /(?<day>[0-9]{2}).(?<month>[0-9]{2}).(?<year>[0-9]{4}) @ (?<hour>[0-9]{2}):(?<minute>[0-9]{2})/,
				d = /^\u05d9\u05d9\u05e4\u05ea\u05d7|^\u05e1\u05d2\u05d5\u05e8/, c = {}, e = !1;
			for (let g of Object.values(a.webwork_courses)) {
				var f = await TE_webworkStep(`https://moodle24.technion.ac.il/mod/lti/launch.php?id=${g.lti}`);
				if (!f) continue;
				f = await TE_webworkStep(f[0],
					(new URLSearchParams(f[1])).toString());
				if (!f) continue;
				f = await TE_webworkStep(f[0], (new URLSearchParams(f[1])).toString());
				if (!f) continue;
				let k = (new URLSearchParams(f[1])).toString();
				f = await XHR(f[0], "document", k).then(p => {
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
		})();
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
}


// "bg_main.js"

function TE_doDownloads(a) {
	chrome.storage.local.get({dl_queue: []}, b => {
		b.dl_queue.push(a.chunk);
		chrome.storage.local.set({dl_queue: b.dl_queue}, () => {
			if (chrome.runtime.lastError) {
				console.log("TE_bg_download_fail: " + chrome.runtime.lastError.message);
				var c = 1E6 < JSON.stringify(b.dl_queue).length ? "\u05d9\u05d9\u05ea\u05db\u05df \u05e9\u05d4\u05ea\u05d5\u05e1\u05e3 \u05de\u05e0\u05e1\u05d4 \u05dc\u05d4\u05d5\u05e8\u05d9\u05d3 \u05d9\u05d5\u05ea\u05e8 \u05de\u05d9\u05d3\u05d9 \u05e7\u05d1\u05e6\u05d9\u05dd \u05d1\u05d5 \u05d6\u05de\u05e0\u05d9\u05ea." :
					"";
				TE_notification(`\u05e9\u05dc\u05d9\u05d7\u05ea \u05d4\u05e7\u05d1\u05e6\u05d9\u05dd \u05dc\u05d4\u05d5\u05e8\u05d3\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4. ${c}\n`, !0, "downloads")
			} else TE_notification(a.chunk.list.length + ` \u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05e0\u05e9\u05dc\u05d7\u05d5 \u05dc\u05d4\u05d5\u05e8\u05d3\u05d4. ${1 < b.dl_queue.length ? "\u05d4\u05ea\u05d5\u05e1\u05e3 \u05d9\u05d5\u05e8\u05d9\u05d3 \u05d0\u05d5\u05ea\u05dd \u05de\u05d9\u05d3 \u05dc\u05d0\u05d7\u05e8 \u05d4\u05e7\u05d1\u05e6\u05d9\u05dd \u05e9\u05db\u05d1\u05e8 \u05e0\u05de\u05e6\u05d0\u05d9\u05dd \u05d1\u05d4\u05d5\u05e8\u05d3\u05d4." :
				""}\n`, !0, "downloads"), TE_nextDownload()
		})
	})
}

function TE_nextDownload() {
	var a = ["https://moodle24.technion.ac.il/blocks/material_download/download_materialien.php?courseid=", "https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/", "https://grades.cs.technion.ac.il/grades.cgi?", "https://webcourse.cs.technion.ac.il/"];
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, b => {
		if (0 == b.dl_current && 0 != b.dl_queue.length) {
			var c = b.dl_queue[0], d = c.list.shift(), e = a[c.sys] + c.sub_pre + d.u;
			b.dl_queue[0] = c;
			chrome.downloads.download({
				url: e, filename: d.n,
				saveAs: !1
			}, f => {
				chrome.runtime.lastError ? (console.log("TE_bg_dls: " + chrome.runtime.lastError.message), console.log(` - filename: ${d.n}\n - url: ${e}`)) : (b.dl_current = f, chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"}), setTimeout(() => {
					chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"});
					setTimeout(() => {
						chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"})
					}, 250)
				}, 250), TE_setStorage({dl_current: b.dl_current, dl_queue: b.dl_queue}))
			})
		}
	})
}

chrome.downloads.onChanged.addListener(a => {
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, b => {
		a.id == b.dl_current && a.paused ? !1 !== a.paused.current && !0 !== a.paused.previous || chrome.downloads.search({id: a.id}, c => {
			"interrupted" === c[0].state && (console.log(`TE_dlFailed ${a.id} : ${["moodle", "panopto", "GR++", "webcourse"][b.dl_queue[0].sys]}`), b.dl_queue[0].list.length || b.dl_queue.shift(), b.dl_current = 0, TE_setStorage({
				dl_current: b.dl_current,
				dl_queue: b.dl_queue
			}), chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"}),
				TE_nextDownload())
		}) : a.id == b.dl_current && a.state && ("interrupted" === a.state.current && console.log(`TE_dlFailed ${a.id} : ${["moodle", "panopto", "GR++", "webcourse"][b.dl_queue[0].sys]}`), "interrupted" === a.state.current || "complete" === a.state.current) && (b.dl_queue[0].list.length || b.dl_queue.shift(), b.dl_current = 0, TE_setStorage({
			dl_current: b.dl_current,
			dl_queue: b.dl_queue
		}), chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"}), TE_nextDownload())
	})
});

function TE_updateVideosInfo(a, b = null) {
	var c = new Headers;
	c.append("Authorization", "Basic Y291bHBsZWRseXNlcXVhbGxvbmVyd2FyOjZhODk1NTljMmQyYzFlNDViZTQyYzk3MDQ3N2E3MDRhMDkwNjg0ODg=");
	c.append("Content-Type", "application/json");
	fetch("https://12041543-fd22-49b6-bf91-5fa9cf6046b2-bluemix.cloudant.com/tpvideos/v_Data%3Abff4cb5a16c3d92e443287a965d1f385", {
		method: "GET",
		headers: c
	}).then(d => d.json()).then(d => {
		if (!d.data || !d._id) throw "video-update bad request.";
		var e = [], f = {};
		for (const g in d.data) d.data[g].a ?
			e.push([g, d.data[g].n, d.data[g].a]) : e.push([g, d.data[g].n]), f[g] = d.data[g].v;
		console.log(`TE_back: found ${e.length} courses for videos-db (${a})`);
		TE_setStorage({videos_courses: e, videos_data: f, videos_update: a}, "uc");
		if (b) b[0](e, f)
	}).catch(d => {
		console.log("TE_back: video_update_error " + d);
		if (b) b[1]()
	})
}

export function TE_updateInfo() {
	chrome.storage.local.get({
		videos_update: 0,
		moodle_cal: !0,
		quick_login: !0,
		enable_login: !1,
		enable_external: !1,
		cal_seen: 0,
		calendar_prop: "",
		calendar_max: 0,
		cal_killa: !0,
		cscal_update: 0,
		uidn_arr: ["", ""],
		cs_cal: !1,
		cs_cal_seen: {},
		wcpass: "",
		mncal_update: 0,
		wwcal_switch: !1,
		wwcal_update: 0,
		webwork_courses: {}
	}, a => {
		if (chrome.runtime.lastError) console.log("TE_bg_Alarm: " + chrome.runtime.lastError.message); else {
			var b = Date.now();
			a.videos_update < b - 2592E5 && TE_updateVideosInfo(b);
			var c = (a.enable_external || a.enable_login) && a.quick_login, d = c && a.moodle_cal,
				e = c && a.wwcal_switch && 288E5 < b - a.wwcal_update;
			e || d && "" == a.calendar_prop ? TE_forcedAutoLogin().then(f => {
				d && "" == a.calendar_prop && (TE_getCoursesMoodle(f), TE_checkCalendarProp(a.calendar_prop));
				e && TE_getWebwork(f, a.webwork_courses)
			}).catch(() => {
			}) : d && "" != a.calendar_prop && (TE_loginToMoodle().then(TE_getCoursesMoodle).catch(() => {
			}), TE_alertMoodleCalendar(a.cal_seen, a.calendar_prop, a.calendar_max, a.cal_killa));
			a.cs_cal && 288E5 < b - a.cscal_update &&
			TE_csCalendarCheck(a.uidn_arr, a.wcpass, a.cs_cal_seen);
			TE_userCalendar()
		}
	})
}

function TE_toggleBusAlert(a) {
	chrome.storage.local.get({buses_alerts: []}, b => {
		if (chrome.runtime.lastError) return console.log("TE_back_bus: error - " + chrome.runtime.lastError.message);
		0 === b.buses_alerts.length && (chrome.alarms.create("TE_buses_start", {
			delayInMinutes: 1,
			periodInMinutes: 1
		}), console.log("TE_createBusAlert"));
		-1 !== b.buses_alerts.indexOf(a.bus_kav) && (b.buses_alerts.splice(b.buses_alerts.indexOf(a.bus_kav), 1), TE_setStorage({buses_alerts: b.buses_alerts}, "toggleBus"), 0 === b.buses_alerts.length &&
		TE_shutBusesAlerts());
		b.buses_alerts.push(a.bus_kav);
		TE_setStorage({buses_alerts: b.buses_alerts}, "toggleBus");
		TE_checkBuses()
	})
}

export function TE_shutBusesAlerts() {
	console.log("TE_shutBusesAlerts");
	TE_setStorage({buses_alerts: []}, "shutBuses");
	chrome.alarms.clear("TE_buses_start")
}

function TE_busAlertError() {
	TE_notification("\u05d4\u05ea\u05e8\u05d7\u05e9\u05d4 \u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e0\u05d9\u05e1\u05d9\u05d5\u05df \u05d9\u05e6\u05d9\u05e8\u05ea \u05d4\u05ea\u05e8\u05d0\u05d4 \u05dc\u05d0\u05d5\u05d8\u05d5\u05d1\u05d5\u05e1, \u05d0\u05e0\u05d0 \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea.\n\u05e9\u05d9\u05dd \u05dc\u05d1: \u05d4\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea \u05d4\u05e7\u05d9\u05d9\u05de\u05d5\u05ea, \u05d1\u05de\u05d9\u05d3\u05d4 \u05d5\u05d4\u05d9\u05d5, \u05e0\u05de\u05d7\u05e7\u05d5.", !1);
	TE_reBadge(!0);
	TE_shutBusesAlerts()
}

function TE_busAlertNow(a) {
	for (var b = "", c = 0; c < a.length; c++) b += "\u05e7\u05d5 " + a[c].Shilut + " \u05d9\u05d2\u05d9\u05e2 \u05dc\u05ea\u05d7\u05e0\u05d4 \u05d1\u05e2\u05d5\u05d3 " + a[c].MinutesToArrival + " \u05d3\u05e7\u05d5\u05ea.\n";
	TE_notification(b, !1);
	chrome.storage.local.get({buses_alerts: []}, d => {
		for (var e = 0; e < a.length; e++) -1 !== d.buses_alerts.indexOf(a[e].Shilut) && d.buses_alerts.splice(d.buses_alerts.indexOf(a[e].Shilut), 1);
		0 === d.buses_alerts.length && TE_shutBusesAlerts()
	})
}

function TE_checkBuses() {
	console.log("TE_checkBuses");
	chrome.storage.local.get({bus_station: 43015, bus_time: 10, buses_alerts: []}, a => {
		chrome.runtime.lastError ? console.log("TE_bg_checkBuses_err: " + chrome.runtime.lastError.message) :
			XHR("https://bus.gov.il/WebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/" + a.bus_station + "/he/false", "json")
				.then(function (b) {
					b = b.response;
					var c = [];
					for (let d = 0; d < b.length; d++) -1 !== a.buses_alerts.indexOf(b[d].Shilut) && b[d].MinutesToArrival <= a.bus_time && c.push(b[d]);
					0 < c.length && TE_busAlertNow(c);
					0 == b.length && TE_busAlertError()
				}).catch(function () {
				TE_busAlertError()
			})
	})
}

function TE_sendMessageToTabs(a) {
	chrome.tabs.query({}, b => {
		for (var c = 0; c < b.length; ++c) chrome.tabs.sendMessage(b[c].id, a, {}, () => {
			chrome.runtime.lastError && console.log("TE_popup_remoodle: " + chrome.runtime.lastError.message)
		})
	})
}

function TE_startExtension() {
	chrome.alarms.create("TE_update_info", {delayInMinutes: 1, periodInMinutes: 60});
	TE_setStorage({buses_alerts: []});
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, a => {
		chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"});
		TE_setStorage({dl_queue: [], dl_current: 0})
	})
}

chrome.runtime.onMessage.addListener((a, b, c) => {
	switch (a.mess_t) {
		case "singledownload":
			chrome.downloads.download({url: a.link, filename: a.name, saveAs: !1}, function () {
				chrome.runtime.lastError && console.log("TE_bg_dl: " + chrome.runtime.lastError.message)
			});
			break;
		case "multidownload":
			TE_doDownloads(a);
			break;
		case "bus_alert":
			TE_toggleBusAlert(a);
			break;
		case "silent_notification":
			TE_notification(a.message, !0);
			break;
		case "loud_notification":
			TE_notification(a.message, !1);
			break;
		case "login_moodle_url":
			fetch(`https://${a.h}/auth/oidc/`,
				{
					headers: {
						accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
						"accept-language": "en-US,en;q=0.9",
						"cache-control": "no-cache",
						pragma: "no-cache",
						"sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
						"sec-fetch-dest": "document",
						"sec-fetch-mode": "navigate",
						"sec-fetch-site": "none"
					}, body: null, method: "HEAD", mode: "cors", credentials: "include"
				}).then(d => c(d.url)).catch(e => console.log(e));
			break;
		case "TE_remoodle_reangle":
			TE_sendMessageToTabs({
				mess_t: "TE_remoodle_reangle",
				angle: a.angle
			});
			break;
		case "TE_remoodle":
			TE_sendMessageToTabs({mess_t: "TE_remoodle"})
			break;
		case "buses":
			fetch(a.url)
				.then(response => {
					response.json().then(response => {
						console.log(response);
						c(response);
					});
				})
				.catch(e => console.error("Error:", e));
			break;
	}
	return !0
});

chrome.alarms.onAlarm.addListener(function (a) {
	"TE_update_info" === a.name && TE_updateInfo();
	"TE_buses_start" === a.name && TE_checkBuses()
});

chrome.runtime.onInstalled.addListener(a => {
	if ("update" == a.reason) {
		chrome.tabs.create({url: 'html/release_notes.html'}) && TE_startExtension();
	}
});

chrome.runtime.onStartup.addListener(TE_startExtension);
