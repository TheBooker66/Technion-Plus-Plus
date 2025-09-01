/// <reference types="user-agent-data-types" />
import {reverseString, xorStrings} from "./js/utils.js";

const courseRegex = /(?<cname>.+)\s-\s(?<cnum>\d{6,8})/, semesterRegex = / - (?:קיץ|חורף|אביב)/;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function TE_setStorage(data: any, callerName = "unknown") {
	chrome.storage.local.set(data, () => {
		if (chrome.runtime.lastError) console.error(`TE_bg_${callerName}: ${chrome.runtime.lastError.message}`);
	});
}

async function XHR(url: string, resType: string, info: string[] = [], body = "", reqType = false) {
	const options: RequestInit = {
		method: reqType ? "HEAD" : "GET", headers: {},
	};

	if (body) {
		options.method = "POST";
		options.body = body;
		if (options.headers) {
			(options.headers as { [key: string]: string })["Content-Type"] = "application/x-www-form-urlencoded";
		}
	}

	const response = await fetch(url, options);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status} – ${response.statusText}`);
	}

	let responsePayload;
	switch (resType) {
		case "json":
			responsePayload = await response.json();
			break;
		case "document":
			await TE_setupOffscreenDocument();
			responsePayload = await chrome.runtime.sendMessage({
				mess_t: "DOMParser", data: await response.text(), dataNeeded: info,
			});
			await chrome.offscreen.closeDocument();
			break;
		case "text":
			responsePayload = await response.text();
			break;
		default:
			throw new Error(`Invalid response type: ${resType}`);
	}
	console.assert(responsePayload !== undefined && responsePayload !== null, "XHR: response payload is null or undefined");

	return {
		response: responsePayload, responseURL: response.url,
	};
}

async function TE_AutoLoginNormal(headRequestEh: boolean) {
	try {
		const initialResponse = await XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", ["Courses", "CourseNames", "CourseLinks"], "", headRequestEh);
		if (!initialResponse.responseURL.includes("microsoft")) {
			console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
			return initialResponse;
		}

		const loginDetails = await chrome.storage.local.get({
			username: "", server: true, enable_login: false,
		});
		if (!loginDetails.enable_login) {
			console.error("No username/password");
			return {response: "Error", responseURL: ""};
		}

		const urlParts = initialResponse.responseURL.split("?");
		const params = new URLSearchParams(urlParts[1]);
		params.delete("prompt");
		params.append("login_hint", `${loginDetails.username}@${loginDetails.server ? "campus." : ""}technion.ac.il`);
		const URL = `${urlParts[0]}?${params.toString()}`;
		const tab = await chrome.tabs.create({
			url: URL, active: false,
		});
		const tabId = tab.id as number;

		const MAX_RETRIES = 30, RETRY_DELAY = 500;
		for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
			const currentTab = await chrome.tabs.get(tabId);
			if (currentTab.url === "https://moodle24.technion.ac.il/") {
				void chrome.tabs.remove(tabId);
				const finalResponse = await XHR("https://moodle24.technion.ac.il/auth/oidc/", "document", ["Courses", "CourseNames", "CourseLinks"], "", headRequestEh);
				console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
				return finalResponse;
			}
			await delay(RETRY_DELAY);
		}

		void chrome.tabs.remove(tabId);
		console.error("Could not login to moodle, possibly wrong username/password (normal).");
		return {response: "Error", responseURL: ""};
	} catch (err: any) {
		console.error(`TE_back_M_login: could not connect to moodle. {reason: ${err.message}} at ${Date.now()}`);
		return {response: "Error", responseURL: ""};
	}
}

async function TE_AutoLoginExternal() {
	try {
		const initialResponse = await XHR("https://moodle24.technion.ac.il/", "document", ["Courses", "CourseNames", "UserText", "CourseLinks"]);
		if (initialResponse.response["UserText"]) {
			console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
			return initialResponse;
		}

		const tab = await chrome.tabs.create({
			url: "https://moodle24.technion.ac.il/", active: false,
		});
		const tabId = tab.id as number;

		const MAX_RETRIES = 8, RETRY_DELAY = 1000;
		let retryCount = 0;

		while (retryCount < MAX_RETRIES) {
			try {
				const finalResponse = await XHR("https://moodle24.technion.ac.il/", "document", ["Courses", "CourseNames", "UserText", "CourseLinks"]);
				if (finalResponse.response["UserText"]) {
					void chrome.tabs.remove(tabId);
					console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
					return finalResponse;
				}
			} catch (err) {
				// If XHR fails, it might be a temporary network issue.
			}
			await delay(RETRY_DELAY);
			retryCount++;
		}

		void chrome.tabs.remove(tabId);
		console.error("Could not login to moodle, possibly wrong username/password (external).");
		return {response: "Error", responseURL: ""};
	} catch (err: any) {
		console.error(`TE_back_M_login: could not connect to moodle. {reason: ${err.message}} at ${Date.now()}`);
		return {response: "Error", responseURL: ""};
	}
}

export async function TE_AutoLogin(headRequestEh: boolean = false) {
	const storage = await chrome.storage.local.get({enable_external: false});
	if (storage.enable_external) return await TE_AutoLoginExternal();
	else return await TE_AutoLoginNormal(headRequestEh);
}


function TE_notification(message: string, silentEh: boolean, notificationId = "") {
	const now = new Date();
	const hour = now.getHours().toString().padStart(2, '0'), minutes = now.getMinutes().toString().padStart(2, '0');
	const timestamp = `התראה התקבלה בשעה: ${hour}:${minutes}`;

	const notificationOptions: chrome.notifications.NotificationCreateOptions = {
		type: "basic",
		title: "Technion++",
		iconUrl: chrome.runtime.getURL("../icons/technion_plus_plus/icon-128.png"),
		message: `${message}\n${timestamp}`,
	};

	if (navigator.userAgent.includes("Chromium")) notificationOptions.silent = true;
	if (notificationId) void chrome.notifications.clear(notificationId);
	chrome.notifications.create(notificationId, notificationOptions, () => {
		if (silentEh) return;

		chrome.storage.local.get({notif_vol: 1, alerts_sound: true}, async (storage) => {
			if (chrome.runtime.lastError) {
				console.error("TE_bg_notification_err: " + chrome.runtime.lastError.message);
			} else if (storage.alerts_sound) {
				await TE_setupOffscreenDocument();
				await chrome.runtime.sendMessage({mess_t: "audio notification", volume: storage.notif_vol});
				await chrome.offscreen.closeDocument();
			}
		});
	});
}

function TE_reBadge(errorEh: boolean) {
	if (navigator.userAgentData?.platform === "Android") return;

	chrome.action.getBadgeBackgroundColor({}, (colour) => {
		chrome.action.getBadgeText({}, (text) => {
			if (!(colour[0] === 215 && colour[1] === 0 && colour[2] === 34 && text === "!")) {
				void chrome.action.setBadgeBackgroundColor({color: errorEh ? [215, 0, 34, 185] : [164, 127, 0, 185]});
				void chrome.action.setBadgeText({text: "!"});
			}
		});
	});
}

function TE_alertNewHW(sourceIndex: number) {
	const sourceInfo = [
		{name: "מודל", flag: 1},
		{name: 'מדמ"ח', flag: 2},
		{name: "WeBWorK", flag: 8},
	][sourceIndex];

	TE_reBadge(false);

	chrome.storage.local.get({cal_seen: 0, hw_alerts: true}, (storage) => {
		if (chrome.runtime.lastError) {
			console.error("TE_bg_HWA: " + chrome.runtime.lastError.message);
			return;
		}
		TE_setStorage({cal_seen: storage.cal_seen | sourceInfo.flag}, "HWA");
		if (storage.hw_alerts) TE_notification(`יש לך מטלות חדשות ב${sourceInfo.name}!`, false);
	});
}

function TE_getCoursesMoodle(moodleData: { response: any }) {
	if (!moodleData.response["Courses"] || moodleData.response["Courses"].length === 0) {
		console.error("TE_login: failed to fetch moodle courses.");
		return;
	}

	const courses: { [key: string]: string } = {}, coursesResponse: string = moodleData.response["CourseNames"];
	for (const courseHTML of coursesResponse) {
		const match = courseHTML.replace(semesterRegex, "").match(courseRegex);
		if (match) {
			const {cnum, cname} = match.groups as { cnum: string, cname: string };
			courses[cnum.trim()] = cname.trim();
		}
	}

	if (Object.keys(courses).length > 0) {
		TE_setStorage({u_courses: courses}, "chk_get_cname");
	}
}

async function TE_checkCalendarProp(calendarProp: string) {
	if (calendarProp !== "") return;

	try {
		const mainPageResponse = await XHR("https://moodle24.technion.ac.il/calendar/export.php", "document", ["SessionKey"]);
		const SessionKey = mainPageResponse.response["SessionKey"];
		const postBody = `sesskey=${SessionKey}&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4`;

		const exportResponse = await XHR(mainPageResponse.responseURL, "document", ["CalendarURL"], postBody);
		const calendarUrl = exportResponse.response["CalendarURL"];
		const userProp = "userid=" + calendarUrl.split("userid=")[1].split("&preset_what=all")[0];
		TE_setStorage({calendar_prop: userProp}, "cal2");
	} catch (err) {
		console.error("TE_back_prop_err: " + err);
	}
}


async function TE_alertMoodleCalendar(seenStatus: number, calendarProp: string, maxEventId: number, filterToggles: {
	"appeals": boolean, "zooms": boolean, "attendance": boolean, "reserveDuty": boolean
}) {
	if (seenStatus & 1) { // Moodle has been checked
		TE_reBadge(false);
		return;
	}
	if (calendarProp === "0") return;

	const calendarUrl = `https://moodle24.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&${calendarProp}`;
	try {
		const calendarData = await XHR(calendarUrl, "document", ["HWList"]);
		const events: string[] = calendarData.response["HWList"];
		let latestEventId = maxEventId;

		if (events?.length <= 1) {
			console.log("No Moodle calendar events found to process.");
			return;
		}

		for (let i = 1; i < events.length; i++) {
			const eventText = events[i];
			let summary = eventText.split("SUMMARY:")[1].split("\n")[0].trim();

			const appealEh = filterToggles.appeals && summary.includes("ערעור"),
				zoomEh = filterToggles.zooms && /(זום|Zoom|zoom|הרצא|תרגול)/.test(summary),
				attendanceEh = filterToggles.attendance && /(נוכחות|Attendance|attendance)/.test(summary),
				reserveDutyEh = filterToggles.reserveDuty && summary.includes("מילואים");
			if (appealEh || zoomEh || attendanceEh || reserveDutyEh) continue;

			const summaryWords = summary.split(" ");
			if (summaryWords.at(-1) !== "opens" && summaryWords.at(-1) !== "opens)") {
				const eventUid = parseInt(eventText.split("UID:")[1].split("@moodle")[0]);
				if (eventUid > latestEventId) {
					latestEventId = eventUid;
				}
			}
		}

		if (latestEventId > maxEventId) TE_alertNewHW(0);
	} catch (err) {
		console.error("TE_back_moodle_cal_err: " + err);
	}
}


