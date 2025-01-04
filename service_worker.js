'use strict';
import {reverseString, xorStrings} from "./js/utils.js";

function TE_setStorage(a, b) {
	chrome.storage.local.set(a, () => {
		chrome.runtime.lastError && console.error("TE_bg_" + b + ": " + chrome.runtime.lastError.message);
	});
}

function XHR(url, resType, body = "", reqType = false) {
	return new Promise((e, g) => {
		const headers = {
			headers: {},
			method: reqType ? "head" : "get",
			mode: "no-cors", // TODO
		};
		if (body !== "") {
			delete headers.mode;
			headers.method = "post";
			headers.body = body;
			headers.headers["Content-type"] = "application/x-www-form-urlencoded";
		}
		(async () => {
			try {
				const response = await fetch(url, headers);
				if (!response.ok)
					throw new Error(response.statusText);

				const data = {
					response: {} = resType === "json" ? JSON.parse(await response.text()) :
						await chrome.runtime.sendMessage({
							mess_t: "DOMParser",
							data: await response.text()
						}),
					responseURL: response.url
				};
				setInterval(() => {
				}, 1e4);
				console.assert(data.response !== undefined && data.response !== null, "XHR: response is null or undefined");

				e(data);

			} catch (err) {
				g(err);
			}
		})();
	});
}

export function TE_loginToMoodle(a = false) {
	return new Promise((b, d) => {
		const failure = err => {
			console.error(`TE_back_M_login: could not connect to moodle. {reason: ${err}} at${Date.now()} [s]`);
			d();
		}, success = f => {
			console.log(`TE_auto_login: connection was made! At ${Date.now()} [s]`);
			b(f);
		};
		XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", a).then(res => {
			!res.responseURL.includes("microsoft") ? success(res) : chrome.storage.local.get({
				username: "",
				server: true,
				enable_login: false
			}, id => chrome.runtime.sendMessage({
				mess_t: "iframe", a: a, fail: failure,
				succeed: success, id: id, response: res, XHR: XHR
			}));
		}).catch(failure);
	});
}

export function TE_forcedAutoLogin(a = false) {
	return new Promise((b, d) => {
		const failure = err => {
			console.error(`TE_back_M_login: could not connect to moodle. {reason: ${err}} at ${Date.now()} [s]`);
			d();
		}, success = f => {
			console.log(`TE_auto_login: connection was made! At ${Date.now()} [s]`);
			b(f);
		};
		chrome.storage.local.get({enable_external: false}, f => {
			f.enable_external ? TE_forcedAutoLoginExternalPromise(success, failure) : TE_forcedAutoLoginNormalPromise(success, failure, a);
		});
	});
}

function TE_forcedAutoLoginNormalPromise(a, b, d) {
	const c = async (e, f) => {
		if (30 <= f) {
			await chrome.tabs.remove(e);
			b("Could not reach moodle, possibly wrong username/password.");
			return;
		}
		chrome.tabs.get(e, async tab => {
			if (tab.url === "https://moodle24.technion.ac.il/") {
				console.log("close the tab");
				await chrome.tabs.remove(e);
				XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", d).then(k => a(k));
			} else setTimeout(() => c(e, f + 1), 500);
		});
	};
	XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", "", d).then(e => {
		if (!e.responseURL.includes("microsoft")) {
			a(e);
			return;
		}
		chrome.storage.local.get({
			username: "",
			server: true,
			enable_login: false
		}, f => {
			if (chrome.runtime.lastError) return b("b_storage - " + chrome.runtime.lastError.message);
			if (!f.enable_login) return b("No username/password");
			const g = e.responseURL.split("?"), k = new URLSearchParams(g[1]);
			k.delete("prompt");
			k.append("login_hint", f.username + "@" + (f.server ? "campus." : "") + "technion.ac.il");
			chrome.tabs.create({url: g[0] + "?" + k.toString(), active: false}, p => c(p.id, 0));
		});
	}).catch(b);
}

