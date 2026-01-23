import {reverseString, xorStrings} from "./utils.js";

const courseRegex = /(?<cname>.+)\s-\s(?<cnum>\d{6,8})/, semesterRegex = / - (?:קיץ|חורף|אביב)/;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function TE_setStorage(data: Partial<StorageData>, callerName = "unknown") {
	await chrome.storage.local.set(data);
	if (chrome.runtime.lastError) console.error(`TE_bg_${callerName}: ${chrome.runtime.lastError.message}`);
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
			if (typeof browser !== "undefined" && browser) {
				const doc = new DOMParser().parseFromString(await response.text(), "text/html");
				const courseVisibleElements = Array.from(doc.querySelectorAll(".coursevisible"));
				// noinspection DuplicatedCode
				const actions = {
					get CourseNames() {
						return courseVisibleElements.map(name => name.querySelector("h3")!.textContent);
					},
					get CourseLinks() {
						return courseVisibleElements.map(name => name.querySelector(".coursestyle2btn")!.getAttribute("href"));
					},
					get WebworkForm() {
						const form = doc.querySelector("form");
						if (!form) return null;

						const formData: { [key: string]: string } = {};
						const elements = form.elements;
						for (let i = 0; i < elements.length; i++) {
							const element = elements[i] as HTMLFormElement;
							if (element.name) {
								if (element.type === 'checkbox' || element.type === 'radio') {
									if (element.checked) {
										formData[element.name] = element.value;
									}
								} else {
									formData[element.name] = element.value;
								}
							}
						}

						return {
							action: form.action,
							data: formData,
						};
					},
					get WebworkMissions() {
						const missionsContainer = doc.getElementById("set-list-container");
						if (!missionsContainer) return [];
						const missions = missionsContainer.querySelectorAll("li > div.ms-3.me-auto");
						return Array.from(missions).map(mission => {
							return {
								name: mission.querySelector("div > a.fw-bold.set-id-tooltip")?.textContent.trim() ??
									mission.querySelector("div > span.set-id-tooltip")?.textContent.trim() ?? "מטלה ללא שם",
								due: mission.querySelector("div.font-sm")?.textContent.trim() ?? "אין תאריך הגשה",
							};
						});
					},
					get WebworkLinks() {
						const elements = doc.querySelectorAll(".mod_index .lastcol a") as NodeListOf<HTMLAnchorElement>;
						return Array.from(elements).map(link => ({
							text: link.textContent,
							href: link.href,
						}));
					},
					get SessionKey() {
						return (doc.querySelector("[name='sesskey']") as HTMLInputElement)?.value;
					},
					get CalendarURL() {
						return (doc.getElementById("calendarexporturl") as HTMLInputElement)?.value;
					},
					get UserText() {
						return doc.querySelector(".usertext")?.textContent;
					},
					get HWList() {
						return doc.activeElement?.innerHTML.split("BEGIN:VEVENT") ?? [];
					},
				};

				let returnObj: { [key: string]: any } = {};
				for (const key of info) {
					if (actions[key as keyof typeof actions] !== undefined)
						returnObj[key] = actions[key as keyof typeof actions];
				}
				responsePayload = returnObj;
			} else {
				await TE_setupOffscreenDocument();
				responsePayload = await chrome.runtime.sendMessage({
					mess_t: "DOMParser", data: await response.text(), dataNeeded: info,
				});
				await chrome.offscreen.closeDocument();
			}
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
		const initialResponse = await XHR("https://moodle25.technion.ac.il/auth/oidc/", "document", ["CourseNames", "CourseLinks"], "", headRequestEh);
		if (!initialResponse.responseURL.includes("microsoft")) {
			console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
			return initialResponse;
		}

		const loginDetails = await chrome.storage.local.get({
			username: "", email_server: true, enable_login: false,
		});
		if (!loginDetails.enable_login) {
			console.error("No username/password");
			return {response: "Error", responseURL: ""};
		}

		const urlParts = initialResponse.responseURL.split("?");
		const params = new URLSearchParams(urlParts[1]);
		params.delete("prompt");
		params.append("login_hint", `${loginDetails.username}@${loginDetails.email_server ? "campus." : ""}technion.ac.il`);
		const URL = `${urlParts[0]}?${params.toString()}`;
		const tab = await chrome.tabs.create({url: URL, active: false});
		const tabId = tab.id as number;

		const MAX_RETRIES = 30, RETRY_DELAY = 500;
		for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
			const currentTab = await chrome.tabs.get(tabId);
			if (currentTab.url === "https://moodle25.technion.ac.il/") {
				await chrome.tabs.remove(tabId);
				const finalResponse = await XHR("https://moodle25.technion.ac.il/auth/oidc/", "document", ["CourseNames", "CourseLinks"], "", headRequestEh);
				console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
				return finalResponse;
			}
			await delay(RETRY_DELAY);
		}

		await chrome.tabs.remove(tabId);
		console.error("Could not login to moodle, possibly wrong username/password (normal).");
		return {response: "Error", responseURL: ""};
	} catch (err: any) {
		console.error(`TE_back_M_login: could not connect to moodle. {reason: ${err.message}} at ${Date.now()}`);
		return {response: "Error", responseURL: ""};
	}
}