async function TE_csCalendarCheck(
	uidArray: [string, string], csPassword: string, seenStatus: { [key: string]: string[] }) {
	const UID = reverseString(xorStrings(uidArray[0] + "", uidArray[1]));
	if (!UID || !csPassword) return;

	const calendarUrl = `https://grades.cs.technion.ac.il/cal/${UID}/${encodeURIComponent(csPassword)}`;
	try {
		const calendarData = await XHR(calendarUrl, "document", ["HWList"]);
		const events: string[] = calendarData.response["HWList"];
		if (events?.length <= 1) {
			console.log("No cs calendar events found to process.");
			return;
		}

		const THIRTY_DAYS = 2592E6, now = Date.now(), newHWSet = new Set(), regexes = {
			summary: /SUMMARY;LANGUAGE=en-US:(.+)/,
			banned: /Exam|moed| - Late|\u05d4\u05e8\u05e6\u05d0\u05d4|\u05ea\u05e8\u05d2\u05d5\u05dc/,
			uid: /UID:([0-9.a-zA-Z-]+)/,
			time: /(?<Y>\d{4})(?<M>\d{2})(?<D>\d{2})(T(?<TH>\d{2})(?<TM>\d{2}))?/,
		};

		for (let i = 1; i < events.length; i++) {
			const eventText = events[i];
			const summary = eventText.match(regexes.summary)![1];
			const trimmedSummary = summary.split("(")[0].trim();
			if (regexes.banned.test(trimmedSummary)) continue;

			const eventUID = eventText.match(regexes.uid)?.[1] || summary;
			if (eventUID === "icspasswordexpires" || eventUID === "icspasswordexpired") {
				newHWSet.clear();
				if (eventUID[eventUID.length - 1].toLowerCase() === "s") {
					console.error("TE_cs_cal_err: CS password expires soon.");
					TE_notification('סיסמת היומן של הצגת המטלות של מדמ"ח תפוג בקרוב, אנא כנס להגדרות התוסף להוראות חידוש הסיסמה.', true);
					continue;
				} else {
					console.error("TE_cs_cal_err: CS password expired already.");
					TE_notification('סיסמת היומן של הצגת המטלות של מדמ"ח פגה! כנס בדחיפות להגדרות התוסף להוראות חידוש הסיסמה!', false);
					break;
				}
			}

			const timeMatch = eventText.match(regexes.time)!.groups as { [key: string]: string };
			const dueDate = new Date(`${timeMatch.Y}-${timeMatch.M}-${timeMatch.D}T${timeMatch.TH || 23}:${timeMatch.TM || 59}:00+03:00`).getTime();
			if (dueDate < now || dueDate > now + THIRTY_DAYS) continue;

			if (eventUID.includes(".PHW")) {
				newHWSet.delete(eventUID.replace(".PHW", ".HW"));
			} else {
				newHWSet.add(eventUID);
				const courseNum = summary.split("(")[1].split(")")[0];
				if (seenStatus[courseNum]?.includes(`[[${trimmedSummary}]]`)) {
					newHWSet.delete(eventUID);
				}
			}
		}

		TE_setStorage({cs_cal_update: now}, "cal332122");
		if (newHWSet.size > 0) TE_alertNewHW(1);

	} catch (err: any) {
		console.error("TE_back_cal_cs_err: " + err);
	}
}