function TE_forcedAutoLoginExternalPromise(a, b) {
	const d = (c, e) => {
		8 <= e ? (chrome.tabs.remove(c), b("Could not login to moodle, possibly wrong username/password.")) : chrome.tabs.get(c, _ => {
			XHR("https://moodle24.technion.ac.il/", "document").then(g => {
				if (g.response[".usertext"]) {
					a(g);
					console.log("close the tab");
					chrome.tabs.remove(c);
				} else setTimeout(() => d(c, e + 1), 1E3);
			});
		});
	}
	XHR("https://moodle24.technion.ac.il/", "document").then(c => {
		if (c.response[".usertext"]) return a(c);
		chrome.tabs.create({
			url: "https://moodle24.technion.ac.il/",
			active: false
		}, tab => d(tab.id, 0));
	}).catch(b);
}

function TE_notification(a, b, c = "") {
	let date = new Date;
	const hour = date.getHours(), minutes = date.getMinutes();
	a += "התראה התקבלה בשעה: " + (10 > hour ? "0" + hour : hour) + ":" + (10 > minutes ? "0" + minutes : minutes);
	a = {
		type: "basic",
		iconUrl: chrome.runtime.getURL("../icons/technion_plus_plus/icon-48.png"),
		title: "Technion",
		message: a
	};
	"Chromium" === ("undefined" !== typeof browser ? "Firefox" : "Chromium") && (a.silent = true);
	if (c !== "") chrome.notifications.clear(c);
	chrome.notifications.create(c, a, _ => {
		b || chrome.storage.local.get({notif_vol: 1, alerts_sound: true}, f => {
			if (chrome.runtime.lastError) console.error("TE_bg_notification_err: " + chrome.runtime.lastError.message);
			else if (f.alerts_sound)
				chrome.runtime.sendMessage({mess_t: "audio notification", volume: f.notif_vol});
		});
	});
}

function TE_reBadge(a) {
	const OS = navigator.userAgentData ? navigator.userAgentData : "navigator.userAgentData is not supported!";
	if (OS.toString().includes("Android")) return;
	chrome.action.getBadgeBackgroundColor({}, b => {
		chrome.action.getBadgeText({}, c => {
			if (215 != b[0] || 0 != b[1] || 34 != b[2] || "!" != c) {
				chrome.action.setBadgeBackgroundColor({color: a ? [215, 0, 34, 185] : [164, 127, 0, 185]});
				chrome.action.setBadgeText({text: "!"});
			}
		});
	});
}

function TE_alertNewHW(a) {
	const b = [
		{mess: "מודל", binary_flag: 1},
		{mess: 'מדמ"ח', binary_flag: 2},
		{mess: "לא אמור לקרות", binary_flag: 4},
		{mess: "WeBWorK", binary_flag: 8}
	][a];
	TE_reBadge(false);
	chrome.storage.local.get({cal_seen: 0, hw_alerts: true}, d => {
		chrome.runtime.lastError && console.error("TE_bg_HWA: " + chrome.runtime.lastError.message);
		d.hw_alerts && TE_notification(`יש לך מטלות חדשות ב${b.mess}!`, false);
		TE_setStorage({cal_seen: d.cal_seen | b.binary_flag}, "HWA");
	});
}

function TE_getCoursesMoodle(a) {
	const b = {}, d = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/, c = / - (?:קיץ|חורף|אביב)/;
	a = a.response["coursevisible"];
	if (0 == a.length) console.error("TE_login: failed to fetch moodle courses.");
	else {
		for (let f = 0; f < a.length; f++) {
			let e = a[f]["h3"].replace(c, "").match(d);
			e && (e = e.groups, b[e.cnum.trim()] = e.cname.trim());
		}
		0 < Object.keys(b).length && chrome.storage.local.set({u_courses: b}, () => {
			chrome.runtime.lastError &&
			console.error("TE_chk_get_cnames" + mess + ": " + chrome.runtime.lastError.message);
		});
	}
}

function TE_checkCalendarProp(a) {
	if (a !== "") return;
	XHR("https://moodle24.technion.ac.il/calendar/export.php", "document").then(b => {
		const d = b.response["sesskey"];
		XHR(b.responseURL, "document", "sesskey=" + d + "&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4")
			.then(c => {
				c = "userid=" + c.response["calendarexporturl"].split("userid=")[1].split("&preset_what=all")[0];
				TE_setStorage({calendar_prop: c}, "cal2");
			}).catch(err => console.error("TE_back: prop error -- " + err));
	}).catch(err => console.error("TE_back: prop error -- " + err));
}

