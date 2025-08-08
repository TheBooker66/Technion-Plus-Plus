'use strict';
import {CommonPopup} from "./common_popup.js";
import {TE_updateVideosInfo} from "../service_worker.js";

(function () {
	const resultsContainer = document.getElementById("results"),
		queryDisplay = document.getElementById("query");

	function stop_spinning() {
		document.getElementById("spinner").style.display = "none";
		document.getElementById("small_spinner").style.display = "none";
	}

	function create_divider(parentContainer) {
		const div = document.createElement("div");
		div.className = "divider";
		parentContainer.appendChild(div);
	}

	function displayCourseRecordings(courseData, messageElement) {
		stop_spinning();
		messageElement.textContent = "בחר הקלטה לצפייה.";
		queryDisplay.textContent = "קורס: " + courseData.name;
		document.getElementsByTagName("h3")[0].style.display = "block";
		resultsContainer.textContent = "";
		messageElement = ["הרצאה", "תרגול"];
		const template = popup.loadTemplate("courses-list-item");
		for (let i = 0; i < courseData.data.length; i++) {
			let recordingDetails = [], panoptoEh = courseData.data[i].p,
				listItem = template.cloneNode(true).querySelector(".list_item");
			listItem.setAttribute("href", panoptoEh ? `https://panoptotech.cloud.panopto.eu/Panopto/Pages/Sessions/List.aspx#folderID="${courseData.data[i].l}"` : `https://video.technion.ac.il/Courses/${courseData.data[i].l}.html`);
			listItem.getElementsByTagName("span")[0].textContent = courseData.data[i]["vn"] ?? courseData.name;
			0 < courseData.data[i].t && recordingDetails.push(messageElement[courseData.data[i].t - 1]);
			courseData.data[i].b && recordingDetails.push(courseData.data[i].b);
			0 < recordingDetails.length && (listItem.getElementsByTagName("small")[0].textContent = recordingDetails.join(", "));
			listItem.querySelector(".recording_from").src = panoptoEh ? "../icons/panopto.ico" : "../icons/videoserver.ico";
			resultsContainer.appendChild(listItem);
			i < courseData.data.length - 1 && create_divider(resultsContainer);
		}
		chrome.storage.local.get({videos_last: []}, stroagedata => {
			const courseNumber = courseData.name.split(" - ")[0];
			const lastSearches = stroagedata.videos_last.filter(courseNum => courseNum !== courseNumber);
			lastSearches.push(courseNumber);
			7 < lastSearches.length && lastSearches.splice(0, lastSearches.length - 7);
			void chrome.storage.local.set({videos_last: lastSearches});
		});
	}

	function displayMultipleCourses(matchingCourses, messageElement) {
		stop_spinning();
		messageElement.textContent = "נמצא יותר מקורס מתאים אחד.";
		document.getElementsByTagName("h3")[0].style.display = "block";
		const listFragment = document.createElement("div");
		for (let i = 0; i < matchingCourses.length; i++) {
			const courseLink = document.createElement("a");
			courseLink.className = "list_item";
			courseLink.textContent = matchingCourses[i].name;
			courseLink.addEventListener("click", () => {
				document.getElementById("small_spinner").style.display = "block";
				displayCourseRecordings(matchingCourses[i], messageElement);
			});
			listFragment.appendChild(courseLink);
			if (i < matchingCourses.length - 1) create_divider(listFragment);
		}
		resultsContainer.appendChild(listFragment);
	}

	function processSearchResults(coursesList, videosData, searchRegex, messageElement) {
		if (null == coursesList[0]) {
			messageElement.textContent = "חלה שגיאה בניסיון להשיג את רשימת הקורסים, אנא נסה מאוחר יותר.";
			messageElement.className = "error_bar";
			stop_spinning();
			return;
		}

		const resultsArray = [];
		let matchCount = 0;
		for (let i = 0; i < coursesList.length; i++) {
			let courseName = coursesList[i].slice(0, 2).join(" - ");
			if (searchRegex.exec(coursesList[i].join(" "))) {
				messageElement.textContent = "נמצא קורס כמבוקש!";
				resultsArray[matchCount++] = {
					name: courseName,
					data: videosData[coursesList[i][0]],
				};
			}
		}
		if (matchCount === 0) {
			messageElement.textContent = "לא נמצא קורס המתאים לקריטריון המבוקש.";
			messageElement.className = "attention";
			stop_spinning();
			return;
		}
		matchCount === 1 ? displayCourseRecordings(resultsArray[0], messageElement) : displayMultipleCourses(resultsArray, messageElement);

	}

	async function fetchAndUpdateVideos(searchRegex, messageElement, storageData) {
		const callbacks = [
			(coursesList, videosData) => processSearchResults(coursesList, videosData, searchRegex, messageElement),
			() => processSearchResults(storageData.videos_courses, storageData.videos_data, searchRegex, messageElement),
		];
		await TE_updateVideosInfo(Date.now(), callbacks);
	}

	const popup = new CommonPopup(!window.location.href.includes("?"));
	popup.title = "חיפוש קורס לצפייה";
	popup.css_list = ["recordings"];
	popup.popupWrap();
	document.getElementById("theform").addEventListener("submit", event => {
		if (document.getElementsByName("course")[0].value.length === 0)
			event.preventDefault();
	});
	const messageElement = document.getElementById("message");
	let courseQuery = (new URLSearchParams(window.location.href.split("?")[1])).get("course");
	if (courseQuery) {
		courseQuery = courseQuery.replace(/[^a-zA-Z\u05d0-\u05ea0-9\-" ]/g, "").trim();
		messageElement.textContent = "מחפש את הקורס, אנא המתן...";
		if (courseQuery.length === 0) {
			messageElement.textContent = "לא ניתן לשלוח בקשה ריקה, נסה שנית.";
			messageElement.className = "error_bar";
			stop_spinning();
			queryDisplay.style.display = "none";
		} else if (3 > courseQuery.length) {
			messageElement.textContent = "קריטריון החיפוש חייב להיות מאורך 3 תווים ומעלה.";
			messageElement.className = "error_bar";
			stop_spinning();
			queryDisplay.style.display = "none";
		} else {
			queryDisplay.textContent += '"' + courseQuery + '"';
			const searchRegex = new RegExp(courseQuery.replace(/ /g, ".*"));
			chrome.storage.local.get({videos_data: {}, videos_courses: [], videos_update: 0}, async storageData => {
				if (storageData.videos_update < (new Date).getTime() - 6048E5 || chrome.runtime.lastError)
					await fetchAndUpdateVideos(searchRegex, messageElement, storageData);
				else
					processSearchResults(storageData.videos_courses, storageData.videos_data, searchRegex, messageElement);
			});
		}
	} else {
		document.getElementById("search_block").style.display = "none";
		document.getElementById("last_searches").style.display = "block";
		document.querySelector(".main-content > h3").style.display = "none";
		document.getElementById("myblock").insertBefore(document.getElementById("myform"), document.getElementById("last_searches"));
		document.querySelector("#myform input").focus();
		chrome.storage.local.get({videos_last: [], videos_courses: []}, storageData => {
			const lastSearchesContainer = document.getElementById("last_list");
			if (storageData.videos_last.length === 0) {
				lastSearchesContainer.textContent = "לא נמצאו חיפושים קודמים...";
				lastSearchesContainer.style.padding = "8px";
				return;
			}

			storageData.videos_last.reverse().forEach(video => {
				const matchingCourse = storageData.videos_courses.filter(item => item[0] === video)[0],
					courseLink = document.createElement("a");
				courseLink.className = "list_item";
				courseLink.textContent = matchingCourse.slice(0, 2).join(" - ");
				courseLink.addEventListener("click", () => {
					location.href += "?course=" + matchingCourse[0];
				});
				lastSearchesContainer.appendChild(courseLink);
				create_divider(lastSearchesContainer);
			});
			document.querySelector(".divider:last-of-type").remove();
		});
	}
})();