async function TE_AutoLoginExternal() {
	try {
		const initialResponse = await XHR("https://moodle25.technion.ac.il/", "document", ["CourseNames", "UserText", "CourseLinks"]);
		if (initialResponse.response["UserText"]) {
			console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
			return initialResponse;
		}

		const tab = await chrome.tabs.create({url: "https://moodle25.technion.ac.il/", active: false});
		const tabId = tab.id as number;

		const MAX_RETRIES = 8, RETRY_DELAY = 1000;
		let retryCount = 0;

		while (retryCount < MAX_RETRIES) {
			try {
				const finalResponse = await XHR("https://moodle25.technion.ac.il/", "document", ["CourseNames", "UserText", "CourseLinks"]);
				if (finalResponse.response["UserText"]) {
					await chrome.tabs.remove(tabId);
					console.log(`TE_auto_login: connection was made! At ${Date.now()}`);
					return finalResponse;
				}
			} catch (err) {
				// If XHR fails, it might be a temporary network issue.
			}
			await delay(RETRY_DELAY);
			retryCount++;
		}

		await chrome.tabs.remove(tabId);
		console.error("Could not login to moodle, possibly wrong username/password (external).");
		return {response: "Error", responseURL: ""};
	} catch (err: any) {
		console.error(`TE_back_M_login: could not connect to moodle. {reason: ${err.message}} at ${Date.now()}`);
		return {response: "Error", responseURL: ""};
	}
}

export async function TE_AutoLogin(headRequestEh: boolean = false) {
	const storageData = await chrome.storage.local.get({external_enable: false});
	if (storageData.external_enable) return await TE_AutoLoginExternal();
	else return await TE_AutoLoginNormal(headRequestEh);
}


async function TE_notification(message: string, silentEh: boolean, notificationId = "") {
	const now = new Date();
	const hour = now.getHours().toString().padStart(2, '0'), minutes = now.getMinutes().toString().padStart(2, '0');
	const timestamp = `התראה התקבלה בשעה: ${hour}:${minutes}`;

	const notificationOptions: chrome.notifications.NotificationCreateOptions = {
		type: "basic",
		title: "Technion++",
		iconUrl: chrome.runtime.getURL("../icons/technion_plus_plus/icon-128.png"),
		message: `${message}\n${timestamp}`,
	};

	// @ts-ignore
	if (typeof chrome.notifications.NotificationOptions?.silent !== "undefined") notificationOptions.silent = true;
	if (notificationId) await chrome.notifications.clear(notificationId);
	await chrome.notifications.create(notificationId, notificationOptions);
	if (silentEh) return;

	const storageData = await chrome.storage.local.get({notif_vol: 1, alerts_sound: true}) as StorageData;
	if (chrome.runtime.lastError) {
		console.error("TE_bg_notification_err: " + chrome.runtime.lastError.message);
	} else if (storageData.alerts_sound) {
		if (typeof browser !== "undefined") {
			const audio = new Audio(chrome.runtime.getURL("../resources/notification.mp3"));
			audio.volume = storageData.notif_vol;
			await audio.play();
		} else {
			await TE_setupOffscreenDocument();
			await chrome.runtime.sendMessage({mess_t: "audio notification", volume: storageData.notif_vol});
			await chrome.offscreen.closeDocument();
		}
	}
}