function TE_alertMoodleCalendar(a, b, d, c) {
	if (a & 1) return TE_reBadge(false);
	if (b === "0") return;
	XHR("https://moodle24.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&" + b, "text")
		.then(e => {
			let f = d;
			e = e.response["BEGIN:VEVENT"];
			for (let k = 1; k < e.length; k++) {
				let g = e[k].split("SUMMARY:")[1].split("\n")[0].trim();
				if (c || "Attendance" === g || g.includes("ערעור") || g.includes("זום") || g.includes("Zoom")
					|| g.includes("zoom") || g.includes("הרצאה") || g.includes("תרגול"))
					continue;
				g = g.split(" ");
				if ("opens" !== g[g.length - 1] && "opens)" !== g[g.length - 1]) {
					g = parseInt(e[k].split("UID:")[1].split("@moodle")[0]);
					f = g > f ? g : f;
				}
			}
			f <= d || TE_alertNewHW(0);
		}).catch(err => console.error("TE_back: moodle_cal_error --" + err));
}

function TE_csCalendarCheck(a, b, d) {
	a = reverseString(xorStrings(a[0] + "", a[1]));
	"" != a && "" != b && (b = `https://grades.cs.technion.ac.il/cal/${a}/${encodeURIComponent(b)}`, XHR(b, "text").then(function (c) {
		console.log("Checking GR++...");
		c = c.response["BEGIN:VEVENT"];
		if (1 != c.length) {
			let e = Date.now(), f = new Set, g = {
				banned: /Exam|moed| - Late|\u05d4\u05e8\u05e6\u05d0\u05d4|\u05ea\u05e8\u05d2\u05d5\u05dc/,
				summary: /SUMMARY;LANGUAGE=en-US:(.+)/,
				uid: /UID:([0-9.a-zA-Z-]+)/,
				time: /(?<Y>[0-9]{4})(?<M>[0-9]{2})(?<D>[0-9]{2})(T(?<TH>[0-9]{2})(?<TM>[0-9]{2}))?/
			};
			for (let k = 1; k < c.length; k++) {
				let p = c[k].match(g.summary)[1];
				let m = p.split("(")[0].trim();
				if (g.banned.test(m)) continue;
				let l = c[k].match(g.uid)[1] || p, h = c[k].match(g.time).groups;
				h = new Date(`${h.Y}-${h.M}-${h.D}T${h.TH || 23}:${h.TM || 59}:00+03:00`);
				if (!(h < e || h > e + 2592E6)) {
					if ("icspasswordexpires" == l) {
						f.clear();
						TE_notification('סיסמת היומן של הצגת המטלות של מדמ"ח תפוג בקרוב, אנא כנס בדחיפות להגדרות התוסף להוראות חידוש הסיסמה!', false);
						break;
					}
					h = l.includes(".PHW");
					p = p.split("(")[1].split(")")[0];
					h ? f.delete(l.replace(".PHW", ".HW")) : (f.add(l), d.hasOwnProperty(p) && d[p].includes("[[" + m + "]]") && f.delete(l));
				}
			}
			0 < f.size && TE_alertNewHW(1);
			TE_setStorage({cscal_update: e}, "cal332122");
		}
	}).catch(err => console.error("TE_back: cal_cs_error --" + err)));
}

function TE_getWebwork(a, b) {
	return (async () => {
		const d = {}, c = /(?<cname>.+)\s*-\s*(?<cnum>[0-9]+)/,
			e = / - (?:קיץ|חורף|אביב)/,
			f = /webwork|וובוורק|ווב-וורק/i, // The Next line is HARDCODED COURSE NUMBERS
			g = "01040000 01040003 01040004 01040012 01040013 01040016 01040018 01040019 01040022 01040031 01040032 01040033 01040034 01040035 01040036 01040038 01040041 01040042 01040043 01040044 01040064 01040065 01040066 01040131 01040136 01040166 01040174 01040192 01040195 01040215 01040220 01040221 01040228 01040281 01040285 01040295".split(" ");
		const k = await a.response["coursevisible"];
		if (0 == k.length) console.error("TE_login: failed to fetch webwork courses.");
		else {
			const p = l => {
				l = l.response[".mod_index .lastcol a"];
				let n = "";
				for (let q = 0; q < l.length; q++) f.test(l[q].textContent) && (n = l[q]);
				return n ? n.getAttribute("href").split("id=")[1] : "";
			};
			for (let l = 0; l < k.length; l++) {
				let h = k[l]["h3"].replace(e, "").match(c);
				if (h) {
					h = h.groups;
					let m = parseInt(h.cnum).toString();
					if (g.includes(m)) {
						m = k[l]["coursestyle2url"].split("id=")[1];
						if (b.hasOwnProperty(m)) {
							d[m] = b[m];
							continue;
						}
						let n = await XHR(`https://moodle24.technion.ac.il/mod/lti/index.php?id=${m}`, "document").then(p);
						"" != n && (d[m] = {name: h.cname.trim(), lti: n});
					}
				}
			}
			TE_setStorage({webwork_courses: d}, "webworkCourses");
			TE_webworkScan();
		}
	})();
}

