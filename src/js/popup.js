'use strict';
import {CommonPopup} from './common_popup.js';
import {reverseString, xorStrings} from './utils.js';

(function () {
	function makeTabsClicky(tabs, popup, func = null) {
		for (let i = 0; i < tabs.length; i++) {
			tabs[i].addEventListener("click", () => {
				if (tabs[i].classList.contains("current")) return;
				for (let j = 0; j < tabs.length; j++) {
					tabs[j].className = j === i ? "tab current" : "tab";
					popup[j].style.display = j === i ? "block" : "none";
				}
				if (func) func(i);
			});
		}
	}

	const popup = new CommonPopup;
	popup.css_list = ["main"];
	popup.popupWrap();

	const OS = navigator.userAgentData ? navigator.userAgentData : "navigator.userAgentData is not supported!";
	OS.toString().includes("Android") || chrome.action.getBadgeBackgroundColor({}, badgeColor => {
		chrome.action.getBadgeText({}, badgeText => {
			if (215 === badgeColor[0] && 0 === badgeColor[1] && 34 === badgeColor[2] && "!" === badgeText) {
				void chrome.action.setBadgeText({text: ""});
				document.getElementById("bus_error").style.display = "block";
			}
		});
	});
	const apps = document.getElementById("apps_menu"), links = document.getElementById("more_links"),
		print = document.getElementById("print"), moreApps = document.getElementById("apps_links");
	apps.addEventListener("click", () => apps.className = "collapsed");
	document.getElementById("apps_link").addEventListener("click", () => window.open("https://cis-shop.technion.ac.il/product-category/software/"));
	[
		{b: "gotoPrint", from: links, to: print},
		{b: "gotoApps", from: links, to: moreApps},
		{b: "returnFromPrint", from: print, to: links},
		{b: "returnFromApps", from: moreApps, to: links},
	].forEach(linkObject => {
		document.getElementById(linkObject.b).addEventListener("click", () => {
			linkObject.to.style.display = "block";
			linkObject.from.style.display = "none";
			apps.className = "collapse";
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
	};
	popup_window.top = parseInt((window.screen.height - popup_window.height) / 2);
	popup_window.left = parseInt((window.screen.width - popup_window.width) / 2);
	document.getElementById("organizer").addEventListener("click", () => chrome.windows.create(popup_window));
	document.getElementById("release_notes").addEventListener("click", () => chrome.tabs.create({url: "html/release_notes.html"}));
	document.getElementById("calculator").addEventListener("click", () => chrome.tabs.create({url: "html/calculator.html"}));
	const toolLinks = document.getElementById("tools_content").getElementsByTagName("a");
	for (let i = 0; i < toolLinks.length; i++) {
		if ([4, 5, 7].includes(i)) continue; // 4 - Organiser, 5 - grades sheet, 7 - printer
		toolLinks[i].addEventListener("click", () => window.location.href = "html/p_" + toolLinks[i].id + ".html");
	}
	const linksDiv = document.querySelectorAll("#more_links > div"),
		tabsDiv = document.getElementById("secondary_tabs").getElementsByTagName("div"),
		pages = [document.getElementById("single_page"), document.getElementById("double_page"), document.getElementById("quadruple_page")];
	makeTabsClicky(linksDiv[0].querySelectorAll(".tab"), Array.from(linksDiv).slice(1), _ => apps.className = "collapse");
	makeTabsClicky(tabsDiv, pages);
	document.getElementById("cant_login").getElementsByTagName("u")[0].addEventListener("click", () => {
		chrome.runtime.openOptionsPage(() => {
			if (chrome.runtime.lastError)
				console.error("TE_p: " + chrome.runtime.lastError.message);
		});
	});
	document.getElementById("quick_login").addEventListener("change", () => {
		chrome.storage.local.set({quick_login: document.getElementById("quick_login").checked}, () => {
			if (chrome.runtime.lastError)
				console.error("TE_popup_login: " + chrome.runtime.lastError.message);
		});
	});
	document.getElementById("mute_alerts_toggle").addEventListener("change", () => {
		chrome.storage.local.set({alerts_sound: document.getElementById("mute_alerts_toggle").checked}, () => {
			if (chrome.runtime.lastError)
				console.error("TE_popup_mute_alerts: " + chrome.runtime.lastError.message);
		});
	});
	chrome.storage.local.get({
		enable_login: false,
		quick_login: true,
		alerts_sound: true,
		gmail: true,
		moodle_cal: true,
		remoodle: false,
		remoodle_angle: 120,
		cal_seen: 0,
		cs_cal: false,
		uidn_arr: ["", ""],
		wwcal_switch: false,
		dl_current: 0,
		username: "",
		server: true,
		custom_name: "",
		custom_link: "",
	}, function (storageData) {
		document.getElementById("quick_login").checked = storageData.quick_login;
		document.getElementById("mute_alerts_toggle").checked = storageData.alerts_sound;
		document.getElementById("cant_login").style.display = storageData.enable_login ? "none" : "block";
		document.getElementById("cal_moodle").style.display = storageData.enable_login && storageData.moodle_cal && storageData.quick_login ? "block" : "none";
		document.getElementById("cal_cs").style.display = storageData.cs_cal ? "block" : "none";
		document.getElementById("cal_webwork").style.display = storageData.enable_login && storageData.quick_login && storageData.wwcal_switch ? "block" : "none";

		const calendarIDs = ["cal_moodle", "cal_cs", "cal_mathnet", "cal_webwork"];
		for (let i = 0; i < calendarIDs.length; i++) {
			if (storageData.cal_seen & Math.pow(2, i))
				document.getElementById(calendarIDs[i]).className = "major hw";
		}

		if (storageData.dl_current !== 0) document.getElementById("downloads").classList.add("active");

		let id = reverseString(xorStrings(storageData.uidn_arr[0] + "", storageData.uidn_arr[1]));
		id = "" === id ? "הקלד מספר זהות כאן" : id;
		let gmailEh = storageData.gmail && !chrome.runtime.lastError;
		const printerLinks = document.getElementById("print").getElementsByTagName("a");
		for (let i = 0; i < printerLinks.length; i++) {
			const emailURL = gmailEh
				? "https://mail.google.com/mail/u/0/?view=cm&to=print." + printerLinks[i].id + "@campus.technion.ac.il&su=" + id + "&fs=1&tf=1"
				: "mailto:print." + printerLinks[i].id + "@campus.technion.ac.il?subject=" + id;
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
		const studentsLink = document.getElementById("UGS_Link"), customLink = document.getElementById("custom_link");
		studentsLink.addEventListener("click", async () => {
			let loadingInterval = setInterval(() => {
				studentsLink.textContent = 7 > studentsLink.textContent.length ? studentsLink.textContent + "." : "טוען";
			}, 500);
			let authURL = await fetch("https://students.technion.ac.il/auth/oidc/", {method: "HEAD"})
				.then(response => response.url)
				.catch(_ => "https://students.technion.ac.il/auth/oidc/");
			if (storageData.enable_login && storageData.quick_login && authURL.includes("?")) {
				authURL = authURL.split("?");
				const urlParams = new URLSearchParams(authURL[1]);
				urlParams.delete("prompt");
				urlParams.append("login_hint", storageData.username + "@" + (storageData.server ? "campus." : "") + "technion.ac.il");
				authURL = authURL[0] + "?" + urlParams.toString();
			}
			chrome.tabs.create({url: authURL}, () => {
				clearInterval(loadingInterval);
				studentsLink.textContent = "Students";
			});
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
	});
})();
