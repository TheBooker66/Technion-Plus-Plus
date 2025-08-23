(function () {
	function main() {
		function create_element(elementType: string, elementClass: string, attributes: {
			[key: string]: string
		} = {}, elementText: string = "", parent: HTMLElement | null = null, prepend: boolean = false) {
			const element = document.createElement(elementType);
			element.textContent = elementText;
			element.className = elementClass;
			for (const attribute in attributes) element.setAttribute(attribute, attributes[attribute]);
			if (parent) prepend ? parent.insertBefore(element, parent.childNodes[0]) : parent.appendChild(element);
			return element;
		}

		function create_download(parent: HTMLElement, courseID: number, isLight: number, linkText: string) {
			return create_element("a", isLight ? "maor_download_light" : "maor_download", {
				href: `https://${window.location.hostname}/blocks/material_download/download_materialien.php?courseid=${courseID}"&ccsectid=${isLight}`,
			}, linkText, parent, false);
		}

		function create_tp_buttons() {
			const section = create_element("section", "block block_material_download card mb-3 tplus_block", {}, "", document.getElementById("block-region-side-pre"), true) as HTMLElement;
			const cardBody = create_element("div", "card-body", {}, "", section) as HTMLDivElement;
			const cardTitle = create_element("h5", "card-title d-inline", {
				dir: "ltr",
				style: "background-image: url(" + chrome.runtime.getURL("../icons/technion_plus_plus/logo.svg") + ");",
			}, "Technion", cardBody) as HTMLHeadingElement;
			create_element("sup", "", {}, "++", cardTitle);
			const actionsContainer = create_element("div", "card-text mt-3", {style: "display: grid; text-align: center; grid-row-gap: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgb(128,128,128,.3);"}, "", cardBody) as HTMLDivElement;
			const darkModeContainer = create_element("div", "card-text mt-3 tplus_main_actions", {}, "", cardBody) as HTMLDivElement;
			const darkModeSwitchContainer = create_element("div", "custom-control custom-switch", {style: "text-align: right"}, "", darkModeContainer) as HTMLDivElement;
			const darkModeCheckbox = create_element("input", "custom-control-input", {
				id: "tp-darkmode",
				type: "checkbox",
			}, "", darkModeSwitchContainer) as HTMLInputElement;
			create_element("label", "custom-control-label", {"for": "tp-darkmode"}, "מצב לילה", darkModeSwitchContainer);
			const colorSliderContainer = create_element("div", "", {id: "tp_colorswitcher"}, "", darkModeContainer) as HTMLDivElement;
			create_element("div", "", {style: "text-align: right; width: 8rem"}, "צבע משני", colorSliderContainer);
			const colorSlider = create_element("input", "", {
				type: "range",
				min: "0",
				max: "330",
				step: "30",
			}, "", colorSliderContainer) as HTMLInputElement;
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
				const newAngle = parseInt(colorSlider.value.toString());
				chrome.storage.local.set({remoodle_angle: newAngle}, () => {
					chrome.runtime.lastError ? console.warn("TE_popup_remoodle: " + chrome.runtime.lastError.message) :
						chrome.runtime.sendMessage({mess_t: "TE_remoodle_reangle", angle: newAngle});
				});
			});
			let colorGradientString = "";
			for (let gradientStep = 0; gradientStep < 12; gradientStep++) {
				colorGradientString += `hsl(${82 + 30 * gradientStep}, 100%, 25%) ${100 * gradientStep / 12}% ${100 * (gradientStep + 1) / 12}%`;
				if (11 > gradientStep) colorGradientString += ", ";
			}
			colorSlider.style.backgroundImage = "linear-gradient(to left, " + colorGradientString + ") !important";
			return actionsContainer;
		}

		if (".ac.il/" === window.location.href.split("technion")[1]) { // Moodle main page
			if (document.querySelector(".usermenu > .login")) return;
			const courseTiles = document.querySelectorAll(".coursevisible"),
				userCourses: { [key: string]: string } = {},
				courseNameRegex = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/, semesterRegex = / - (?:חורף|אביב|קיץ)/;
			for (const courseTile of courseTiles) {
				let courseMatch = courseTile.querySelector("h3")
					?.textContent.replace(semesterRegex, "").match(courseNameRegex);
				if (!courseMatch?.groups) continue;
				userCourses[courseMatch.groups.cnum.trim()] = courseMatch.groups.cname.trim();
			}
			if (Object.keys(userCourses).length > 0)
				chrome.storage.local.set({u_courses: userCourses}, () => {
					if (chrome.runtime.lastError)
						console.error("TE_moodle_001_: " + chrome.runtime.lastError.message);
				});

			const coursesBySemester: [{ cname: string, clink: string }[], { cname: string, clink: string }[],
				{ cname: string, clink: string }[]] = [[], [], []];
			if (0 < courseTiles.length) for (let i = 0; i < courseTiles.length; i++) {
				const downloadButtonContainer = document.createElement("div");
				downloadButtonContainer.style.cssFloat = "left";
				document.querySelectorAll(".tilecontainer")[i].appendChild(downloadButtonContainer);
				let course = courseTiles[i].querySelector("h3")!.textContent,
					courseLink = courseTiles[i].querySelector(".coursestyle2url")!.getAttribute("href") as string;
				course.includes("חורף") ? coursesBySemester[0].push({
					cname: course.replace(" - חורף", ""),
					clink: courseLink,
				}) : course.includes("אביב") ? coursesBySemester[1].push({
					cname: course.replace(" - אביב", ""),
					clink: courseLink,
				}) : coursesBySemester[2].push({cname: course, clink: courseLink});
				create_download(downloadButtonContainer, parseInt(courseTiles[i].querySelector(".coursestyle2url")!.getAttribute("href")!.split("?id=")[1]), 0, "הורדת קבצי הקורס");
			}
			let buttons = create_tp_buttons();
			const parentNode = buttons.parentNode as HTMLHeadingElement;
			parentNode.removeChild(buttons);
			document.getElementById("coursecontentcollapseid1")
				?.insertBefore(parentNode.parentNode as Node, document.getElementById("coursecontentcollapseid1")!.childNodes[0]);
			parentNode.style.padding = "8px";
			(parentNode.querySelector(".tplus_main_actions")!.appendChild(parentNode.querySelector("h5") as Node) as HTMLElement).style.flex = "0 0 200px";
			parentNode.querySelector(".tplus_main_actions")?.classList.remove("mt-3");
		} else {
			const moodleNum = window.location.href.split("?id=")[1],
				course = document.title.match(/(?<cname>.+)\s-\s(?<csemester>.+)\s-\s(?<cnum>[0-9]+)/),
				buttons = create_tp_buttons();
			const course_num = course?.groups!.cnum.trim();
			if (course_num) {
				create_download(buttons, parseInt(moodleNum), 0, "הורדת כל הקבצים בקורס");
				const semester = {
					"חורף": "200",
					"אביב": "201",
					"קיץ": "202",
				}[course?.groups?.csemester as string] ?? "200";
				create_element("a", "maor_download", {
					href: `https://portalex.technion.ac.il/ovv/?sap-theme=sap_belize&sap-language=HE&sap-ui-language=HE#/details/2024/${semester}/SM/${course_num}`,
					target: "_blank",
				}, "דף הקורס בסאפ", buttons);
				chrome.storage.local.get({
					videos_data: {},
					videos_courses: [],
				}, (storage: {
					videos_courses: string[][],
					videos_data: { [key: string]: RecordingCourse["v"] }
				}) => {
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
							let isPanopto = data[j]["p"], text = "";
							text = 1 < data.length ? `וידאו #${j + 1} ` : "וידאו ";
							text = 0 < data[j]["t"] ? ["הרצאה", "תרגול"][data[j]["t"] - 1] : text;
							text += isPanopto ? "(פנופטו)" : "(שרת הוידאו הטכניוני)";
							create_element("a", "maor_download", {
								href: isPanopto ? `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${data[j]["l"]}"` : `https://video.technion.ac.il/Courses/${data[j]["l"]}.html`,
								target: "_blank",
								title: data[j]?.["vn"] ?? short_course_num,
							}, text, buttons);
						}
					}
				});
			}
			for (const element of document.querySelectorAll(".section.main.clearfix")) {
				if (element.classList.contains("accesshide") || element.classList.contains("hidden")) continue;
				create_download(
					element.querySelector(".course-section-header") as HTMLElement,
					parseInt(moodleNum),
					parseInt(element.getAttribute("id")!.split("section-")[1]),
					"הורדת כל הקבצים בנושא",
				).style.marginRight = "auto";
			}

			document.addEventListener('click', (event: PointerEvent) => {
				const target = event.target as HTMLElement;
				if (!target) return;

				const link = target.closest('a');
				if (!link) return;
				if (!link.href.includes("forcedownload=1")) return;
				let url = link.href.replace(/\??forcedownload=1/g, "");

				event.preventDefault();
				event.stopImmediatePropagation();

				window.open(url, '_blank');
			}, true);

		}
	}

	function colourPage() {
		if (window.location.href.includes("pluginfile.php")) return;
		const themeProperties = (hueOffset: number) => [
			["--a_color", "hsl(" + (80 + hueOffset) + ", 90%, 80%)"],
			["--a_hover_color", "hsl(" + (80 + hueOffset) + ", 90%, 45%)"],
			["--a_navlink", "hsl(" + (90 + hueOffset) + ", 80%, 85%)"],
			["--a_hover_navlink", "hsl(" + (90 + hueOffset) + ", 100%, 80%)"],
			["--navbar_bottom", "hsl(" + (82 + hueOffset) + ", 100%, 41%)"],
			["--navbar_bg", "hsl(" + (82 + hueOffset) + ", 100%, 25%)"],
			["--dark_bg", "hsl(" + (90 + hueOffset) + ", 100%, 10%)"],
			["--calendar_today", "hsla(" + (70 + hueOffset) + ", 100%, 20%, 0.5)"],
		];
		chrome.storage.local.get({
			remoodle: false,
			remoodle_angle: 120,
		}, storage => {
			if (chrome.runtime.lastError) console.error("TE_remoodle_err: " + chrome.runtime.lastError.message);
			else {
				let darkModeEnabled = storage.remoodle;
				const setDarkMode = (darkmodeEh: boolean) => {
					const entirePage = document.querySelector("html") as HTMLHtmlElement;
					darkmodeEh ? entirePage.setAttribute("tplus", "dm") : entirePage.removeAttribute("tplus");
					const checkbox = document.getElementById("tp-darkmode") as HTMLInputElement;
					if (checkbox) checkbox.checked = darkmodeEh;
				};
				themeProperties(storage.remoodle_angle)
					.forEach(property => document.documentElement.style.setProperty(property[0], property[1]));
				setDarkMode(darkModeEnabled);
				chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
					if (message.mess_t === "TE_remoodle") {
						setDarkMode(!darkModeEnabled);
						darkModeEnabled = !darkModeEnabled;
					}
					sendResponse();
				});
			}
		});
		chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
			if (message.mess_t === "TE_remoodle_reangle") {
				themeProperties(message.angle)
					.forEach(property => document.documentElement.style.setProperty(property [0], property [1]));
				const colorSlider = document.querySelector("#tp_colorswitcher input[type=range]") as HTMLInputElement;
				if (colorSlider) colorSlider.value = message.angle;
			}
			sendResponse();
		});
	}

	colourPage();
	window.addEventListener("load", main);
})();