function TE_webworkStep(a, b = "") {
	return (async () => {
		const d = /webwork/i;
		return await XHR(a, "document", b).then(c => {
			let e = c.response["form"];
			if (!e) return false;
			c = e.getAttribute("action");
			e = new FormData(e);
			const f = e.get("redirect_uri") || e.get("target_link_uri") || c;
			return d.test(f) ? [c, e] : false;
		});
	})();
}

function TE_webworkScan() {
	chrome.storage.local.get({webwork_courses: {}, webwork_cal: {}}, a => (async () => {
		const b = /(?<day>[0-9]{2}).(?<month>[0-9]{2}).(?<year>[0-9]{4}) @ (?<hour>[0-9]{2}):(?<minute>[0-9]{2})/,
			d = /^\u05d9\u05d9\u05e4\u05ea\u05d7|^\u05e1\u05d2\u05d5\u05e8/, c = {};
		let e = false;
		for (let g of Object.values(a.webwork_courses)) {
			let f = await TE_webworkStep(`https://moodle24.technion.ac.il/mod/lti/launch.php?id=${g.lti}`);
			if (!f) continue;
			f = await TE_webworkStep(f[0], (new URLSearchParams(f[1])).toString());
			if (!f) continue;
			f = await TE_webworkStep(f[0], (new URLSearchParams(f[1])).toString());
			if (!f) continue;
			let k = (new URLSearchParams(f[1])).toString();
			f = await XHR(f[0], "document", k).then(p => {
				let h = {};
				p = p.response[".problem_set_table tr"];
				for (let l = 1; l < p.length; l++) {
					let m = p[l]["td"];
					if (d.test(m[1].textContent)) continue;
					let n = b.exec(m[1].textContent).groups;
					m = m[0].textContent;
					let q = `${g.lti}_${m}`, r = 0, t = 0;
					a.webwork_cal.hasOwnProperty(q) ? (r = a.webwork_cal[q].seen, t = a.webwork_cal[q].done) : e = true;
					h[q] = {
						h: m,
						ts: (new Date(n.year, parseInt(n.month) - 1, n.day, n.hour, n.minute)).getTime(),
						due: `${n.day}.${n.month}.${n.year} - ${n.hour}:${n.minute}`,
						seen: r,
						done: t
					}
				}
				return h;
			});
			Object.assign(c, f);
		}
		TE_setStorage({webwork_cal: c, wwcal_update: Date.now()}, "wwcfail_1");
		if (e) TE_alertNewHW(3);
	})());
}

function TE_doDownloads(a) {
	chrome.storage.local.get({dl_queue: []}, b => {
		b.dl_queue.push(a.chunk);
		chrome.storage.local.set({dl_queue: b.dl_queue}, () => {
			if (chrome.runtime.lastError) {
				console.error("TE_bg_download_fail: " + chrome.runtime.lastError.message);
				const c = 1E6 < JSON.stringify(b.dl_queue).length ? "ייתכן שהתוסף מנסה להוריד יותר מידי קבצים בו זמנית." : "";
				TE_notification(`שליחת הקבצים להורדה נכשלה. ${c}\n`, true, "downloads");
			} else {
				TE_notification(a.chunk.list.length + ` פריטים נשלחו להורדה. ${1 < b.dl_queue.length ?
					"התוסף יוריד אותם מיד לאחר הקבצים שכבר נמצאים בהורדה." : ""}\n`, true, "downloads");
				TE_nextDownload();
			}
		});
	});
}