async function TE_getWebwork(moodleData: { response: any, responseURL: string },
                             existingWebworkCourses: { [key: string]: { name: string, lti: string } }) {
	if (!moodleData.response["Courses"] || moodleData.response["Courses"].length === 0) {
		console.error("TE_login: failed to fetch webwork courses.");
		return;
	}

	const newWebworkCourses: { [key: string]: { name: string, lti: string } } = {},
		webworkRegex = /webwork|וובוורק|ווב-וורק/i, // The Next line is HARDCODED COURSE NUMBERS
		mathCourseNums = "01040000 01040003 01040004 01040012 01040013 01040016 01040018 01040019 01040022 01040031 01040032 01040033 01040034 01040035 01040036 01040038 01040041 01040042 01040043 01040044 01040064 01040065 01040066 01040131 01040136 01040166 01040174 01040192 01040195 01040215 01040220 01040221 01040228 01040281 01040285 01040295".split(" ");

	let courseHeadings = moodleData.response["CourseNames"];
	const courseUrlElements = moodleData.response["CourseLinks"];

	for (let i = 0; i < courseUrlElements.length; i++) {
		const courseMatch = courseHeadings[i].replace(semesterRegex, "").match(courseRegex);
		if (courseMatch) {
			const {cname, cnum} = courseMatch.groups;
			const courseNumStr = parseInt(cnum).toString();

			if (mathCourseNums.includes(courseNumStr)) {
				const courseID: string = courseUrlElements[i].split("id=")[1];
				if (existingWebworkCourses[courseID]) {
					newWebworkCourses[courseID] = existingWebworkCourses[courseID];
					continue;
				}

				const ltiIndexPage = await XHR(`https://moodle24.technion.ac.il/mod/lti/index.php?id=${courseID}`, "document", ["WebworkLinks"]);
				const links = ltiIndexPage.response["WebworkLinks"];
				let ltiId = "";
				for (const link of links) {
					if (webworkRegex.test(link.textContent)) {
						ltiId = link.getAttribute("href").split("id=")[1];
						break;
					}
				}

				if (ltiId) newWebworkCourses[courseID] = {name: cname.trim(), lti: ltiId};
			}
		}
	}

	TE_setStorage({webwork_courses: newWebworkCourses}, "webworkCourses");
	TE_webworkScan();
}