async function TE_setBadge(errorEh: boolean) {
	const badgeColours = await chrome.action.getBadgeBackgroundColor({});
	const badgeText = await chrome.action.getBadgeText({});
	if (!(badgeColours[0] === 215 && badgeColours[1] === 0 && badgeColours[2] === 34 && badgeText === "!")) { // Error colours
		await chrome.action.setBadgeBackgroundColor({color: errorEh ? [215, 0, 34, 185] : [164, 127, 0, 185]});
		await chrome.action.setBadgeText({text: "!"});
	}
}

async function TE_alertNewHW(sourceIndex: number) {
	const sourceInfo = [
		{name: "מודל", flag: 1},
		{name: 'מדמ"ח', flag: 2},
		{name: "וובוורק", flag: 4},
	][sourceIndex];

	await TE_setBadge(false);

	const storageData = await chrome.storage.local.get({cal_seen: 0, hw_alerts: true}) as StorageData;
	if (chrome.runtime.lastError) {
		console.error("TE_bg_HWA: " + chrome.runtime.lastError.message);
		return;
	}
	await TE_setStorage({cal_seen: storageData.cal_seen | sourceInfo.flag}, "HWA");
	if (storageData.hw_alerts) await TE_notification(`יש לך מטלות חדשות ב${sourceInfo.name}!`, false);
}

async function TE_getCoursesMoodle(moodleData: { response: any }) {
	if (!moodleData.response["CourseNames"] || moodleData.response["CourseNames"].length === 0) {
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
		await TE_setStorage({moodle_cal_courses: courses}, "chk_get_cname");
	}
}

async function TE_checkCalendarProp(calendarProp: string) {
	if (calendarProp !== "") return;

	try {
		const mainPageResponse = await XHR("https://moodle25.technion.ac.il/calendar/export.php", "document", ["SessionKey"]);
		const SessionKey = mainPageResponse.response["SessionKey"];
		const postBody = `sesskey=${SessionKey}&_qf__core_calendar_export_form=1&events[exportevents]=all&period[timeperiod]=recentupcoming&generateurl=\u05d4\u05e9\u05d2+\u05d0\u05ea+\u05db\u05ea\u05d5\u05d1\u05ea+\u05d4-URL+\u05e9\u05dc+\u05dc\u05d5\u05d7+\u05d4\u05e9\u05e0\u05d4`;

		const exportResponse = await XHR(mainPageResponse.responseURL, "document", ["CalendarURL"], postBody);
		const calendarUrl = exportResponse.response["CalendarURL"];
		const userProp = "userid=" + calendarUrl.split("userid=")[1].split("&preset_what=all")[0];
		await TE_setStorage({moodle_cal_prop: userProp}, "cal2");
	} catch (err) {
		console.error("TE_back_prop_err: " + err);
	}
}