function TE_nextDownload() {
	const a = ["https://moodle24.technion.ac.il/blocks/material_download/download_materialien.php?courseid=", "https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/", "https://grades.cs.technion.ac.il/grades.cgi?", "https://webcourse.cs.technion.ac.il/"];
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, b => {
		if (0 == b.dl_current && 0 != b.dl_queue.length) {
			const c = b.dl_queue[0], d = c.list.shift(), e = a[c.sys] + c.sub_pre + d.u;
			b.dl_queue[0] = c;
			chrome.downloads.download({
				url: e, filename: d.n,
				saveAs: false
			}, f => {
				chrome.runtime.lastError ? (console.error("TE_bg_dls: " + chrome.runtime.lastError.message), console.log(` - filename: ${d.n}\n - url: ${e}`)) :
					(b.dl_current = f, chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"}),
						setTimeout(() => {
							chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"});
							setTimeout(() => {
								chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"});
							}, 250)
						}, 250), TE_setStorage({dl_current: b.dl_current, dl_queue: b.dl_queue}));
			});
		}
	});
}

export function TE_updateVideosInfo(a, b = null) {
	const c = new Headers;
	c.append("Authorization", "Basic Y291bHBsZWRseXNlcXVhbGxvbmVyd2FyOjZhODk1NTljMmQyYzFlNDViZTQyYzk3MDQ3N2E3MDRhMDkwNjg0ODg=");
	c.append("Content-Type", "application/json");
	fetch("https://12041543-fd22-49b6-bf91-5fa9cf6046b2-bluemix.cloudant.com/tpvideos/v_Data%3Abff4cb5a16c3d92e443287a965d1f385", {
		method: "GET",
		headers: c
	}).then(d => d.json()).then(d => {
		if (!d.data || !d._id) throw "video-update bad request.";
		const e = [], f = {};
		for (const g in d.data) d.data[g].a ?
			e.push([g, d.data[g].n, d.data[g].a]) : e.push([g, d.data[g].n]), f[g] = d.data[g].v;
		console.log(`TE_back: found ${e.length} courses for videos-db (${a})`);
		TE_setStorage({videos_courses: e, videos_data: f, videos_update: a}, "uc");
		b?.[0](e, f);
	}).catch(err => {
		console.error("TE_back: video_update_error -- " + err);
		b?.[1]();
	});
}

export function TE_updateInfo() {
	chrome.storage.local.get({
		videos_update: 0,
		moodle_cal: true,
		quick_login: true,
		enable_login: false,
		enable_external: false,
		cal_seen: 0,
		calendar_prop: "",
		calendar_max: 0,
		cal_killa: true,
		cscal_update: 0,
		uidn_arr: ["", ""],
		cs_cal: false,
		cs_cal_seen: {},
		wcpass: "",
		mncal_update: 0,
		wwcal_switch: false,
		wwcal_update: 0,
		webwork_courses: {}
	}, a => {
		if (chrome.runtime.lastError) console.error("TE_bg_Alarm: " + chrome.runtime.lastError.message);
		else {
			const b = Date.now();
			a.videos_update < b - 2592E5 && TE_updateVideosInfo(b);
			const c = (a.enable_external || a.enable_login) && a.quick_login,
				d = c && a.moodle_cal, e = c && a.wwcal_switch && 288E5 < b - a.wwcal_update;
			if (e || d && a.calendar_prop === "") {
				TE_forcedAutoLogin().then(f => {
					if (d && a.calendar_prop === "") {
						TE_getCoursesMoodle(f);
						TE_checkCalendarProp(a.calendar_prop);
					}
					if (e) TE_getWebwork(f, a.webwork_courses);
				}).catch(err => console.error("TE_back: forced_login_error -- " + err))
			} else if (d && a.calendar_prop !== "") {
				TE_loginToMoodle(a)
					.then(TE_getCoursesMoodle)
					.catch(err => console.error("TE_back: login_error -- " + err));
				TE_alertMoodleCalendar(a.cal_seen, a.calendar_prop, a.calendar_max, a.cal_killa);
			}
			if (a.cs_cal && 288E5 < b - a.cscal_update) TE_csCalendarCheck(a.uidn_arr, a.wcpass, a.cs_cal_seen);
			chrome.storage.local.get({user_agenda: {}}, a => {
				const b = [], d = Date.now();
				Object.keys(a.user_agenda).forEach(c => {
					let e = a.user_agenda[c].timestamp;
					0 < e && 1728E5 < d - e && b.push(c)
				});
				for (let c of b) delete a.user_agenda[c];
				TE_setStorage({user_agenda: a.user_agenda});
			});
		}
	});
}

