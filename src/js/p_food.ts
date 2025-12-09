import { CommonPopup } from "./common_popup.js";

(async function () {
	function oops(message: string) {
		const element = document.getElementById("info") as HTMLDivElement;
		element.className = "error_bar";
		element.style.display = "block";
		element.textContent = message;
	}

	const popup = new CommonPopup(
		"מסעדות פתוחות בחיפה ובנשר",
		[""],
		document.title,
	);
	const storageData = await chrome.storage.local.get({
		allow_timings: false,
	});
	if (chrome.runtime.lastError) {
		console.error("TE_food_err: " + chrome.runtime.lastError.message);
		oops("שגיאה באחזור נתונים מהגדרות הדפדפן, אנא נסה שנית.");
		return;
	}
	if (!storageData.allow_timings) {
		oops('יש לאשר שימוש ב"מסעדות פתוחות בטכניון" בהגדרות התוסף.');
		return;
	}

	const foodData = await popup.XHR("../resources/food.csv", "csv");
	// Split the string into an array of strings

	const [keys, ...rest] = foodData.response
		.trim()
		.split("\n")
		.map((item: string) => item.split("\t"));

	// Map the array of strings into an array of objects
	const restaurants: { [key: string]: string | number }[] = rest.map(
		(item: string[]) => {
			const object: { [key: string]: string | number } = {};
			keys.forEach(
				(key: string, index: number) =>
					(object[key] = item.at(index) as string),
			);
			return object;
		},
	);
	restaurants.forEach((item) => {
		// Parse the working hours
		delete Object.assign(item, {
			["working_hours"]: item["working_hours\r"],
		})["working_hours\r"];
		item["working_hours"] = (item["working_hours"] as string)
			.replace('"{', "{")
			.replace('}"', "}");
		item["working_hours"] = JSON.parse(item["working_hours"]);

		// Parse the phone number (Israeli format)
		item["phone"] = (item["phone"] as string)
			.replace("+972 ", "0")
			.replace(/-/g, "");
	});

	// Get the current date and time
	const currentDate = new Date();
	const days = [
		"יום ראשון",
		"יום שני",
		"יום שלישי",
		"יום רביעי",
		"יום חמישי",
		"יום שישי",
		"יום שבת",
	];
	const date = {
		day: currentDate.getDay().toString(),
		hour: currentDate.getHours().toString(),
		minutes: currentDate.getMinutes().toString(),
		time: "",
	};
	date.hour = parseInt(date.hour) < 10 ? "0" + date.hour : date.hour;
	date.minutes =
		parseInt(date.minutes) < 10 ? "0" + date.minutes : date.minutes;
	date.time = date.hour + ":" + date.minutes;

	// Get the template for the list of restaurants and the table to display the list
	const foodTable = document.getElementById("food_table") as HTMLDivElement,
		technionLoc = { latitude: 32.776763, longitude: 35.023121 };

	for (let i = 0; i < restaurants.length; i++) {
		// Check which restaurants are open right now by the hour (if a restaurant isn't open, splice it)
		if (!restaurants[i]["working_hours"][days[date.day]]) {
			restaurants.splice(i, 1);
			i--;
			continue;
		}

		let [start, end] =
			restaurants[i]["working_hours"][days[date.day]].split("-");
		if (start === "סגור" || end === "סגור") {
			restaurants.splice(i, 1);
			i--;
			continue;
		} else if (start === "פתוח 24 שעות" || end === "פתוח 24 שעות") {
			continue;
		}

		// Added leading zero to the hours (if needed)
		start = start.split(":")[0].length === 1 ? "0" + start : start;
		end = end.split(":")[0].length === 1 ? "0" + end : end;
		if (end > date.time && date.time > start) {
			// Calculate the distance of each restaurant from the Technion (add it to the object)
			restaurants[i].distance = Math.sqrt(
				Math.pow(
					technionLoc.latitude -
						parseFloat(restaurants[i].latitude as string),
					2,
				) +
					Math.pow(
						technionLoc.longitude -
							parseFloat(restaurants[i].longitude as string),
						2,
					),
			);
		} else {
			restaurants.splice(i, 1);
			i--;
		}
	}

	// Sort the restaurants by their distance from the Technion
	restaurants.sort((a, b) => (a.distance as number) - (b.distance as number));

	let counter = 0;
	restaurants.forEach((item) => {
		// Create the list of restaurants and display it
		const node = popup
			.loadTemplate("list-item")
			.cloneNode(true) as HTMLElement;
		const text = node.querySelectorAll(".list_item div")[0];
		text.querySelector("a")!.textContent = item["name"] as string;
		text.querySelector("a")!.href = item["site"] as string;
		text.querySelector("span")!.textContent +=
			`– ${item["full_address"]} – ★${item["rating"]}`;
		const type_and_hours = node.querySelectorAll(".list_item div")[1];
		type_and_hours.querySelector("span")!.textContent =
			`סוג אוכל: ${item["type"]}; שעות פתיחה היום: ${item["working_hours"][days[date.day]]}; טלפון: ${item["phone"]}`;
		if (counter !== 0) {
			const divider = document.createElement("div");
			divider.className = "divider";
			foodTable.appendChild(divider);
		}
		foodTable.appendChild(node);
		counter++;
	});

	(document.getElementById("info") as HTMLDivElement).textContent =
		counter === 0
			? "כל המסעדות בחיפה ונשר סגורות."
			: "הרשימה אינה עדכנית לחגים ושאר מועדים מיוחדים. המסעדות מסודרות לפי מרחק מהטכניון. כל המידע באדיבות גוגל מפות.";
})();
