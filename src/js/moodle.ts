(async function () {
	async function main() {
		function create_element(
			elementType: string,
			parent: HTMLElement,
			classes: string,
			attributes: {[p: string]: string} = {},
			text: string = "",
			prepend: boolean = false
		) {
			const element = document.createElement(elementType);
			if (classes) element.className = classes;
			for (const attribute in attributes) element.setAttribute(attribute, attributes[attribute]);
			if (text) element.textContent = text;
			if (parent) {
				if (prepend) parent.prepend(element);
				else parent.append(element);
			}
			return element;
		}

		function create_download(parent: HTMLElement, courseID: number, isLight: number, linkText: string) {
			return create_element(
				"a",
				parent,
				isLight ? "tplus_download_light" : "tplus_download",
				{
					href: `https://${window.location.hostname}/blocks/material_download/download_materialien.php?courseid=${courseID}&ccsectid=${isLight}`,
				},
				linkText
			);
		}

		async function create_tp_buttons() {
			const container = create_element(
				"section",
				document.getElementById("block-region-side-pre")!,
				"block block_material_download card mb-3 tplus_block",
				{},
				"",
				true
			) as HTMLElement;
			const cardBody = create_element("div", container, "card-body") as HTMLDivElement;

			const cardTitle = create_element(
				"h5",
				cardBody,
				"card-title d-inline",
				{
					dir: "ltr",
					style: `background-image: url(${chrome.runtime.getURL("../icons/technion_plus_plus/logo.svg")});`,
				},
				"Technion"
			) as HTMLHeadingElement;
			create_element("sup", cardTitle, "", {}, "++");
			const main = create_element("div", cardBody, "card-text mt-3", {
				style: "display: grid; text-align: center; grid-row-gap: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgb(128,128,128,.3);",
			}) as HTMLDivElement;
			const isMainPage = window.location.href.endsWith(".ac.il/");

			const actionsContainer = create_element(
				"div",
				cardBody,
				`card-text mt-3 tplus_main_actions${isMainPage ? "" : " tplus_course_actions"}`
			) as HTMLDivElement;
			const darkModeContainer = create_element("div", actionsContainer, "custom-control custom-switch", {
				id: "tp_darkMode_switch",
				style: "text-align: right",
			}) as HTMLDivElement;
			const darkModeCheckbox = create_element("input", darkModeContainer, "custom-control-input", {
				id: "tp_darkMode_input",
				type: "checkbox",
			}) as HTMLInputElement;
			create_element(
				"label",
				darkModeContainer,
				"custom-control-label",
				{
					id: "tp_darkMode_label",
					for: "tp_darkMode_input",
				},
				"מצב לילה"
			);
			const colourSliderContainer = create_element("div", actionsContainer, "", {
				id: "tp_colour_switcher",
			}) as HTMLDivElement;
			const customColourSwitch = create_element(
				"div",
				isMainPage ? colourSliderContainer : actionsContainer,
				"custom-control custom-switch",
				{
					id: "tp_custom_colour_switch",
				}
			) as HTMLDivElement;
			if (!isMainPage) actionsContainer.insertBefore(customColourSwitch, colourSliderContainer);
			const customColourCheckbox = create_element("input", customColourSwitch, "custom-control-input", {
				id: "tp_custom_colour_enabled",
				type: "checkbox",
			}) as HTMLInputElement;
			create_element(
				"label",
				customColourSwitch,
				"custom-control-label tplus_moodle_colour_label",
				{
					id: "tp_custom_colour_label",
					for: "tp_custom_colour_enabled",
				},
				"צבעי המודל"
			);
			if (isMainPage)
				create_element("span", colourSliderContainer, "tplus_colour_separator", {"aria-hidden": "true"});
			const colourSlider = create_element("input", colourSliderContainer, "", {
				id: "tp_colour_slider",
				type: "range",
				min: "0",
				max: "330",
				step: "30",
				"aria-label": "צבע משני",
			}) as HTMLInputElement;
			const customColour = create_element("input", colourSliderContainer, "", {
				id: "tp_custom_colour_input",
				type: "color",
				title: "צבע מותאם אישית",
			}) as HTMLInputElement;

			const storageData: StorageData = await chrome.storage.local.get({
				moodle_dark_mode: false,
				moodle_colour_angle: 120,
				moodle_custom_colour: "#86c232",
				moodle_colour_source: "default",
			});
			darkModeCheckbox.checked = storageData.moodle_dark_mode;
			colourSlider.value = storageData.moodle_colour_angle.toString();
			customColourCheckbox.checked = storageData.moodle_colour_source !== "default";
			customColour.value = storageData.moodle_custom_colour;
			let selectedColourSource = storageData.moodle_colour_source;
			darkModeCheckbox.addEventListener("change", async () => {
				await chrome.storage.local.set({moodle_dark_mode: darkModeCheckbox.checked});
				await chrome.runtime.sendMessage({mess_t: "TE_moodle_darkMode"});
			});
			colourSlider.addEventListener("change", async () => {
				const newAngle = parseInt(colourSlider.value);
				await chrome.storage.local.set({moodle_colour_angle: newAngle});
				if (customColourCheckbox.checked) {
					selectedColourSource = "preset";
					await chrome.storage.local.set({moodle_colour_source: "preset"});
				}
				await chrome.runtime.sendMessage({
					mess_t: "TE_moodle_preset_colour",
					angle: newAngle,
					source: customColourCheckbox.checked ? "preset" : "default",
				});
			});
			customColourCheckbox.addEventListener("change", async () => {
				selectedColourSource = customColourCheckbox.checked ? "preset" : "default";
				await chrome.storage.local.set({moodle_colour_source: selectedColourSource});
				await chrome.runtime.sendMessage({
					mess_t: "TE_moodle_custom_colour",
					colour: customColour.value,
					source: selectedColourSource,
				});
			});
			customColour.addEventListener("input", async () => {
				await chrome.storage.local.set({moodle_custom_colour: customColour.value});
				if (customColourCheckbox.checked) {
					selectedColourSource = "picker";
					await chrome.storage.local.set({moodle_colour_source: "picker"});
					await chrome.runtime.sendMessage({
						mess_t: "TE_moodle_custom_colour",
						colour: customColour.value,
						source: "picker",
					});
				}
			});
			let colorGradientString = "";
			for (let gradientStep = 0; gradientStep < 12; gradientStep++) {
				colorGradientString += `hsl(${82 + 30 * gradientStep}, 100%, 25%) ${(100 * gradientStep) / 12}% ${(100 * (gradientStep + 1)) / 12}%`;
				if (11 > gradientStep) colorGradientString += ", ";
			}
			colourSlider.style.backgroundImage = `linear-gradient(to left, ${colorGradientString}) !important`;
			return main;
		}

		if (window.location.href.split("?")[0].endsWith(".pdf")) {
			// PDF files
			return;
		} else if (window.location.href.endsWith(".ac.il/")) {
			// Moodle main page
			if (document.querySelector(".usermenu > .login")) return;

			const buttons = await create_tp_buttons();
			const parentNode = buttons.parentNode as HTMLHeadingElement,
				container = document.getElementById("coursecontentcollapseid15") as HTMLElement;
			parentNode.removeChild(buttons);
			container.prepend(parentNode.parentNode as Node);
			parentNode.style.padding = "8px";
			(
				parentNode
					.querySelector(".tplus_main_actions")!
					.appendChild(parentNode.querySelector("h5") as Node) as HTMLElement
			).style.flex = "0 0 200px";
			parentNode.querySelector(".tplus_main_actions")?.classList.remove("mt-3");

			const userCourses: {[key: string]: string} = {},
				courseNameRegex = /(?<cname>.+)\s-\s(?<cnum>[0-9]+)/,
				semesterRegex = / - (?:חורף|אביב|קיץ)/;

			const courses = document.querySelectorAll(".tilecontainer") as NodeListOf<HTMLDivElement>;

			for (const course of courses) {
				const nameElement = course.querySelector("figcaption h3") as HTMLHeadingElement;
				const nameMatch = nameElement.textContent.replace(semesterRegex, "").match(courseNameRegex);

				if (!nameMatch?.groups) continue;
				userCourses[nameMatch.groups.cnum.trim()] = nameMatch.groups.cname.trim();

				const downloadButtonContainer = document.createElement("div");
				nameElement.parentElement!.prepend(downloadButtonContainer);
				const courseMoodleID = parseInt(course.getAttribute("onClick")!.split("?id=")[1]);
				const downloadElement = create_download(downloadButtonContainer, courseMoodleID, 0, "");
				downloadElement.style.backgroundImage = `url(${chrome.runtime.getURL("../icons/download.svg")})`;
			}
			if (Object.keys(userCourses).length > 0) await chrome.storage.local.set({moodle_cal_courses: userCourses});
		} else {
			const moodleNum = Array.from(document.body.classList)
					.find((cls) => cls.startsWith("course-"))!
					.split("-")[1],
				course = document.title.match(/(?<cname>.+)\s-\s(?<csemester>.+)\s-\s(?<cnum>[0-9]+)/),
				buttons = await create_tp_buttons();

			const course_num = course?.groups!.cnum.trim();
			if (course_num) {
				create_download(buttons, parseInt(moodleNum), 0, "הורדת כל הקבצים בקורס");
				const semester =
					{"חורף": "200", "אביב": "201", "קיץ": "202"}[course?.groups?.csemester as string] ?? "200";
				create_element(
					"a",
					buttons,
					"tplus_download",
					{
						href: `https://portalex.technion.ac.il/ovv/?sap-theme=sap_belize&sap-language=HE&sap-ui-language=HE#/details/2026/${semester}/SM/${course_num}`,
						target: "_blank",
					},
					"דף הקורס בסאפ"
				);
				const storageData: StorageData = await chrome.storage.local.get({videos_data: {}, videos_courses: []});
				const short_course_num = course_num.substring(1, 4) + course_num.substring(5, 8);
				const match = storageData.videos_courses.find((item) => item.join(" ").includes(short_course_num));
				const videoID = match?.[0];
				if (videoID && storageData.videos_data[videoID]) {
					const data = storageData.videos_data[videoID];
					for (let i = 0; i < data.length; i++) {
						let text: string;
						text = 1 < data.length ? `וידאו #${i + 1} ` : "וידאו ";
						text = 0 < data[i]["t"] ? ["הרצאה", "תרגול"][data[i]["t"] - 1] : text;
						text += "(פנופטו)";
						create_element(
							"a",
							buttons,
							"tplus_download",
							{
								href: `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${data[i]["l"]}"`,
								target: "_blank",
								title: data[i]?.["vn"] ?? short_course_num,
							},
							text
						);
					}
				}
			}
			for (const element of document.querySelectorAll(".section.main.clearfix")) {
				if (element.classList.contains("accesshide") || element.classList.contains("hidden")) continue;
				create_download(
					element.querySelector(".course-section-header") as HTMLElement,
					parseInt(moodleNum),
					parseInt(element.getAttribute("id")!.split("section-")[1]),
					"הורדת כל הקבצים בנושא"
				).style.marginRight = "auto";
			}

			document.addEventListener(
				"click",
				(event: PointerEvent) => {
					const target = event.target as HTMLElement;
					if (!target) return;

					const link = target.closest("a") as HTMLAnchorElement;
					if (!link) return;

					if (!link.href.includes("forcedownload=1")) return;

					event.preventDefault();
					event.stopImmediatePropagation();
					window.open(link.href.replace(/\??forcedownload=1/g, ""), "_blank");
				},
				true
			);
		}
	}

	async function colourPage() {
		if (window.location.href.includes("pluginfile.php")) return;
		const themeProperties = (hueOffset: number, darkMode: boolean) =>
			darkMode
				? [
						["--a_color", `hsl(${80 + hueOffset}, 90%, 80%)`],
						["--a_hover_color", `hsl(${80 + hueOffset}, 90%, 45%)`],
						["--a_navlink", `hsl(${90 + hueOffset}, 80%, 85%)`],
						["--a_hover_navlink", `hsl(${90 + hueOffset}, 100%, 80%)`],
						["--navbar_bottom", `hsl(${82 + hueOffset}, 100%, 41%)`],
						["--navbar_bg", `hsl(${82 + hueOffset}, 100%, 25%)`],
						["--dark_bg", `hsl(${90 + hueOffset}, 100%, 10%)`],
						["--calendar_today", `hsla(${70 + hueOffset}, 100%, 20%, 0.5)`],
						["--navbar_text", "#fff"],
					]
				: [
						["--a_color", `hsl(${80 + hueOffset}, 75%, 28%)`],
						["--a_hover_color", `hsl(${80 + hueOffset}, 75%, 20%)`],
						["--a_navlink", `hsl(${90 + hueOffset}, 60%, 25%)`],
						["--a_hover_navlink", `hsl(${90 + hueOffset}, 70%, 18%)`],
						["--navbar_bottom", `hsl(${82 + hueOffset}, 70%, 58%)`],
						["--navbar_bg", `hsl(${82 + hueOffset}, 65%, 82%)`],
						["--dark_bg", `hsl(${90 + hueOffset}, 55%, 16%)`],
						["--calendar_today", `hsla(${70 + hueOffset}, 70%, 55%, 0.22)`],
						["--navbar_text", "#16253d"],
					];
		const customColourHue = (color: string) => {
			const red = parseInt(color.slice(1, 3), 16) / 255,
				green = parseInt(color.slice(3, 5), 16) / 255,
				blue = parseInt(color.slice(5, 7), 16) / 255,
				max = Math.max(red, green, blue),
				min = Math.min(red, green, blue),
				delta = max - min;
			if (!delta) return 0;
			const hue =
				max === red
					? ((green - blue) / delta) % 6
					: max === green
						? (blue - red) / delta + 2
						: (red - green) / delta + 4;
			return Math.round(hue * 60 + (hue < 0 ? 360 : 0)) - 80;
		};
		const storageData: StorageData = await chrome.storage.local.get({
			moodle_dark_mode: false,
			moodle_colour_angle: 120,
			moodle_custom_colour: "#86c232",
			moodle_colour_source: "default",
			theme: "light",
		});

		let darkModeEnabled = storageData.moodle_dark_mode;
		let customColourSource = storageData.moodle_colour_source;
		const theme = storageData.theme;
		const setColours = (angle: number, source: StorageData["moodle_colour_source"], color: string) => {
			const entirePage = document.documentElement;
			if (source === "default") {
				entirePage.removeAttribute("tplus-colours");
				themeProperties(angle, darkModeEnabled).forEach((property) =>
					entirePage.style.removeProperty(property[0])
				);
				return;
			}
			if (source === "picker" && !/^#[\da-f]{6}$/i.test(color)) {
				console.error("Ignoring invalid Moodle picker colour:", color);
				return;
			}
			const hue = source === "picker" ? customColourHue(color) : angle;
			entirePage.setAttribute("tplus-colours", source);
			themeProperties(hue, darkModeEnabled).forEach((property) =>
				entirePage.style.setProperty(property[0], property[1], "important")
			);
		};
		const setDarkMode = (darkModeEh: boolean, theme: StorageData["theme"]) => {
			const shouldEnableDarkMode =
				darkModeEh && (theme !== "auto" || window.matchMedia("(prefers-color-scheme: dark)").matches);
			if (shouldEnableDarkMode) document.documentElement.setAttribute("tplus-darkMode", "");
			else document.documentElement.removeAttribute("tplus-darkMode");
			const checkbox = document.getElementById("tp_darkMode_input") as HTMLInputElement;
			if (checkbox) checkbox.checked = darkModeEh;
		};
		setColours(storageData.moodle_colour_angle, customColourSource, storageData.moodle_custom_colour);
		setDarkMode(darkModeEnabled, theme);
		chrome.runtime.onMessage.addListener((message) => {
			switch (message.mess_t) {
				case "TE_moodle_darkMode":
					darkModeEnabled = !darkModeEnabled;
					setDarkMode(darkModeEnabled, theme);
					setColours(storageData.moodle_colour_angle, customColourSource, storageData.moodle_custom_colour);
					break;
				case "TE_moodle_preset_colour":
					storageData.moodle_colour_angle = message.angle;
					if (message.source) customColourSource = message.source;
					setColours(message.angle, customColourSource, storageData.moodle_custom_colour);
					const colorSlider = document.querySelector(
						"#tp_colour_switcher input[type=range]"
					) as HTMLInputElement;
					if (colorSlider) colorSlider.value = message.angle;
					break;
				case "TE_moodle_custom_colour":
					storageData.moodle_custom_colour = message.colour;
					customColourSource = message.source;
					setColours(storageData.moodle_colour_angle, customColourSource, storageData.moodle_custom_colour);
					break;
			}
		});
	}

	await colourPage();
	window.addEventListener("load", main);
})();
