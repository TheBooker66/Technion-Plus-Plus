import {CommonPopup} from './common_popup.js';
import {resetBadge, reverseString, xorStrings} from './utils.js';

(async function () {
	function makeTabsClicky(tabs: NodeListOf<HTMLDivElement>, popup: HTMLDivElement[]) {
		for (let i = 0; i < tabs.length; i++) {
			tabs[i].addEventListener("click", () => {
				if (tabs[i].classList.contains("current")) return;
				for (let j = 0; j < tabs.length; j++) {
					tabs[j].className = j === i ? "tab current" : "tab";
					popup[j].style.display = j === i ? "block" : "none";
				}
			});
		}
	}

	new CommonPopup("", ["main"], document.title);
	chrome.action.getBadgeBackgroundColor({}, (badgeColours) => {
		if (badgeColours[0] === 215 && badgeColours[1] === 0 && badgeColours[2] === 34)
			(document.getElementById("bus_error") as HTMLDivElement).style.display = "block";
	});
	resetBadge();

	const mainScreen = document.getElementById("tools_and_links") as HTMLDivElement,
		printScreen = document.getElementById("print") as HTMLDivElement,
		appsScreen = document.getElementById("apps") as HTMLDivElement;
	const screenTransitions = [
		{button: "gotoPrint", from: mainScreen, to: printScreen},
		{button: "gotoApps", from: mainScreen, to: appsScreen},
		{button: "returnFromPrint", from: printScreen, to: mainScreen},
		{button: "returnFromApps", from: appsScreen, to: mainScreen},
	];
	screenTransitions.forEach(linkObject => {
		document.getElementById(linkObject.button)!.addEventListener("click", () => {
			linkObject.to.style.display = "block";
			linkObject.from.style.display = "none";
		});
	});

	const popup_window = {
		type: "popup",
		focused: true,
		state: "normal",
		url: "html/organizer.html",
		height: Math.min(window.screen.height - 40, 720),
		width: Math.min(window.screen.width - 20, 1200),
		top: 0,
		left: 0,
	}, toolLinks = (document.getElementById("tools_content") as HTMLDivElement).querySelectorAll("a");
	popup_window.top = (window.screen.height - popup_window.height) / 2;
	popup_window.left = (window.screen.width - popup_window.width) / 2;
	(document.getElementById("release_notes") as HTMLAnchorElement)
		.addEventListener("click", () => chrome.tabs.create({url: "html/release_notes.html"}));
	(document.getElementById("organizer") as HTMLAnchorElement)
		.addEventListener("click", () => chrome.windows.create(popup_window as chrome.windows.CreateData));
	(document.getElementById("calculator") as HTMLAnchorElement)
		.addEventListener("click", () => chrome.tabs.create({url: "html/calculator.html"}));
	for (let i = 0; i < toolLinks.length; i++) {
		if ([0, 4, 5, 7].includes(i)) continue; // 0 - release notes, 4 - Organiser, 5 - calculator, 7 - printer
		toolLinks[i].addEventListener("click", () => window.location.href = "html/p_" + toolLinks[i].id + ".html");
	}

	const mainScreensLinks = document.querySelectorAll("#tools_and_links > div") as NodeListOf<HTMLDivElement>,
		printTabs = (document.getElementById("print_tabs") as HTMLDivElement).querySelectorAll("div"),
		pages = [document.getElementById("single_page"), document.getElementById("double_page"), document.getElementById("quadruple_page")] as HTMLDivElement[];
	makeTabsClicky(mainScreensLinks[0].querySelectorAll(".tab"), Array.from(mainScreensLinks).slice(1));
	makeTabsClicky(printTabs, pages);

	((document.getElementById("cant_login") as HTMLDivElement).querySelector("u") as HTMLElement).addEventListener("click", async () => {
		await chrome.runtime.openOptionsPage();
		if (chrome.runtime.lastError) console.error("TE_p: " + chrome.runtime.lastError.message);

	});

	const quick_login_toggle = document.getElementById("quick_login_toggle") as HTMLInputElement,
		mute_alerts_toggle = document.getElementById("mute_alerts_toggle") as HTMLInputElement;
	quick_login_toggle.addEventListener("change", async () => {
		await chrome.storage.local.set({quick_login: quick_login_toggle.checked});
		if (chrome.runtime.lastError) console.error("TE_popup_login: " + chrome.runtime.lastError.message);
	});
	mute_alerts_toggle.addEventListener("change", async () => {
		await chrome.storage.local.set({alerts_sound: mute_alerts_toggle.checked});
		if (chrome.runtime.lastError) console.error("TE_popup_mute_alerts: " + chrome.runtime.lastError.message);
	});

	const storageData = await chrome.storage.local.get({
		enable_login: false, quick_login: true, alerts_sound: true, gmail: true,
		moodle_cal: true, remoodle: false, remoodle_angle: 120, cal_seen: 0,
		cs_cal: false, uidn_arr: ["", ""], ww_cal_switch: false,
		dl_current: 0, username: "", server: true, custom_name: "", custom_link: "",
	});
	quick_login_toggle.checked = storageData.quick_login;
	mute_alerts_toggle.checked = storageData.alerts_sound;
	(document.getElementById("cant_login") as HTMLDivElement).style.display =
		storageData.enable_login ? "none" : "block";
	(document.getElementById("cal_moodle") as HTMLAnchorElement).style.display =
		storageData.enable_login && storageData.moodle_cal && storageData.quick_login ? "block" : "none";
	(document.getElementById("cal_cs") as HTMLAnchorElement).style.display =
		storageData.cs_cal ? "block" : "none";
	(document.getElementById("cal_webwork") as HTMLAnchorElement).style.display =
		storageData.enable_login && storageData.quick_login && storageData.ww_cal_switch ? "block" : "none";

	const calendarIDs = ["cal_moodle", "cal_cs", "cal_webwork"];
	for (let i = 0; i < calendarIDs.length; i++) {
		// noinspection JSBitwiseOperatorUsage
		if (storageData.cal_seen & Math.pow(2, i))
			(document.getElementById(calendarIDs[i]) as HTMLDivElement).className = "major hw";
	}

	if (storageData.dl_current !== 0) (document.getElementById("downloads") as HTMLAnchorElement).classList.add("active");

	const printerLinks = printScreen.querySelectorAll("a"),
		id: string = reverseString(xorStrings(storageData.uidn_arr[0] + "", storageData.uidn_arr[1])) || "הקלד מספר זהות כאן",
		gmailEh: boolean = storageData.gmail && !chrome.runtime.lastError;
	for (let i = 0; i < printerLinks.length; i++) {
		const emailURL = gmailEh
			? `https://mail.google.com/mail/u/0/?view=cm&to=print.${printerLinks[i].id}@campus.technion.ac.il&su=${id}&fs=1&tf=1`
			: `mailto:print.${printerLinks[i].id}@campus.technion.ac.il?subject=${id}`;
		printerLinks[i].setAttribute("href", emailURL);
		if (id !== "הקלד מספר זהות כאן" && id !== "") continue;
		printerLinks[i].addEventListener("click", () => {
			chrome.runtime.sendMessage({
				mess_t: "silent_notification",
				message: 'מיד ייפתח חלון לשליחת מייל בהתאם לבחירתך. עלייך למלא מספר ת"ז בנושא ולצרף את הקבצים המבוקשים להדפסה.',
			}, () => {
				if (chrome.runtime.lastError)
					console.error("TE_popup_printers: " + chrome.runtime.lastError.message);
			});
		});
	}

	const studentsLink = document.getElementById("UGS_Link") as HTMLAnchorElement,
		customLink = document.getElementById("custom_link") as HTMLAnchorElement;
	studentsLink.addEventListener("click", async () => {
		const loadingInterval = setInterval(() => {
			studentsLink.textContent = 7 > studentsLink.textContent.length ? studentsLink.textContent + "." : "טוען";
		}, 500);
		let authURL;
		try {
			authURL = (await fetch("https://students.technion.ac.il/auth/oidc/", {method: "HEAD"})).url;
		} catch {
			authURL = "https://students.technion.ac.il/auth/oidc/";
		}
		if (!storageData.enable_login || !storageData.quick_login) return;
		let urlParts = authURL.split("?");
		const urlParams = new URLSearchParams(urlParts[1]);
		urlParams.delete("prompt");
		urlParams.append("login_hint", storageData.username + "@" + (storageData.server ? "campus." : "") + "technion.ac.il");
		await chrome.tabs.create({url: (urlParts[0] + "?" + urlParams.toString()) || authURL});
		clearInterval(loadingInterval);
		studentsLink.textContent = "Students";
	});

	if (storageData.custom_name && storageData.custom_link) {
		customLink.textContent = storageData.custom_name;
		customLink.title = "קישור אישי שלכם! מעניין מה הוספתם...";
		customLink.setAttribute("href", storageData.custom_link);
	} else {
		customLink.textContent = "פנופטו";
		customLink.title = "מאגר קורסים מצולמים";
		customLink.setAttribute("href", "https://panoptotech.cloud.panopto.eu");
	}
})();