export function TE_toggleBusAlert(a) {
	chrome.storage.local.get({buses_alerts: []}, b => {
		if (chrome.runtime.lastError) {
			console.error("TE_back_bus: error -- " + chrome.runtime.lastError.message);
			return;
		}
		if (b.buses_alerts.length === 0)
			chrome.alarms.create("TE_buses_start", {
				delayInMinutes: 1,
				periodInMinutes: 1
			});
		if (-1 !== b.buses_alerts.indexOf(a.bus_kav)) {
			b.buses_alerts.splice(b.buses_alerts.indexOf(a.bus_kav), 1);
			TE_setStorage({buses_alerts: b.buses_alerts}, "toggleBus");
			if (b.buses_alerts.length === 0) TE_shutBusesAlerts();
		}
		b.buses_alerts.push(a.bus_kav);
		TE_setStorage({buses_alerts: b.buses_alerts}, "toggleBus");
		TE_checkBuses();
	});
}

export function TE_shutBusesAlerts() {
	console.log("TE_shutBusesAlerts");
	TE_setStorage({buses_alerts: []}, "shutBuses");
	chrome.alarms.clear("TE_buses_start");
}

function TE_busAlertError() {
	TE_notification("התרחשה שגיאה בניסיון יצירת התראה לאוטובוס, אנא נסה שנית.\nשים לב: ההתראות הקיימות, במידה והיו, נמחקו.", false);
	TE_shutBusesAlerts();
}

function TE_busAlertNow(a) {
	let b = "";
	for (let c = 0; c < a.length; c++) b += "קו " + a[c].Shilut + " יגיע לתחנה בעוד " + a[c].MinutesToArrival + " דקות.\n";
	TE_notification(b, false)
	chrome.storage.local.get({buses_alerts: []}, d => {
		for (let e = 0; e < a.length; e++) -1 !== d.buses_alerts.indexOf(a[e].Shilut) && d.buses_alerts.splice(d.buses_alerts.indexOf(a[e].Shilut), 1);
		if (d.buses_alerts.length === 0) TE_shutBusesAlerts();
	});
}

function TE_checkBuses() {
	console.log("TE_checkBuses");
	chrome.storage.local.get({bus_station: 41205, bus_time: 10, buses_alerts: []}, a => {
		chrome.runtime.lastError ? console.error("TE_bg_checkBuses_err: " + chrome.runtime.lastError.message) :
			XHR("https://bus.gov.il/WebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/" + a.bus_station + "/he/false", "json")
				.then(res => {
					res = res.response;
					if (res.length === 0) {
						TE_busAlertError();
						return;
					}

					const c = [];
					for (let i = 0; i < res.length; i++) {
						if (-1 !== a.buses_alerts.indexOf(res[i].Shilut))
							res[i].MinutesToArrival <= a.bus_time && c.push(res[i]);
					}
					if (c.length > 0) TE_busAlertNow(c);
				}).catch(_ => TE_busAlertError());
	});
}

function TE_sendMessageToTabs(data) {
	chrome.tabs.query({}, tabs => {
		for (const tab of tabs.filter(tab => tab.url.includes("moodle"))) {
			chrome.tabs.sendMessage(tab.id, data, {}, _ => {
				chrome.runtime.lastError && console.error("TE_popup_remoodle: " + chrome.runtime.lastError.message);
			});
		}
	});
}