async function TE_webworkStep(url: string, body = "") {
	const webworkRegex = /webwork/i;
	try {
		const response = await XHR(url, "document", ["WebworkForm"], body);
		const form = response.response["WebworkForm"];
		if (!form) return false;

		const actionUrl = form.getAttribute("action"), formData = new FormData(form);
		const redirectUri = formData.get("redirect_uri") || formData.get("target_link_uri") || actionUrl;

		return webworkRegex.test(redirectUri) ? [actionUrl, formData] : false;
	} catch (err) {
		return false;
	}
}

function TE_webworkScan() {
	chrome.storage.local.get({webwork_courses: {}, webwork_cal: {}}, async (storage) => {
		const newWebworkCal = {}, statusRegex = /^ייפתח|^סגור/,
			dateRegex = /(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{4}) @ (?<hour>\d{2}):(?<minute>\d{2})/;
		let foundNewAssignment = false;

		interface WebworkCourse {
			lti: string,
			name: string,
		}

		for (const courseData of Object.values(storage.webwork_courses)) {
			let step1 = await TE_webworkStep(`https://moodle24.technion.ac.il/mod/lti/launch.php?id=${(courseData as WebworkCourse).lti}`);
			if (!step1) continue;

			let step2 = await TE_webworkStep(step1[0], new URLSearchParams(step1[1]).toString());
			if (!step2) continue;

			let step3 = await TE_webworkStep(step2[0], new URLSearchParams(step2[1]).toString());
			if (!step3) continue;

			const finalBody = new URLSearchParams(step3[1]).toString();
			const page = await XHR(step3[0], "document", ["WebworkMissions"], finalBody);
			const assignments: {
				[key: string]: { h: string, due: string, ts: number, seen: boolean, done: boolean }
			} = {}, tableRows = page.response["WebworkMissions"];

			for (let i = 1; i < tableRows.length; i++) {
				const cells = tableRows[i];
				if (statusRegex.test(cells[1].textContent)) continue;

				const dateMatch = dateRegex.exec(cells[1].textContent)?.groups;
				const hwName = cells[0].textContent;
				const assignmentId = `${(courseData as WebworkCourse).lti}_${hwName}`;

				let seen = false, done = false;
				if (storage.webwork_cal[assignmentId]) {
					seen = storage.webwork_cal[assignmentId].seen;
					done = storage.webwork_cal[assignmentId].done;
				} else {
					foundNewAssignment = true;
				}

				if (!dateMatch) {
					console.error(`TE_webwork_scan: failed to parse date for assignment ${hwName} in course ${(courseData as WebworkCourse).name}.`);
					continue;
				}

				assignments[assignmentId] = {
					h: hwName,
					ts: (new Date(parseInt(dateMatch.year), parseInt(dateMatch.month) - 1, parseInt(dateMatch.day), parseInt(dateMatch.hour), parseInt(dateMatch.minute))).getTime(),
					due: `${dateMatch.day}.${dateMatch.month}.${dateMatch.year} - ${dateMatch.hour}:${dateMatch.minute}`,
					seen: seen,
					done: done,
				};
			}
			Object.assign(newWebworkCal, assignments);
		}

		TE_setStorage({webwork_cal: newWebworkCal, ww_cal_update: Date.now()}, "wwcfail_1");
		if (foundNewAssignment) TE_alertNewHW(2);
	});
}

