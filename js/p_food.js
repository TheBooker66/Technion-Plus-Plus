'use strict';

import {CommonPopup} from "./p_common.js";

(function () {
	function oops(m) {
		let element = document.getElementById("info");
		element.className = "error_bar";
		element.style.display = "block";
		element.textContent = m
	}

	let popup = new CommonPopup;
	popup.title = "מסעדות פתוחות בחיפה ובנשר";
	popup.popupWrap(true);
	chrome.storage.local.get({allow_timings: !1}, cookie => {
		if (chrome.runtime.lastError) {
			console.log("TE_food_err: " + chrome.runtime.lastError.message);
			oops("שגיאה באחזור נתונים מהגדרות הדפדפן, אנא נסה שנית.");
			return;
		}
		if (!cookie.allow_timings)
			return void oops('יש לאשר שימוש ב"מסעדות פתוחות בטכניון" בהגדרות התוסף.');

		popup.XHR("../resources/food.csv", "csv").then(res => {
			// Split the string into an array of strings
			const [keys, ...rest] = res.response
				.trim()
				.split("\n")
				.map((item) => item.split('\t'));

			// Map the array of strings into an array of objects
			let restaurants = rest.map((item) => {
				const object = {};
				keys.forEach((key, index) => (object[key] = item.at(index)));
				return object;
			});
			console.log(restaurants);
			restaurants.forEach(item => {
				// Parse the working hours
				delete Object.assign(item, {["working_hours"]: item["working_hours\r"]})["working_hours\r"];
				item['working_hours'] = item['working_hours'].replace('"{', '{').replace('}"', '}');
				console.log(item['working_hours']);
				item['working_hours'] = JSON.parse(item['working_hours']);

				// Parse the phone number (israeli format)
				item['phone'] = item['phone'].replace('+972 ', '0').replace(/-/g, '');
			});

			// Get the current date and time
			let date = new Date, counter = 0;
			const days = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת"];
			date = {day: date.getDay(), hour: date.getHours(), minutes: date.getMinutes(), nt: 0};
			date.hour = date.hour < 10 ? "0" + date.hour : date.hour;
			date.minutes = date.minutes < 10 ? "0" + date.minutes : date.minutes;
			date.nt = date.hour + ":" + date.minutes;

			// Get the template for the list of restaurants and the table to display the list
			let food_table = document.getElementById("food_table"),
				template = popup.loadTemplate("list-item"),
				technion_loc = {latitude: 32.776763, longitude: 35.023121};

			for (let i = 0; i < restaurants.length; i++) {
				// Check which restaurants are open right now by the hour (if a restaurant isn't open, splice it)
				console.log(restaurants[i]);
				if (restaurants[i]['working_hours'][days[date.day]]) {
					let [start, end] = restaurants[i]['working_hours'][days[date.day]].split("-");
					if (date.nt > start && date.nt < end) {
						// Calculate the distance of each restaurant from the Technion (add it to the object)
						restaurants[i]['distance'] =
							Math.sqrt(Math.pow(technion_loc.latitude - restaurants[i].latitude, 2)
								+ Math.pow(technion_loc.longitude - restaurants[i].longitude, 2));
					} else {
						restaurants.splice(i, 1);
						i--;
					}
				} else {
					restaurants.splice(i, 1);
					i--;
				}
			}

			// Sort the restaurants by their distance from the Technion
			restaurants.sort((a, b) => a['distance'] - b['distance']);

			restaurants.forEach(item => {
				// Create the list of restaurants and display it
				let node = template.cloneNode(true);
				let text = node.querySelectorAll(".list_item div")[0];
				text.getElementsByTagName("a")[0].textContent = item['name'];
				text.getElementsByTagName("a")[0].href = item['site'];
				text.getElementsByTagName("span")[0].textContent += `– ${item['full_address']} – ★${item['rating']}`;
				let type_and_hours = node.querySelectorAll(".list_item div")[1];
				type_and_hours.getElementsByTagName("span")[0].textContent =
					`סוג אוכל: ${item['type']}; שעות פתיחה היום: ${item['working_hours'][days[date.day]]}; טלפון: ${item['phone']}`;
				if (counter !== 0) {
					let divider = document.createElement("div");
					divider.className = "divider";
					food_table.appendChild(divider);
				}
				food_table.appendChild(node);
				counter++;
			});

			document.getElementById("info").textContent =
				counter === 0 ? "כל המסעדות בחיפה ונשר סגורות." :
					"הרשימה אינה עדכנית לחגים ושאר מועדים מיוחדים. המסעדות מסודרות לפי מרחק מהטכניון. כל המידע באדיבות גוגל מפות."
		}).catch(e => {
			console.log("TE_Error_FOOD: " + e)
			oops("שגיאה בעיבוד הנתונים, אנא נסה שנית.");
		})
	})
})();