async function TE_alertMoodleCalendar(seenStatus: number, calendarProp: string, maxEventId: number, filterToggles: {
	"appeals": boolean, "zooms": boolean, "attendance": boolean, "reserveDuty": boolean
}) {
	if (seenStatus & 1) { // Moodle has been checked
		await TE_setBadge(false);
		return;
	}
	if (calendarProp === "0") return;

	const calendarUrl = `https://moodle25.technion.ac.il/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&${calendarProp}`;
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
				const eventUID = parseInt(eventText.split("UID:")[1].split("@moodle")[0]);
				if (eventUID > latestEventId) {
					latestEventId = eventUID;
				}
			}
		}

		if (latestEventId > maxEventId) await TE_alertNewHW(0);
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
			uid: /UID:[0-9.]+HW([0-9]+)/,
			time: /(?<Y>\d{4})(?<M>\d{2})(?<D>\d{2})(T(?<TH>\d{2})(?<TM>\d{2}))?/,
		};

		for (let i = 1; i < events.length; i++) {
			const eventText = events[i];
			const summary = eventText.match(regexes.summary)![1];
			const trimmedSummary = summary.split("(")[0].trim();
			if (regexes.banned.test(trimmedSummary)) continue;

			if (eventText.includes("icspasswordexpired")) {
				newHWSet.clear();
				console.error("TE_cs_cal_err: CS password expired.");
				await TE_notification('סיסמת היומן של הצגת המטלות של מדמ"ח פגה! כנס בדחיפות להגדרות התוסף להוראות חידוש הסיסמה!', false);
				break;
			}

			const eventUIDMatch = eventText[i].match(regexes.uid)?.[1];
			if (!eventUIDMatch) continue;
			const eventID = parseInt(eventUIDMatch);
			if (isNaN(eventID)) continue;

			const timeMatch = eventText.match(regexes.time)!.groups as { [key: string]: string };
			const dueDate = new Date(`${timeMatch.Y}-${timeMatch.M}-${timeMatch.D}T${timeMatch.TH || 23}:${timeMatch.TM || 59}:00+03:00`).getTime();
			if (dueDate < now || dueDate > now + THIRTY_DAYS) continue;

			if (eventText.includes(".PHW"))
				newHWSet.delete(eventID);
			else {
				newHWSet.add(eventID);
				const courseNum = summary.split("(")[1].split(")")[0];
				if (seenStatus[courseNum]?.includes(`[[${trimmedSummary}]]`)) {
					newHWSet.delete(eventID);
				}
			}
		}

		await TE_setStorage({cs_cal_update: now}, "cal332122");
		if (newHWSet.size > 0) await TE_alertNewHW(1);

	} catch (err: any) {
		console.error("TE_back_cal_cs_err: " + err);
	}
}

async function TE_webworkStep(url: string | FormData, body = "") {
	const webworkRegex = /webwork/i;
	try {
		const response = await XHR(url as string, "document", ["WebworkForm"], body);
		const form: { action: string, data: { [key: string]: string } } | null = response.response["WebworkForm"];
		if (!form || !form.action) {
			return false;
		}

		const actionUrl = form.action;
		const formData = new FormData();
		for (const key in form.data) {
			formData.append(key, form.data[key]);
		}

		const redirectUri = formData.get("redirect_uri") || formData.get("target_link_uri") || actionUrl;

		return webworkRegex.test(redirectUri.toString()) ? [actionUrl, formData] : false;
	} catch (err) {
		return false;
	}
}