function TE_doDownloads(chunk: DownloadItem) {
	chrome.storage.local.get({dl_queue: []}, storageData => {
		storageData.dl_queue.push(chunk);
		TE_setStorage({dl_queue: storageData.dl_queue}, "doDownloads");
		if (chrome.runtime.lastError) {
			console.error("TE_bg_download_fail: " + chrome.runtime.lastError.message);
			const sizeError: string = JSON.stringify(storageData.dl_queue).length > 1E6 ? "ייתכן שהתוסף מנסה להוריד יותר מידי קבצים בו זמנית." : "";
			TE_notification(`שליחת הקבצים להורדה נכשלה. ${sizeError}\n`, true, "downloads");
		} else {
			const newMessage = `${chunk.list.length} פריטים נשלחו להורדה. ${storageData.dl_queue.length > 1 ? "התוסף יוריד אותם מיד לאחר הקבצים שכבר נמצאים בהורדה." : ""}\n`;
			TE_notification(newMessage, true, "downloads");
			TE_nextDownload();
		}
	});
}

function TE_nextDownload() {
	const urlPrefixes = ["https://moodle24.technion.ac.il/blocks/material_download/download_materialien.php?courseid=", "https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/", "https://grades.cs.technion.ac.il/grades.cgi?", "https://webcourse.cs.technion.ac.il/"];
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, (storage) => {
		if (storage.dl_current === 0 && storage.dl_queue.length > 0) {
			const currentQueueItem: DownloadItem = storage.dl_queue[0];
			const downloadItem = currentQueueItem.list.shift() as DownloadItem["list"][0];
			const fullUrl = urlPrefixes[currentQueueItem.sys] + currentQueueItem.sub_pre + downloadItem.u;

			chrome.downloads.download({
				url: fullUrl, filename: downloadItem.n, saveAs: false,
			}, (downloadId) => {
				if (chrome.runtime.lastError) {
					console.error("TE_bg_dls: " + chrome.runtime.lastError.message);
					console.log(` - filename: ${downloadItem.n}\n - url: ${fullUrl}`);
				} else {
					storage.dl_current = downloadId;
					void chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"});
					setTimeout(() => {
						void chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"});
						setTimeout(() => {
							void chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"});
						}, 250);
					}, 250);
					TE_setStorage({dl_current: storage.dl_current, dl_queue: storage.dl_queue});
				}
			});
		}
	});
}