function TE_startExtension() {
	chrome.alarms.create("TE_update_info", {delayInMinutes: 1, periodInMinutes: 60});
	TE_setStorage({buses_alerts: []});
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, _ => {
		chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"});
		TE_setStorage({dl_queue: [], dl_current: 0});
	});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	switch (message.mess_t) {
		case "singledownload":
			chrome.downloads.download({url: message.link, filename: message.name, saveAs: false}, () => {
				chrome.runtime.lastError && console.error("TE_bg_dl: " + chrome.runtime.lastError.message)
			});
			break;
		case "multidownload":
			TE_doDownloads(message);
			break;
		case "bus_alert":
			TE_toggleBusAlert(message);
			break;
		case "login_moodle_url":
			fetch(`https://${message.url}/auth/oidc/`, {
				headers: {
					accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "no-cache",
					pragma: "no-cache",
					"sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
					"sec-fetch-dest": "document",
					"sec-fetch-mode": "navigate",
					"sec-fetch-site": "none"
				},
				body: null,
				method: "HEAD",
				mode: "cors",
				credentials: "include"
			}).then(res => sendResponse(res.url)).catch(err => console.error(err));
			break;
		case "silent_notification":
			TE_notification(message.message, true);
			break;
		case "loud_notification":
			TE_notification(message.message, false);
			break;
		case "TE_remoodle_reangle":
			TE_sendMessageToTabs({mess_t: "TE_remoodle_reangle", angle: message.angle});
			break;
		case "TE_remoodle":
			TE_sendMessageToTabs({mess_t: "TE_remoodle"});
			break;
		case "buses":
			fetch(message.url)
				.then(async response => sendResponse(await response.json()))
				.catch(err => console.error("Error:", err));
			break;
	}
	return true;
});

chrome.downloads.onChanged.addListener(delta => {
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, b => {
		delta.id == b.dl_current && delta.paused ? false !== delta.paused.current && true !== delta.paused.previous || chrome.downloads.search({id: delta.id}, c => {
			"interrupted" === c[0].state && (console.error(`TE_dlFailed ${delta.id} : ${["moodle", "panopto", "GR++", "webcourse"][b.dl_queue[0].sys]}`), b.dl_queue[0].list.length || b.dl_queue.shift(), b.dl_current = 0, TE_setStorage({
				dl_current: b.dl_current,
				dl_queue: b.dl_queue
			}), chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"}), TE_nextDownload());
		}) : delta.id == b.dl_current && delta.state && ("interrupted" === delta.state.current && console.error(`TE_dlFailed ${delta.id} : ${["moodle", "panopto", "GR++", "webcourse"][b.dl_queue[0].sys]}`), "interrupted" === delta.state.current || "complete" === delta.state.current) && (b.dl_queue[0].list.length || b.dl_queue.shift(), b.dl_current = 0, TE_setStorage({
			dl_current: b.dl_current,
			dl_queue: b.dl_queue
		}), chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"}), TE_nextDownload());
	});
});

chrome.alarms.onAlarm.addListener(alarm => {
	switch (alarm.name) {
		case "TE_update_info":
			TE_updateInfo();
			break;
		case "TE_buses_start":
			TE_checkBuses();
			break;
		default:
			console.error("Unknown alarm name: " + alarm.name);
	}
});

chrome.runtime.onInstalled.addListener(async details => {
	if ("install" === details.reason)
		console.log("Technion++: Welcome!"); // Do something in the future
	else if ("update" === details.reason)
		await chrome.tabs.create({url: 'html/release_notes.html'});
	TE_startExtension();
	await chrome.offscreen.createDocument({
		url: 'offscreen.html',
		reasons: ["DOM_PARSER", "LOCAL_STORAGE", "AUDIO_PLAYBACK"],
		justification: `עמוד הרקע נחוץ על מנת לשלוח בקשות כמו שצריך למודל, לוובוורק ולשרת של מדמ"ח,
		ולשלוח התראות כאשר יש מטלות חדשות.`,
	}).catch(err => console.error(err));
});

chrome.runtime.onStartup.addListener(async () => {
	TE_startExtension();
	await chrome.offscreen.createDocument({
		url: 'offscreen.html',
		reasons: ["DOM_PARSER", "LOCAL_STORAGE", "AUDIO_PLAYBACK"],
		justification: `עמוד הרקע נחוץ על מנת לשלוח בקשות כמו שצריך למודל, לוובוורק ולשרת של מדמ"ח,
		ולשלוח התראות כאשר יש מטלות חדשות.`,
	}).catch(err => console.error(err));
});

self.onmessage = _ => {
}; // keepAlive
