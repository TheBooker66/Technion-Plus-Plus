import { CommonPopup } from "./common_popup.js";
import { TE_updateVideosInfo } from "./service_worker.js";

(async function () {
	function stop_spinning() {
		(document.getElementById("spinner") as HTMLDivElement).style.display =
			"none";
		(
			document.getElementById("small_spinner") as HTMLSpanElement
		).style.display = "none";
	}

	function create_divider(parentContainer: HTMLElement) {
		const div = document.createElement("div");
		div.className = "divider";
		parentContainer.appendChild(div);
	}

	function displayError(message: string) {
		stop_spinning();
		messageElement.textContent = message;
		messageElement.className = "error_bar";
		queryDisplay.style.display = "none";
	}

	async function displayCourseRecordings(courseData: {
		name: string;
		data: RecordingCourse["v"];
	}) {
		stop_spinning();
		messageElement.textContent = "בחר הקלטה לצפייה.";
		queryDisplay.textContent = "קורס: " + courseData.name;
		document.querySelector("h3")!.style.display = "block";
		resultsContainer.textContent = "";
		const courseTypes = ["הרצאה", "תרגול"];
		const template = popup.loadTemplate("courses-list-item");
		for (let i = 0; i < courseData.data.length; i++) {
			const recordingDetails = [],
				listItem = (
					template.cloneNode(true) as HTMLElement
				).querySelector(".list_item") as HTMLAnchorElement;
			listItem.setAttribute(
				"href",
				`https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${courseData.data[i]["l"]}"`,
			);
			listItem.querySelector("span")!.textContent =
				courseData.data[i]["vn"] ?? courseData.name;
			if (courseData.data[i]["t"] > 0)
				recordingDetails.push(courseTypes[courseData.data[i]["t"] - 1]);
			if (courseData.data[i]["b"])
				recordingDetails.push(courseData.data[i]["b"]);
			if (recordingDetails.length > 0)
				listItem.querySelector("small")!.textContent =
					recordingDetails.join(", ");
			(
				listItem.querySelector(".recording_from") as HTMLImageElement
			).src = "../icons/panopto.svg";
			resultsContainer.appendChild(listItem);
			if (courseData.data.length - 1 > i)
				create_divider(resultsContainer);
		}
		const storageData = (await chrome.storage.local.get({
			videos_last: [],
		})) as StorageData;
		const courseNumber = courseData.name.split(" - ")[0];
		const lastSearches = storageData.videos_last.filter(
			(courseNum: string) => courseNum !== courseNumber,
		);
		lastSearches.push(courseNumber);
		if (lastSearches.length > 7)
			lastSearches.splice(0, lastSearches.length - 7);
		await chrome.storage.local.set({ videos_last: lastSearches });
	}

	function displayMultipleCourses(
		matchingCourses: { name: string; data: RecordingCourse["v"] }[],
	) {
		stop_spinning();
		messageElement.textContent = "נמצא יותר מקורס מתאים אחד.";
		document.querySelector("h3")!.style.display = "block";
		const listFragment = document.createElement("div");
		for (let i = 0; i < matchingCourses.length; i++) {
			const courseLink = document.createElement("a");
			courseLink.className = "list_item";
			courseLink.textContent = matchingCourses[i].name;
			courseLink.addEventListener("click", async () => {
				(
					document.getElementById("small_spinner") as HTMLSpanElement
				).style.display = "block";
				await displayCourseRecordings(matchingCourses[i]);
			});
			listFragment.appendChild(courseLink);
			if (i < matchingCourses.length - 1) create_divider(listFragment);
		}
		resultsContainer.appendChild(listFragment);
	}

	function processSearchResults(
		coursesList: StorageData["videos_courses"],
		videosData: StorageData["videos_data"],
		courseQuery: string,
	) {
		if (null == coursesList[0])
			return displayError(
				"חלה שגיאה בניסיון להשיג את רשימת הקורסים, אנא נסה מאוחר יותר.",
			);
		const searchRegex = new RegExp(courseQuery.replace(/ /g, ".*")),
			resultsArray: { name: string; data: RecordingCourse["v"] }[] = [];
		let matchCount = 0;
		for (const course of coursesList) {
			const courseName = course.slice(0, 2).join(" - ");
			if (searchRegex.exec(course.join(" "))) {
				messageElement.textContent = "נמצא קורס כמבוקש!";
				resultsArray[matchCount++] = {
					name: courseName,
					data: videosData[course[0]],
				};
			}
		}

		if (matchCount === 0) {
			return displayError("לא נמצא קורס המתאים לקריטריון המבוקש.");
		} else if (matchCount === 1) {
			displayCourseRecordings(resultsArray[0]);
		} else {
			displayMultipleCourses(resultsArray);
		}
	}

	async function fetchAndUpdateVideos(
		storageData: StorageData,
		courseQuery: string,
	) {
		const callbacks = [
			(
				coursesList: string[][],
				videosData: { [key: string]: RecordingCourse["v"] },
			) => processSearchResults(coursesList, videosData, courseQuery),
			() =>
				processSearchResults(
					storageData.videos_courses as string[][],
					storageData.videos_data as {
						[p: string]: RecordingCourse["v"];
					},
					courseQuery,
				),
		];
		await TE_updateVideosInfo(Date.now(), callbacks);
	}

	const popup = new CommonPopup(
		"חיפוש קורס לצפייה",
		["recordings"],
		document.title,
	);
	(document.getElementById("theform") as HTMLFormElement).addEventListener(
		"submit",
		(event) => {
			if (
				(document.getElementById("course") as HTMLInputElement).value
					.length === 0
			)
				event.preventDefault();
		},
	);
	const queryDisplay = document.getElementById("query") as HTMLDivElement,
		messageElement = document.getElementById("message") as HTMLDivElement,
		resultsContainer = document.getElementById("results") as HTMLDivElement;

	let courseQuery = new URLSearchParams(
		window.location.href.split("?")[1],
	).get("course");
	if (courseQuery) {
		courseQuery = courseQuery
			.replace(/[^a-zA-Z\u05d0-\u05ea0-9\-" ]/g, "")
			.trim();
		messageElement.textContent = "מחפש את הקורס, אנא המתן...";
		if (courseQuery.length === 0)
			displayError("לא ניתן לשלוח בקשה ריקה, נסה שנית.");
		else if (courseQuery.length < 3)
			displayError("קריטריון החיפוש חייב להיות מאורך 3 תווים ומעלה.");
		else {
			queryDisplay.textContent += '"' + courseQuery + '"';
			const storageData = (await chrome.storage.local.get({
				videos_data: {},
				videos_courses: [],
				videos_update: 0,
			})) as StorageData;
			if (
				storageData.videos_update < new Date().getTime() - 6048e5 ||
				chrome.runtime.lastError
			)
				await fetchAndUpdateVideos(storageData, courseQuery as string);
			else
				processSearchResults(
					storageData.videos_courses,
					storageData.videos_data,
					courseQuery as string,
				);
		}
	} else {
		(
			document.getElementById("search_block") as HTMLDivElement
		).style.display = "none";
		(
			document.getElementById("last_searches") as HTMLDivElement
		).style.display = "block";
		(
			document.querySelector(".main-content > h3") as HTMLHeadingElement
		).style.display = "none";
		(document.getElementById("block") as HTMLDivElement).insertBefore(
			document.getElementById("myform") as HTMLFormElement,
			document.getElementById("last_searches"),
		);
		(document.querySelector("#myform input") as HTMLInputElement).focus();
		const storageData = (await chrome.storage.local.get({
			videos_last: [],
			videos_courses: [],
		})) as StorageData;
		const lastSearchesContainer = document.getElementById(
			"last_list",
		) as HTMLDivElement;
		if (storageData.videos_last.length === 0) {
			lastSearchesContainer.textContent = "לא נמצאו חיפושים קודמים...";
			lastSearchesContainer.style.padding = "8px";
			return;
		}

		storageData.videos_last.reverse().forEach((video: string) => {
			const matchingCourse = storageData.videos_courses.filter(
					(item: string[]) => item[0] === video,
				)[0],
				courseLink = document.createElement("a");
			courseLink.className = "list_item";
			courseLink.textContent = matchingCourse.slice(0, 2).join(" - ");
			courseLink.addEventListener("click", () => {
				location.href += "?course=" + matchingCourse[0];
			});
			lastSearchesContainer.appendChild(courseLink);
			create_divider(lastSearchesContainer);
		});
		(
			document.querySelector(".divider:last-of-type") as HTMLDivElement
		).remove();
	}
})();