async function TE_webworkScan() {
	const storageData = await chrome.storage.local.get({webwork_cal_courses: {}, webwork_cal_events: {}}) as StorageData;
	const newWebworkCal = {}, ignoreRegex = /^ייפתח|^סגור|^Answers available for review./,
		dateRegex = /(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{4}) @ (?<hour>\d{2}):(?<minute>\d{2})/;
	let foundNewAssignment = false;

	interface WebworkCourse {
		lti: string,
		name: string,
	}

	for (const courseData of Object.values(storageData.webwork_cal_courses)) {
		let step1 = await TE_webworkStep(`https://moodle25.technion.ac.il/mod/lti/launch.php?id=${(courseData as WebworkCourse).lti}`);
		if (!step1) continue;

		let step2 = await TE_webworkStep(step1[0],
			new URLSearchParams(step1[1] as string).toString());
		if (!step2) continue;

		let step3 = await TE_webworkStep(step2[0],
			new URLSearchParams(step2[1] as string).toString());
		if (!step3) continue;

		const finalBody = new URLSearchParams(step3[1] as string).toString();
		const page = await XHR(step3[0] as string, "document", ["WebworkMissions"], finalBody);
		const assignments: { [key: number]: { h: string, due: string, ts: number, seen: boolean, done: boolean } } = {},
			missions: { name: string, due: string }[] = page.response["WebworkMissions"];

		for (let i = 0; i < missions.length; i++) {
			const mission = missions[i];
			if (ignoreRegex.test(mission.due)) continue;
			const hwName = mission.name;
			const assignmentId = parseInt((courseData as WebworkCourse).lti + "000" + i.toString());

			let seen = false, done = false;
			if (storageData.webwork_cal_events[assignmentId]) {
				seen = storageData.webwork_cal_events[assignmentId].seen;
				done = storageData.webwork_cal_events[assignmentId].done;
			} else {
				foundNewAssignment = true;
			}

			const dateMatch = dateRegex.exec(mission.due)?.groups;
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

	await TE_setStorage({webwork_cal_events: newWebworkCal, webwork_cal_update: Date.now()}, "wwcfail_1");
	if (foundNewAssignment) await TE_alertNewHW(2);
}

async function TE_getWebwork(moodleData: { response: any, responseURL: string },
                             existingWebworkCourses: { [key: string]: { name: string, lti: string } }) {
	if (!moodleData.response["CourseNames"] || moodleData.response["CourseNames"].length === 0) {
		console.error("TE_login: failed to fetch webwork courses.");
		return;
	}

	const newWebworkCourses: StorageData["webwork_cal_courses"] = {},
		webworkRegex = /webwork|וובוורק|ווב-וורק/i, // The Next line is HARDCODED COURSE NUMBERS, thanks to Cheesefork.
		mathCourseNums = ["01040044", "01040276", "01060937", "01060429", "01060010", "01040253", "01040142", "01040038", "01060405", "01040214", "01040222", "01040013", "01040228", "01060309", "01040195", "01040144", "01060015", "01970008", "01060942", "01060393", "01040185", "01060431", "01040221", "01040002", "01060396", "01040164", "01040181", "01060802", "01060800", "01040285", "01060423", "01040165", "01040064", "01040814", "01060931", "01970010", "01040192", "01040215", "01960015", "01040012", "01060383", "01970011", "01040131", "01030015", "01040918", "01960013", "01040279", "01040122", "01040135", "01040824", "01040034", "01060803", "01040183", "01040065", "01040066", "01960014", "01040041", "01980000", "01040043", "01040283", "01040157", "01040004", "01040168", "01040277", "01060427", "01040818", "01040182", "01060742", "01060009", "01060935", "01040112", "01060156", "01040952", "01060411", "01040018", "01040281", "01040136", "01040280", "01060941", "01060395", "01060012", "01040030", "01060350", "01040022", "01960012", "01060397", "01040177", "01060960", "01060380", "01040019", "01970014", "01960001", "01040032", "01040293", "01060716", "01080002", "01040220", "01040166", "01040158", "01040174", "01060349", "01060375", "01040031", "01060702", "01040250", "01060723", "01040119", "01040163", "01040016", "01040033", "01040000", "01060011", "01060062", "01040823", "01040291", "01040295", "01040042", "01040294", "01040003", "01060927", "01060347", "01060394", "01060170", "01060804", "01060944", "01060413", "01970007", "01060928", "01060330", "01040286", "01040273", "01040252", "01060860", "01040134", "01040274", "01040193"];

	let courseHeadings = moodleData.response["CourseNames"];
	const courseUrlElements = moodleData.response["CourseLinks"];

	for (let i = 0; i < courseUrlElements.length; i++) {
		const courseMatch = courseHeadings[i].replace(semesterRegex, "").match(courseRegex);
		if (!courseMatch) continue;

		const {cname, cnum} = courseMatch.groups;
		if (!mathCourseNums.includes(cnum)) continue;

		const courseID: string = courseUrlElements[i].split("id=")[1];
		if (existingWebworkCourses[courseID]) {
			newWebworkCourses[courseID] = existingWebworkCourses[courseID];
			continue;
		}
		const ltiPage = await XHR(`https://moodle25.technion.ac.il/mod/lti/index.php?id=${courseID}`, "document", ["WebworkLinks"]);
		const links: { text: string, href: string }[] = ltiPage.response["WebworkLinks"];
		for (const link of links) {
			if (webworkRegex.test(link.text)) {
				newWebworkCourses[courseID] = {name: cname.trim(), lti: link.href!.split("id=")[1]};
				break;
			}
		}
	}

	await TE_setStorage({webwork_cal_courses: newWebworkCourses}, "webworkCourses");
	await TE_webworkScan();
}

async function TE_single_download(link: string, name: string) {
	await chrome.downloads.download({url: link, filename: name, saveAs: false});
	if (chrome.runtime.lastError) console.error("TE_bg_dl: " + chrome.runtime.lastError.message);
}

async function TE_doDownloads(chunk: DownloadItem) {
	const storageData = await chrome.storage.local.get({dl_queue: []}) as StorageData;
	storageData.dl_queue.push(chunk);
	await TE_setStorage({dl_queue: storageData.dl_queue}, "doDownloads");
	if (chrome.runtime.lastError) {
		console.error("TE_bg_download_fail: " + chrome.runtime.lastError.message);
		const sizeError: string = JSON.stringify(storageData.dl_queue).length > 1E6 ? "ייתכן שהתוסף מנסה להוריד יותר מידי קבצים בו זמנית." : "";
		await TE_notification(`שליחת הקבצים להורדה נכשלה. ${sizeError}\n`, true, "downloads");
	} else {
		const newMessage = `${chunk.list.length} פריטים נשלחו להורדה. ${storageData.dl_queue.length > 1 ? "התוסף יוריד אותם מיד לאחר הקבצים שכבר נמצאים בהורדה." : ""}\n`;
		await TE_notification(newMessage, true, "downloads");
		await TE_nextDownload();
	}
}

async function TE_nextDownload() {
	const urlPrefixes = ["https://moodle25.technion.ac.il/blocks/material_download/download_materialien.php?courseid=", "https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/", "https://grades.cs.technion.ac.il/grades.cgi?", "https://webcourse.cs.technion.ac.il/"];
	const storageData = await chrome.storage.local.get({dl_current: 0, dl_queue: []}) as StorageData;
	if (storageData.dl_current === 0 && storageData.dl_queue.length > 0) {
		const currentQueueItem: DownloadItem = storageData.dl_queue[0];
		const downloadItem = currentQueueItem.list.shift() as DownloadItem["list"][0];
		const fullUrl = urlPrefixes[currentQueueItem.sys] + currentQueueItem.sub_pre + downloadItem.u;

		chrome.downloads.download({
			url: fullUrl, filename: downloadItem.n, saveAs: false,
		}, async (downloadId) => {
			if (chrome.runtime.lastError) {
				console.error("TE_bg_dls: " + chrome.runtime.lastError.message);
				console.log(` - filename: ${downloadItem.n}\n - url: ${fullUrl}`);
			} else {
				storageData.dl_current = downloadId;
				await chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"});
				setTimeout(async () => {
					await chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-128.png"});
					setTimeout(async () => {
						await chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-green.png"});
					}, 250);
				}, 250);
				await TE_setStorage({dl_current: storageData.dl_current, dl_queue: storageData.dl_queue});
			}
		});
	}
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
		await TE_setStorage({videos_courses: coursesList, videos_data: videosData, videos_update: timestamp}, "uc");
		if (callbacks) callbacks[0](coursesList, videosData);
	} catch (err) {
		console.error("TE_back_video_update_err: " + err);
		if (callbacks) callbacks[1]();
	}
}

export async function TE_updateInfo() {
	const storageData = await chrome.storage.local.get({
		uidn_arr: ["", ""], quick_login: true, enable_login: false, external_enable: false,
		cal_seen: 0, moodle_cal_enabled: true, moodle_cal_prop: "", moodle_cal_max: 0,
		filter_toggles: {"appeals": false, "zooms": false, "attendance": false, "reserveDuty": false},
		cs_cal_enabled: false, cs_cal_update: 0, cs_cal_pass: "", cs_cal_seen: {},
		webwork_cal_enabled: false, webwork_cal_update: 0, webwork_cal_courses: {},
		user_agenda: {}, videos_update: 0,
	}) as StorageData;
	if (chrome.runtime.lastError) {
		console.error("TE_bg_Alarm: " + chrome.runtime.lastError.message);
		return;
	}

	const THIRTY_DAYS = 2592E5, EIGHT_HOURS = 288E5, TWO_DAYS = 1728E5, now = Date.now();
	if (storageData.videos_update < now - THIRTY_DAYS) await TE_updateVideosInfo(now);

	const loginEnabledEh: boolean = (storageData.external_enable || storageData.enable_login) && storageData.quick_login,
		moodleCheckDueEh: boolean = loginEnabledEh && storageData.moodle_cal_enabled,
		webworkCheckDueEh: boolean = loginEnabledEh && storageData.webwork_cal_enabled && (now - storageData.webwork_cal_update > EIGHT_HOURS);

	if (moodleCheckDueEh || webworkCheckDueEh) {
		try {
			const moodleData = await TE_AutoLogin();
			if (moodleCheckDueEh) {
				await TE_getCoursesMoodle(moodleData);
				await TE_checkCalendarProp(storageData.moodle_cal_prop);
				await TE_alertMoodleCalendar(storageData.cal_seen, storageData.moodle_cal_prop, storageData.moodle_cal_max, storageData.filter_toggles);
			}
			if (webworkCheckDueEh) {
				await TE_getWebwork(moodleData, storageData.webwork_cal_courses);
			}
		} catch (err) {
			console.error("TE_back: forced_login_err -- " + err);
		}
	}

	if (storageData.cs_cal_enabled && now - storageData.cs_cal_update > 1)
		await TE_csCalendarCheck(storageData.uidn_arr, storageData.cs_cal_pass, storageData.cs_cal_seen);

	const userAgenda = storageData.user_agenda;
	let hasChanged = false;
	for (const key in userAgenda) {
		const timestamp = userAgenda[key].timestamp;
		if (timestamp > 0 && now - timestamp > TWO_DAYS) {
			delete userAgenda[key];
			hasChanged = true;
		}
	}
	if (hasChanged) await TE_setStorage({user_agenda: userAgenda});
}

export async function TE_toggleBusAlert(busLine: string) {
	const storageData = await chrome.storage.local.get({bus_alerts: []}) as StorageData;
	if (chrome.runtime.lastError) {
		console.error("TE_back_bus_err: " + chrome.runtime.lastError.message);
		return;
	}
	if (storageData.bus_alerts.length === 0)
		await chrome.alarms.create("TE_buses_start", {
			delayInMinutes: 1, periodInMinutes: 1,
		});

	const alertIndex = storageData.bus_alerts.indexOf(busLine);
	if (alertIndex !== -1) {
		storageData.bus_alerts.splice(alertIndex, 1);
		if (storageData.bus_alerts.length === 0) await TE_shutBusesAlerts();
	} else storageData.bus_alerts.push(busLine);

	await TE_setStorage({bus_alerts: storageData.bus_alerts}, "toggleBus");
	await TE_checkBuses();
}

export async function TE_shutBusesAlerts() {
	console.log("TE_shutBusesAlerts");
	await TE_setStorage({bus_alerts: []}, "shutBuses");
	await chrome.alarms.clear("TE_buses_start");
}

async function TE_busAlertError() {
	await TE_notification("התרחשה שגיאה בניסיון יצירת התראה לאוטובוס, אנא נסה שנית.\nשים לב: ההתראות הקיימות, במידה והיו, נמחקו.", false);
	await TE_shutBusesAlerts();
}

async function TE_busAlertNow(arrivingBuses: BusLine[]) {
	let messageBody = "";
	for (const bus of arrivingBuses) {
		messageBody += `קו ${bus["Shilut"]} יגיע לתחנה בעוד ${bus["MinutesToArrival"]} דקות.\n`;
	}
	await TE_notification(messageBody, false);

	const storageData = await chrome.storage.local.get({bus_alerts: []}) as StorageData;
	const alertedLines = arrivingBuses.map(bus => bus["Shilut"]);
	storageData.bus_alerts = storageData.bus_alerts.filter((line: string) => !alertedLines.includes(line));
	await TE_setStorage({bus_alerts: storageData.bus_alerts}, "removeAlertedBuses");

	if (storageData.bus_alerts.length === 0) await TE_shutBusesAlerts();
}

async function TE_checkBuses() {
	console.log("TE_checkBuses");
	const storageData = await chrome.storage.local.get({bus_station: 41205, bus_time: 10, bus_alerts: []}) as StorageData;
	if (chrome.runtime.lastError) {
		console.error("TE_bg_checkBuses_err: " + chrome.runtime.lastError.message);
		return;
	}
	if (storageData.bus_alerts.length === 0) return;

	try {
		const busData = await XHR(`https://bus.gov.il/WebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/${storageData.bus_station}/he/false`, "json");
		const realtimeData: BusLine[] = busData.response;
		if (!Array.isArray(realtimeData)) {
			await TE_busAlertError();
			return;
		}

		const busesToAlert = realtimeData.filter(bus => storageData.bus_alerts.includes(bus["Shilut"]) && bus["MinutesToArrival"] <= storageData.bus_time);

		if (busesToAlert.length > 0) await TE_busAlertNow(busesToAlert);
	} catch (err) {
		await TE_busAlertError();
	}
}

async function TE_sendMessageToTabs(data: { mess_t: string, angle?: number | unknown }) {
	const moodleTabs = await chrome.tabs.query({ url: "https://moodle*" });
	for (const tab of moodleTabs) {
		await chrome.tabs.sendMessage(tab.id as number, data);
		if (chrome.runtime.lastError) console.error("TE_popup_remoodle: " + chrome.runtime.lastError.message);
	}
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

async function TE_startExtension() {
	await chrome.alarms.create("TE_update_info", {delayInMinutes: 1, periodInMinutes: 60});
	await TE_setStorage({bus_alerts: [], dl_queue: [], dl_current: 0});
}

chrome.runtime.onMessage.addListener(async (message) => {
	switch (message.mess_t) {
		case "single_download":
			await TE_single_download(message.link, message.name);
			break;
		case "multi_download":
			await TE_doDownloads(message.chunk);
			break;
		case "silent_notification":
			await TE_notification(message.message, true);
			break;
		case "loud_notification":
			await TE_notification(message.message, false);
			break;
		case "TE_moodle_colour":
			await TE_sendMessageToTabs({mess_t: "TE_moodle_colour", angle: message.angle});
			break;
		case "TE_moodle_darkmode":
			await TE_sendMessageToTabs({mess_t: "TE_moodle_darkmode"});
			break;
		default:
			break;
	}
});

chrome.downloads.onChanged.addListener(async (delta) => {
	const storageData = await chrome.storage.local.get({dl_current: 0, dl_queue: []}) as StorageData;
	if (delta.id !== storageData.dl_current) return;

	const finishDownload = async (isError = false) => {
		if (isError) {
			const systemName = ["moodle", "panopto", "GR++", "webcourse"][storageData.dl_queue[0]?.sys] ?? "unknown";
			console.error(`TE_dlFailed ${delta.id} : ${systemName}`);
		}

		if (storageData.dl_queue[0]?.list.length === 0) storageData.dl_queue.shift();
		storageData.dl_current = 0;
		await TE_setStorage({
			dl_current: storageData.dl_current, dl_queue: storageData.dl_queue,
		});
		await chrome.action.setIcon({path: "../icons/technion_plus_plus/icon-128.png"});
		await TE_nextDownload();
	};

	if (delta.state) {
		if (delta.state.current === "complete") await finishDownload(false);
		else if (delta.state.current === "interrupted") await finishDownload(true);
	} else if (delta.paused && delta.paused.current === false) {
		chrome.downloads.search({id: delta.id}, async (downloads) => {
			if (downloads[0]?.state === "interrupted") await finishDownload(true);
		});
	}
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
	switch (alarm.name) {
		case "TE_update_info":
			await TE_updateInfo();
			break;
		case "TE_buses_start":
			await TE_checkBuses();
			break;
		default:
			console.error("Unknown alarm name: " + alarm.name);
	}
});

chrome.runtime.onInstalled.addListener(async details => {
	if (details.reason === "install") console.log("Technion++: Welcome!"); // TODO: Do something in the future
	else if (details.reason === "update") await chrome.tabs.create({url: 'html/release_notes.html'});
	await TE_startExtension();
});

chrome.runtime.onStartup.addListener(TE_startExtension);