export async function TE_updateVideosInfo(timestamp: number, callbacks: any = null) {
	const headers = new Headers();
	headers.append("Authorization", "Basic Y291bHBsZWRseXNlcXVhbGxvbmVyd2FyOjZhODk1NTljMmQyYzFlNDViZTQyYzk3MDQ3N2E3MDRhMDkwNjg0ODg=");
	headers.append("Content-Type", "application/json");

	try {
		const response =
			await fetch("https://12041543-fd22-49b6-bf91-5fa9cf6046b2-bluemix.cloudant.com/tpvideos/v_Data%3Abff4cb5a16c3d92e443287a965d1f385",
				{method: "GET", headers: headers});
		const dbData = await response.json() as { _id: string, _rev: string, data: { [key: number]: RecordingCourse } };

		if (!dbData["data"] || !dbData["_id"]) {
			console.error("TE_back_video_update_err: video-update bad request.");
			if (callbacks) callbacks[1]();
		}

		const coursesList: string[][] = [], videosData: { [key: string]: RecordingCourse["v"] } = {};
		for (const courseId in dbData.data) {
			const courseInfo = dbData.data[courseId];
			const courseEntry = [courseId, courseInfo["n"]];
			if (courseInfo["a"]) courseEntry.push(courseInfo["a"]);
			coursesList.push(courseEntry);
			videosData[courseId] = courseInfo["v"];
		}
		console.log(`TE_back: found ${coursesList.length} courses for videos-db (${timestamp})`);
		TE_setStorage({videos_courses: coursesList, videos_data: videosData, videos_update: timestamp}, "uc");
		if (callbacks) callbacks[0](coursesList, videosData);
	} catch (err) {
		console.error("TE_back_video_update_err: " + err);
		if (callbacks) callbacks[1]();
	}
}

