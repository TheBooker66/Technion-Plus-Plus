import {CommonPopup} from "./common_popup.js";

(async function () {
	function oops(message: string) {
		const element = document.getElementById("info") as HTMLDivElement;
		element.className = "error_bar";
		element.style.display = "block";
		element.textContent = message;
	}

	const popup = new CommonPopup("מסעדות פתוחות בטכניון", [""], document.title);
	const storageData = await chrome.storage.local.get({allow_timings: false});

	if (chrome.runtime.lastError) {
		oops("שגיאה באחזור נתונים מהגדרות הדפדפן.");
		return;
	}
	if (!storageData.allow_timings) {
		oops('יש לאשר שימוש ב"מסעדות פתוחות בטכניון" בהגדרות התוסף.');
		return;
	}

	const restaurants = (await popup.XHR("../resources/food.json", "json")).response;
	const foodTable = document.getElementById("food_table") as HTMLDivElement;
	let counter = 0;

	const currentDate = new Date();
	const currentDayKey = {
		0: "ש'",
		1: "א'-ה'",
		2: "א'-ה'",
		3: "א'-ה'",
		4: "א'-ה'",
		5: "א'-ה'",
		6: "ו'",
	}[currentDate.getDay()]!;
	const currentTime =
		currentDate.getHours().toString().padStart(2, "0") + ":" + currentDate.getMinutes().toString().padStart(2, "0");

	for (const item of restaurants) {
		let openEh = false,
			hoursToday = "";

		if (item.details.substring(0, 1) === "0") {
			openEh = true;
			hoursToday = item.details;
		} else if (item.details.includes(":")) {
			const todaySchedule = item.details.split(", ").find((s: string) => s.startsWith(currentDayKey));
			if (todaySchedule) {
				const times = todaySchedule.match(/\d{2}:\d{2}/g);
				if (times && currentTime >= times[0] && currentTime <= times[1]) {
					openEh = true;
					hoursToday = todaySchedule;
				}
			}
		}

		if (!openEh) continue;

		const node = popup.loadTemplate("list-item").cloneNode(true) as HTMLElement;
		const container = node.querySelector(".list_item") as HTMLElement;
		const titleRow = container.querySelectorAll("div")[0],
			detailsRow = container.querySelectorAll("div")[1];
		titleRow.querySelector("b")!.textContent = item.restaurant_name;
		titleRow.querySelector("span")!.textContent = ` – ${item.location}`;
		detailsRow.querySelector("span")!.textContent = `שעות פעילות: ${hoursToday}`;
		if (counter !== 0) {
			const divider = document.createElement("div");
			divider.className = "divider";
			foodTable.appendChild(divider);
		}
		foodTable.appendChild(node);
		counter++;
	}

	const info = document.getElementById("info") as HTMLDivElement;
	if (counter === 0) info.textContent = "כל המסעדות בבית הסטודנט סגורות כעת.";
	else {
		const b = document.createElement("b");
		b.textContent = "הפתוחים כעת";
		info.appendChild(document.createTextNode("הרשימה מציגה מסעדות ועסקים "));
		info.appendChild(b);
		info.appendChild(
			document.createTextNode(
				" בקמפוס הטכניון. הרשימה אינה עדכנית לחגים ושאר מועדים מיוחדים. " +
					'כל המידע באדיבות המיילים השבועיים של אס"ט. עודכן לאחרונה ב־24.2.26.'
			)
		);
	}
})();
