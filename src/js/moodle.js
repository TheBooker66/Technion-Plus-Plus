'use strict';

function main() {
	function create_element(elementType, elementClass, attributes = {}, elementText = "", parent = null, prepend = false) {
		const element = document.createElement(elementType);
		element.textContent = elementText;
		element.className = elementClass;
		for (const attribute in attributes) element.setAttribute(attribute, attributes[attribute]);
		if (parent) prepend ? parent.insertBefore(element, parent.childNodes[0]) : parent.appendChild(element);
		return element;
	}

	function create_download(parent, courseID, isLight, linkText) {
		return create_element("a", isLight ? "maor_download_light" : "maor_download", {
			href: `https://${window.location.hostname}/blocks/material_download/download_materialien.php?courseid=${courseID}"&ccsectid=${isLight}`
		}, linkText, parent, false);
	}

	function create_tp_buttons() {
		const section = create_element("section", "block block_material_download card mb-3 tplus_block", {}, "", document.getElementById("block-region-side-pre"), true);
		const cardBody = create_element("div", "card-body", {}, "", section);
		const cardTitle = create_element("h5", "card-title d-inline", {
			dir: "ltr",
			style: "background-image: url(" + chrome.runtime.getURL("../icons/technion_plus_plus/icon-32.png") + ");"
		}, "Technion", cardBody)
		create_element("sup", "", {}, "++", cardTitle);
		const actionsContainer = create_element("div", "card-text mt-3", {style: "display: grid; text-align: center; grid-row-gap: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(128,128,128,.3);"}, "", cardBody);
		const darkModeContainer = create_element("div", "card-text mt-3 tplus_main_actions", {}, "", cardBody);
		const darkModeSwitchContainer = create_element("div", "custom-control custom-switch", {style: "text-align: right"}, "", darkModeContainer);
		const darkModeCheckbox = create_element("input", "custom-control-input", {
			id: "tp-darkmode",
			type: "checkbox"
		}, "", darkModeSwitchContainer);
		create_element("label", "custom-control-label", {"for": "tp-darkmode"}, "מצב לילה", darkModeSwitchContainer);
		const colorSliderContainer = create_element("div", "", {id: "tp_colorswitcher"}, "", darkModeContainer);
		create_element("div", "", {style: "text-align: right; width: 8rem"}, "צבע משני", colorSliderContainer);
		const colorSlider = create_element("input", "", {
			type: "range",
			min: "0",
			max: "330",
			step: "30"
		}, "", colorSliderContainer);
		chrome.storage.local.get({remoodle: false, remoodle_angle: 120}, storage => {
			darkModeCheckbox.checked = storage.remoodle;
			colorSlider.value = storage.remoodle_angle;
		});
		darkModeCheckbox.addEventListener("change", () => {
			chrome.storage.local.set({remoodle: darkModeCheckbox.checked}, () => {
				chrome.runtime.lastError ? console.warn("TE_popup_remoodle: " + chrome.runtime.lastError.message) :
					chrome.runtime.sendMessage({mess_t: "TE_remoodle"});
			});
		});
		colorSlider.addEventListener("change", () => {
			const m = parseInt(colorSlider.value);
			chrome.storage.local.set({remoodle_angle: m}, () => {
				chrome.runtime.lastError ? console.warn("TE_popup_remoodle: " + chrome.runtime.lastError.message) :
					chrome.runtime.sendMessage({mess_t: "TE_remoodle_reangle", angle: m});
			});
		});
		let colorGradientString = "";
		for (let i = 0; i < 12; i++) {
			colorGradientString += `hsl(${82 + 30 * i}, 100%, 25%) ${100 * i / 12}% ${100 * (i + 1) / 12}%`;
			if (11 > i) colorGradientString += ", ";
		}
		colorSlider.setAttribute("style", "background-image: linear-gradient(to left, " + colorGradientString + ") !important");
		return actionsContainer;
	}

	if (".ac.il/" === window.location.href.split("technion")[1]) {
		if (document.querySelector(".usermenu > .login")) return;
		const courseTiles = document.getElementsByClassName("coursevisible"), userCourses = {},
			courseNameRegex = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/, semesterRegex = / - (?:חורף|אביב|קיץ)/;
		for (let i = 0; i < courseTiles.length; i++) {
			let courseMatch = courseTiles[i].getElementsByTagName("h3")[0]
				.textContent.replace(semesterRegex, "").match(courseNameRegex);
			if (!courseMatch) continue;
			courseMatch = courseMatch.groups;
			userCourses[courseMatch.cnum.trim()] = courseMatch.cname.trim();
		}
		0 < Object.keys(userCourses).length && chrome.storage.local.set({u_courses: userCourses}, () => {
			chrome.runtime.lastError && console.error("TE_moodle_001_" + mess + ": " + chrome.runtime.lastError.message);
		});
		const coursesBySemester = [[], [], []];
		if (0 < courseTiles.length) for (let i = 0; i < courseTiles.length; i++) {
			const downloadButtonContainer = document.createElement("div");
			downloadButtonContainer.style.cssFloat = "left";
			document.getElementsByClassName("tilecontainer")[i].appendChild(downloadButtonContainer);
			let course = courseTiles[i].getElementsByTagName("h3")[0].textContent,
				courseLink = courseTiles[i].getElementsByClassName("coursestyle2url")[0].getAttribute("href");
			course.includes("חורף") ? coursesBySemester[0].push({
				cname: course.replace(" - חורף", ""),
				clink: courseLink
			}) : course.includes("אביב") ? coursesBySemester[1].push({
				cname: course.replace(" - אביב", ""),
				clink: courseLink
			}) : coursesBySemester[2].push({cname: course, clink: courseLink});
			create_download(downloadButtonContainer, courseTiles[i].getElementsByClassName("coursestyle2url")[0].getAttribute("href").split("?id=")[1], 0, "הורדת קבצי הקורס");
		}
		let buttons = create_tp_buttons();
		const parentNode = buttons.parentNode;
		parentNode.removeChild(buttons);
		document.getElementById("coursecontentcollapseid1")
			.insertBefore(parentNode.parentNode, document.getElementById("coursecontentcollapseid1").childNodes[0]);
		parentNode.style.padding = "8px";
		parentNode.querySelector(".tplus_main_actions").appendChild(parentNode.querySelector("h5")).style.flex = "0 0 200px";
		parentNode.querySelector(".tplus_main_actions").classList.remove("mt-3");
	} else {
		const moodle_num = window.location.href.split("?id=")[1],
			course = document.title.match(/(?<cname>.+)\s-\s(?<csemester>.+)\s-\s(?<cnum>[0-9]+)/),
			buttons = create_tp_buttons();
		const course_num = course?.groups.cnum.trim();
		if (course_num) {
			create_download(buttons, moodle_num, 0, "הורדת כל הקבצים בקורס");
			const semester = {
				"חורף": "200",
				"אביב": "100",
				"קיץ": "300",
			}[course.groups.csemester];
			create_element("a", "maor_download", {
				href: `https://portalex.technion.ac.il/ovv/?sap-theme=sap_belize&sap-language=HE&sap-ui-language=HE#/details/2024/${semester}/SM/${course_num}`,
				target: "_blank"
			}, "דף הקורס בסאפ", buttons);
			chrome.storage.local.get({
				videos_data: {},
				videos_courses: []
			}, storage => {
				const short_course_num = course_num.substring(1, 4) + course_num.substring(5, 8);
				let videoID = "";
				for (let i = 0; i < storage.videos_courses.length; i++)
					if (storage.videos_courses[i].join(" ").includes(short_course_num)) {
						videoID = storage.videos_courses[i][0];
						break;
					}
				if (videoID !== "" && storage.videos_data[videoID]) {
					const data = storage.videos_data[videoID];
					for (let j = 0; j < data.length; j++) {
						let isPanopto = data[j].p, text = "";
						text = 1 < data.length ? `וידאו #${j + 1} ` : "וידאו ";
						text = 0 < data[j].t ? ["הרצאה", "תרגול"][data[j].t - 1] : text;
						text += isPanopto ? "(פנופטו)" : "(שרת הוידאו הטכניוני)";
						// noinspection JSUnresolvedReference
						create_element("a", "maor_download", {
							href: isPanopto ? `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${data[j].l}"` : `https://video.technion.ac.il/Courses/${data[j].l}.html`,
							target: "_blank",
							title: data[j]?.vn ?? short_course_num
						}, text, buttons);
					}
				}
			});
		}
		for (const element of document.getElementsByClassName("section main clearfix")) {
			if (element.classList.contains("accesshide") || element.classList.contains("hidden")) continue;
			create_download(
				element.getElementsByClassName("course-section-header")[0],
				moodle_num,
				element.getAttribute("id").split("section-")[1],
				"הורדת כל הקבצים בנושא"
			).style.marginRight = "auto";
		}
	}
}