export function TE_updateInfo() {
	chrome.storage.local.get({
		uidn_arr: ["", ""], quick_login: true, enable_login: false, enable_external: false, calendar_prop: "",
		calendar_max: 0, moodle_cal: true, cal_seen: 0, cs_cal: false, cs_cal_seen: {}, cs_cal_update: 0, cs_pass: "",
		ww_cal_switch: false, ww_cal_update: 0, webwork_courses: {}, videos_update: 0,
		filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
	}, async (storage) => {
		if (chrome.runtime.lastError) {
			console.error("TE_bg_Alarm: " + chrome.runtime.lastError.message);
			return;
		}

		const THIRTY_DAYS = 2592E5, EIGHT_HOURS = 288E5, TWO_DAYS = 1728E5, now = Date.now();
		if (storage.videos_update < now - THIRTY_DAYS) await TE_updateVideosInfo(now);

		const loginEnabledEh = (storage.enable_external || storage.enable_login) && storage.quick_login,
			moodleCheckDueEh = loginEnabledEh && storage.moodle_cal,
			webworkCheckDueEh = loginEnabledEh && storage.ww_cal_switch && (now - storage.ww_cal_update > EIGHT_HOURS);

		if (webworkCheckDueEh || moodleCheckDueEh) {
			try {
				const moodleData = await TE_AutoLogin();
				if (moodleCheckDueEh) {
					TE_getCoursesMoodle(moodleData);
					await TE_checkCalendarProp(storage.calendar_prop);
					await TE_alertMoodleCalendar(storage.cal_seen, storage.calendar_prop, storage.calendar_max, storage.filter_toggles);
				}
				if (webworkCheckDueEh) {
					await TE_getWebwork(moodleData, storage.webwork_courses);
				}
			} catch (err) {
				console.error("TE_back: forced_login_err -- " + err);
			}
		}

		if (storage.cs_cal && now - storage.cs_cal_update > 1)
			await TE_csCalendarCheck(storage.uidn_arr, storage.cs_pass, storage.cs_cal_seen);

		chrome.storage.local.get({user_agenda: {}}, storage => {
			const userAgenda: { [key: string]: HWAssignment } = storage.user_agenda;
			let hasChanged = false;
			for (const key in userAgenda) {
				const timestamp = userAgenda[key].timestamp;
				if (timestamp > 0 && now - timestamp > TWO_DAYS) {
					delete userAgenda[key];
					hasChanged = true;
				}
			}
			if (hasChanged) TE_setStorage({user_agenda: userAgenda});
		});
	});
}

export function TE_toggleBusAlert(busLine: string) {
	chrome.storage.local.get({buses_alerts: []}, (storage) => {
		if (chrome.runtime.lastError) {
			console.error("TE_back_bus_err: " + chrome.runtime.lastError.message);
			return;
		}
		if (storage.buses_alerts.length === 0)
			void chrome.alarms.create("TE_buses_start", {
				delayInMinutes: 1, periodInMinutes: 1,
			});

		const alertIndex = storage.buses_alerts.indexOf(busLine);
		if (alertIndex !== -1) {
			storage.buses_alerts.splice(alertIndex, 1);
			if (storage.buses_alerts.length === 0) TE_shutBusesAlerts();
		} else storage.buses_alerts.push(busLine);

		TE_setStorage({buses_alerts: storage.buses_alerts}, "toggleBus");
		TE_checkBuses();
	});
}

export function TE_shutBusesAlerts() {
	console.log("TE_shutBusesAlerts");
	TE_setStorage({buses_alerts: []}, "shutBuses");
	void chrome.alarms.clear("TE_buses_start");
}

function TE_busAlertError() {
	TE_notification("התרחשה שגיאה בניסיון יצירת התראה לאוטובוס, אנא נסה שנית.\nשים לב: ההתראות הקיימות, במידה והיו, נמחקו.", false);
	TE_shutBusesAlerts();
}

function TE_busAlertNow(arrivingBuses: BusLine[]) {
	let messageBody = "";
	for (const bus of arrivingBuses) {
		messageBody += `קו ${bus["Shilut"]} יגיע לתחנה בעוד ${bus["MinutesToArrival"]} דקות.\n`;
	}
	TE_notification(messageBody, false);

	chrome.storage.local.get({buses_alerts: []}, (storage) => {
		const alertedLines = arrivingBuses.map(bus => bus["Shilut"]);
		storage.buses_alerts = storage.buses_alerts.filter((line: string) => !alertedLines.includes(line));
		TE_setStorage({buses_alerts: storage.buses_alerts}, "removeAlertedBuses");

		if (storage.buses_alerts.length === 0) TE_shutBusesAlerts();
	});
}

function TE_checkBuses() {
	console.log("TE_checkBuses");
	chrome.storage.local.get({bus_station: 41205, bus_time: 10, buses_alerts: []}, async (storage) => {
		if (chrome.runtime.lastError) {
			console.error("TE_bg_checkBuses_err: " + chrome.runtime.lastError.message);
			return;
		}
		if (storage.buses_alerts.length === 0) return;

		try {
			const busData = await XHR(`https://bus.gov.il/WebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/${storage.bus_station}/he/false`, "json");
			const realtimeData: BusLine[] = busData.response;
			if (!Array.isArray(realtimeData)) {
				TE_busAlertError();
				return;
			}

			const busesToAlert = realtimeData.filter(bus => storage.buses_alerts.includes(bus["Shilut"]) && bus["MinutesToArrival"] <= storage.bus_time);

			if (busesToAlert.length > 0) TE_busAlertNow(busesToAlert);
		} catch (err) {
			TE_busAlertError();
		}
	});
}

