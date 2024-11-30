'use strict';

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
				chrome.runtime.lastError ? (console.log("TE_bg_dls: " + chrome.runtime.lastError.message), console.log(` - filename: ${d.n}\n - url: ${e}`)) : (b.dl_current = f, chrome.browserAction.setIcon({path: "../icons/icon-green.png"}), setTimeout(() => {
					chrome.browserAction.setIcon({path: "../icons/icon-16.png"});
					setTimeout(() => {
						chrome.browserAction.setIcon({path: "../icons/icon-green.png"})
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
			}), chrome.browserAction.setIcon({path: "../icons/icon-16.png"}),
				TE_nextDownload())
		}) : a.id == b.dl_current && a.state && ("interrupted" === a.state.current && console.log(`TE_dlFailed ${a.id} : ${["moodle", "panopto", "GR++", "webcourse"][b.dl_queue[0].sys]}`), "interrupted" === a.state.current || "complete" === a.state.current) && (b.dl_queue[0].list.length || b.dl_queue.shift(), b.dl_current = 0, TE_setStorage({
			dl_current: b.dl_current,
			dl_queue: b.dl_queue
		}), chrome.browserAction.setIcon({path: "../icons/icon-16.png"}), TE_nextDownload())
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

function TE_updateInfo() {
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

function TE_shutBusesAlerts() {
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
		chrome.runtime.lastError ? console.log("TE_bg_checkBuses_err: " + chrome.runtime.lastError.message) : XHR("https://mslworld.egged.co.il/MslWebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/" + a.bus_station + "/he/false", "json").then(function (b) {
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
				}).then(d => c(d.url)).catch(d => {
			});
			break;
		case "TE_remoodle_reangle":
			TE_sendMessageToTabs({
				mess_t: "TE_remoodle_reangle",
				angle: a.angle
			});
			break;
		case "TE_remoodle":
			TE_sendMessageToTabs({mess_t: "TE_remoodle"})
	}
	return !0
});
chrome.alarms.onAlarm.addListener(function (a) {
	"TE_update_info" === a.name && TE_updateInfo();
	"TE_buses_start" === a.name && TE_checkBuses()
});

function TE_comingFromLower(a, b) {
	for (var c = 0; c < b.length; c++) {
		if (b[c] > a[c]) return !0;
		if (b[c] != a[c]) break
	}
	return !1
}

function TE_updateType(a, b) {
	for (var c = 0; c < b.length; c++) if (b[c] > a[c]) return b.length - c;
	return 1
}

chrome.runtime.onInstalled.addListener(a => {
	if ("update" == a.reason) {
		a = a.previousVersion.split(".").map(c => parseInt(c));
		chrome.runtime.getManifest().version.split(".").map(c => parseInt(c));
		TE_comingFromLower(a, [2, 4, 15]) && TE_setStorage({
			cal_seen: 0,
			calendar_prop: "",
			calendar_max: 0,
			cal_killa: !0,
			webwork_courses: {},
			webwork_cal: {},
			wwcal_update: 0
		});
		TE_comingFromLower(a, [2, 4, 0]) && TE_setStorage({webwork_courses: {}, webwork_cal: {}, wwcal_update: 0});
		TE_comingFromLower(a, [2, 3, 3]) && chrome.storage.local.get({
			user_agenda: {},
			wwcal_switch: !1
		}, c => {
			if (c.wwcal_switch) {
				c = c.user_agenda;
				var d = Date.now();
				c[d] = {
					header: "\u05de\u05d8\u05dc\u05d5\u05ea WeBWorK \u05e9\u05e1\u05d5\u05de\u05e0\u05d5 \u05db\u05d4\u05d5\u05e9\u05dc\u05de\u05d5 \u05d0\u05d5\u05e4\u05e1\u05d5!",
					// מטלות WeBWorK שסומנו כהושלמו אופסו!
					description: "\u05dc\u05e6\u05e2\u05e8\u05d9, \u05e2\u05e7\u05d1 \u05d1\u05d0\u05d2 \u05e0\u05d0\u05dc\u05e6\u05ea\u05d9 \u05dc\u05d0\u05e4\u05e1 \u05d0\u05ea \u05de\u05d8\u05dc\u05d5\u05ea \u05d4\u05d5\u05d5\u05d1\u05d5\u05d5\u05e8\u05e7 \u05e9\u05d4\u05d5\u05e9\u05dc\u05de\u05d5. \u05e0\u05d9\u05ea\u05df \u05dc\u05de\u05d7\u05d5\u05e7 \u05d0\u05ea \u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d4\u05d6\u05d0\u05ea \u05d5\u05dc\u05e1\u05de\u05df \u05d0\u05d5\u05ea\u05df \u05e9\u05d5\u05d1 \u05dc\u05d0\u05d7\u05e8 \u05e9\u05d9\u05d9\u05d8\u05e2\u05e0\u05d5 \u05de\u05d7\u05d3\u05e9 \ud83d\ude42",
					// לצערי, עקב באג נאלצתי לאפס את מטלות הוובוורק שהושלמו. ניתן למחוק את ההודעה הזאת ולסמן אותן שוב לאחר שייטענו מחדש 🙂
					timestamp: -1,
					done: !1
				};
				TE_setStorage({user_agenda: c, webwork_cal: {}});
				TE_notification("\u05dc\u05e6\u05e2\u05e8\u05d9, \u05e2\u05e7\u05d1 \u05d1\u05d0\u05d2 \u05e0\u05d0\u05dc\u05e6\u05ea\u05d9 \u05dc\u05d0\u05e4\u05e1 \u05d0\u05ea \u05de\u05d8\u05dc\u05d5\u05ea \u05d4\u05d5\u05d5\u05d1\u05d5\u05d5\u05e8\u05e7 \u05e9\u05d4\u05d5\u05e9\u05dc\u05de\u05d5. \u05e0\u05d9\u05ea\u05df \u05dc\u05de\u05d7\u05d5\u05e7 \u05d0\u05ea \u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d4\u05d6\u05d0\u05ea \u05d5\u05dc\u05e1\u05de\u05df \u05d0\u05d5\u05ea\u05df \u05e9\u05d5\u05d1 \u05dc\u05d0\u05d7\u05e8 \u05e9\u05d9\u05d9\u05d8\u05e2\u05e0\u05d5 \u05de\u05d7\u05d3\u05e9 \ud83d\ude42",
					// לצערי, עקב באג נאלצתי לאפס את מטלות הוובוורק שהושלמו. ניתן למחוק את ההודעה הזאת ולסמן אותן שוב לאחר שייטענו מחדש 🙂
					!1)
			}
		});
		if (TE_comingFromLower(a, [2, 1, 0])) {
			chrome.storage.local.remove(["courses_names", "courses_links", "courses_update"]);
			var b = parseInt(3 * Math.random()) + 1;
			b = Date.now() + 864E5 * b;
			TE_updateVideosInfo(b)
		}
		TE_comingFromLower(a, [1, 3, 0]) && (TE_setStorage({remoodle: !1}), TE_setStorage({cal_seen: 0}))
	}
});

function TE_startExtension() {
	chrome.alarms.create("TE_update_info", {delayInMinutes: 1, periodInMinutes: 60});
	TE_setStorage({buses_alerts: []});
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, a => {
		chrome.browserAction.setIcon({path: "../icons/icon-16.png"});
		TE_setStorage({dl_queue: [], dl_current: 0})
	})
}

chrome.runtime.onStartup.addListener(TE_startExtension);
chrome.runtime.onInstalled.addListener(TE_startExtension);