function colourPage() {
	if (window.location.href.includes("pluginfile.php")) return;
	const themeProperties = hueOffset => [
		["--a_color", "hsl(" + (80 + hueOffset) + ", 90%, 80%)"],
		["--a_hover_color", "hsl(" + (80 + hueOffset) + ", 90%, 45%)"],
		["--a_navlink", "hsl(" + (90 + hueOffset) + ", 80%, 85%)"],
		["--a_hover_navlink", "hsl(" + (90 + hueOffset) + ", 100%, 80%)"],
		["--navbar_bottom", "hsl(" + (82 + hueOffset) + ", 100%, 41%)"],
		["--navbar_bg", "hsl(" + (82 + hueOffset) + ", 100%, 25%)"],
		["--dark_bg", "hsl(" + (90 + hueOffset) + ", 100%, 10%)"],
		["--calendar_today", "hsla(" + (70 + hueOffset) + ", 100%, 20%, 0.5)"]
	];
	chrome.storage.local.get({
		remoodle: false,
		remoodle_angle: 120
	}, storage => {
		if (chrome.runtime.lastError) console.error("TE_remoodle_err: " + chrome.runtime.lastError.message);
		else {
			let darkModeEnabled = storage.remoodle;
			const setDarkMode = bool => {
				bool ? document.querySelector("html").setAttribute("tplus", "dm") :
					document.querySelector("html").removeAttribute("tplus");
				const checkbox = document.getElementById("tp-darkmode");
				if (checkbox) checkbox.checked = bool;
			};
			themeProperties(storage.remoodle_angle)
				.forEach(property => document.documentElement.style.setProperty(property[0], property[1]));
			setDarkMode(darkModeEnabled);
			chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
				if (message.mess_t === "TE_remoodle") {
					setDarkMode(!darkModeEnabled);
					darkModeEnabled = !darkModeEnabled;
				}
				sendResponse();
			});
		}
	});
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.mess_t === "TE_remoodle_reangle") {
			themeProperties(message.angle)
				.forEach(property => document.documentElement.style.setProperty(property [0], property [1]));
			const colorSlider = document.querySelector("#tp_colorswitcher input[type=range]");
			if (colorSlider) colorSlider.value = message.angle;
		}
		sendResponse();
	});
}

colourPage();
window.addEventListener("load", main);