function TE_sendMessageToTabs(data: { mess_t: string, angle?: number | unknown }) {
	chrome.tabs.query({}, tabs => {
		const moodleTabs = tabs.filter(tab => (tab.url as string).includes("moodle"));
		for (const tab of moodleTabs) {
			chrome.tabs.sendMessage(tab.id as number, data, {}, () => {
				if (chrome.runtime.lastError) console.error("TE_popup_remoodle: " + chrome.runtime.lastError.message);
			});
		}
	});
}

async function TE_setupOffscreenDocument() {
	const offscreenUrl = chrome.runtime.getURL('html/offscreen.html');
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [offscreenUrl],
	});

	if (existingContexts.length > 0) return;

	await chrome.offscreen.createDocument({
		url: offscreenUrl, reasons: ["DOM_PARSER", "AUDIO_PLAYBACK"],
		justification: `עמוד הרקע נחוץ על מנת לנתח מידע ממודל, וובוורק, ושרת מדמ"ח, ולהשמיע צלילי התראות.`,
	}).catch(console.error);
}

function TE_startExtension() {
	void chrome.alarms.create("TE_update_info", {delayInMinutes: 1, periodInMinutes: 60});
	TE_setStorage({buses_alerts: [], dl_queue: [], dl_current: 0});
}

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
	switch (message.mess_t) {
		case "single_download":
			chrome.downloads.download({url: message.link, filename: message.name, saveAs: false}, () => {
				if (chrome.runtime.lastError) console.error("TE_bg_dl: " + chrome.runtime.lastError.message);
			});
			break;
		case "multi_download":
			TE_doDownloads(message.chunk);
			break;
		case "bus_alert":
			TE_toggleBusAlert(message.bus_kav);
			break;
		case "login_moodle_url":
			fetch(`https://${message.url}/auth/oidc/`, {
				headers: {
					accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"accept-language": "en-US,en;q=0.9", "cache-control": "no-cache", pragma: "no-cache",
					"sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
					"sec-fetch-dest": "document", "sec-fetch-mode": "navigate", "sec-fetch-site": "none",
				}, body: null, method: "HEAD", mode: "cors", credentials: "include",
			}).then(res => sendResponse(res.url)).catch(console.error);
			return true;
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
				.then(response => response.json()).then(data => sendResponse(data)).catch(console.error);
			return true;
	}
	return false;
});

chrome.downloads.onChanged.addListener((delta) => {
	chrome.storage.local.get({dl_current: 0, dl_queue: []}, (storage) => {
		if (delta.id !== storage.dl_current) return;

		const finishDownload = (isError = false) => {
			if (isError) {
				const systemName = ["moodle", "panopto", "GR++", "webcourse"][storage.dl_queue[0]?.sys] ?? "unknown";
				console.error(`TE_dlFailed ${delta.id} : ${systemName}`);
			}

			if (storage.dl_queue[0]?.list.length === 0) storage.dl_queue.shift();
			storage.dl_current = 0;
			TE_setStorage({
				dl_current: storage.dl_current, dl_queue: storage.dl_queue,
			});
			void chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-16.png"});
			TE_nextDownload();
		};

		if (delta.state) {
			if (delta.state.current === "complete") finishDownload(false); else if (delta.state.current === "interrupted") finishDownload(true);
		} else if (delta.paused && delta.paused.current === false) {
			chrome.downloads.search({id: delta.id}, (downloads) => {
				if (downloads[0]?.state === "interrupted") finishDownload(true);
			});
		}
	});
});

chrome.alarms.onAlarm.addListener((alarm) => {
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

chrome.runtime.onInstalled.addListener(details => {
	if (details.reason === "install") console.log("Technion++: Welcome!"); // TODO: Do something in the future
	else if (details.reason === "update") void chrome.tabs.create({url: 'html/release_notes.html'});
	TE_startExtension();
});

chrome.runtime.onStartup.addListener(TE_startExtension);