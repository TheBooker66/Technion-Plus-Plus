import {CommonPopup} from "./common_popup.js";
import {TE_shutBusesAlerts, TE_toggleBusAlert} from "./service_worker.js";

(async function () {
	const common_DOM = {
		busTable: document.getElementById("bus_table") as HTMLDivElement,
		minSelect: document.getElementById("min_select") as HTMLSelectElement,
		stationSelect: document.getElementById("station_select") as HTMLSelectElement,
		spinner: document.getElementById("spinner") as HTMLDivElement,
	};

	let currentState: StorageData;

	function createBusLineElement(lineDetails: (string | number)[]) {
		const busLineTemplate = popup.loadTemplate("bus_line");
		const detailElements = busLineTemplate.querySelectorAll(".drow div");
		for (let i = 0; i < 3; i++) detailElements[i].textContent = lineDetails[i].toString();
		return busLineTemplate.querySelector(".drow") as Node;
	}

	function setupBusLineClickEvent(element: HTMLDivElement, busData: BusLine, arrivalTimeIndex: number) {
		if (currentState.bus_alerts.includes(busData.Shilut) && arrivalTimeIndex === 0) element.classList.add("chosen");

		element.addEventListener("click", async () => {
			if (busData.MinutesToArrivalList[arrivalTimeIndex] <= parseInt(common_DOM.minSelect.value)) {
				element.classList.add("blat");
				setTimeout(() => element.classList.remove("blat"), 1E3);
			} else {
				if (arrivalTimeIndex > 0) {
					await chrome.runtime.sendMessage({
						mess_t: "silent_notification",
						message: "ניתן ליצור התראה רק לאוטובוס הראשון המופיע ברשימה עבור קו ספציפי בכיוון ספציפי.\n",
					});
					element.classList.add("blat");
					setTimeout(() => element.classList.remove("blat"), 1E3);
				} else {
					await TE_toggleBusAlert(busData.Shilut);
					element.classList.toggle("chosen");
				}
			}
		});
	}

	function displayError(msg: string) {
		const additional = document.getElementById("additional") as HTMLDivElement,
			error = document.getElementById("error") as HTMLDivElement;
		additional.style.display = "none";
		error.style.display = "block";
		error.textContent = msg;
	}

	async function fetchBusData(intervalID: number) {
		const url = `https://bus.gov.il/WebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/${common_DOM.stationSelect.value}/he/false`;

		try {
			const res = await fetch(encodeURI(url));
			const apiResponse: BusLine[] = await res.json();

			const fragment = document.createDocumentFragment();
			const allArrivals: { bus: BusLine, index: number, time: number }[] = [];

			for (const bus of apiResponse) {
				if (!bus.MinutesToArrivalList) continue;
				for (let j = 0; j < bus.MinutesToArrivalList.length; j++) {
					allArrivals.push({bus, index: j, time: bus.MinutesToArrivalList[j]});
				}
			}

			allArrivals.sort((a, b) => a.time - b.time);

			if (allArrivals.length === 0) {
				fragment.appendChild(createBusLineElement(["", "לא נמצאו קווי אוטובוס לתצוגה.", ""]));
			} else {
				for (const arrival of allArrivals) {
					const el = createBusLineElement([arrival.bus.Shilut, arrival.bus.DestinationQuarterName, arrival.time]) as HTMLDivElement;
					setupBusLineClickEvent(el, arrival.bus, arrival.index);
					fragment.appendChild(el);
				}
			}

			common_DOM.busTable.appendChild(fragment);
		} catch (err) {
			console.error("TE_bus_err: " + err);
			displayError("שגיאה באחזור נתונים, אנא נסה שנית.");
			clearInterval(intervalID);
		}

		common_DOM.spinner.style.display = "none";
	}

	async function saveSettings() {
		const alertTime = parseInt(common_DOM.minSelect.value) || 5;
		const stationID = parseInt(common_DOM.stationSelect.value);

		await chrome.storage.local.set({bus_time: alertTime, bus_station: stationID});
		currentState.bus_time = alertTime;
		currentState.bus_station = stationID;

		if (chrome.runtime.lastError) console.error("TE_bus_err: " + chrome.runtime.lastError.message);
	}

	function clearBusTable() {
		while (common_DOM.busTable.childNodes.length > 3) {
			common_DOM.busTable.removeChild(common_DOM.busTable.lastChild!);
		}
	}

	async function refreshBusTable() {
		await TE_shutBusesAlerts();
		await saveSettings();
		clearBusTable();
		common_DOM.spinner.style.display = "block";
		await fetchBusData(0);
	}

	const popup = new CommonPopup("אוטובוסים קרובים - זמן אמת", ["buses"], document.title);

	try {
		currentState = await chrome.storage.local.get({
			bus_station: 41205, bus_time: 10, allow_timings: false, bus_alerts: [],
		}) as StorageData;
	} catch (err) {
		console.error("TE_bus_err: " + err);
		displayError("שגיאה באחזור נתונים מהגדרות הדפדפן, אנא נסה שנית.");
		return;
	}

	if (!currentState.allow_timings) {
		displayError('יש לאשר שימוש ב"אוטובוסים קרובים" בהגדרות התוסף.');
		return;
	}

	common_DOM.minSelect.value = currentState.bus_time.toString();
	common_DOM.minSelect.addEventListener("change", saveSettings);

	const busStops = [
		{name: 'מל"ל/הצפירה', val: 43016}, {name: "טכניון/מעונות נווה אמריקה", val: 43280},
		{name: "טכניון/בניין הספורט", val: 43015}, {name: "טכניון/הנדסה אזרחית", val: 43022},
		{name: "הנדסה אזרחית", val: 42644}, {name: "טכניון/הנדסה חקלאית", val: 43076},
		{name: "טכניון/הנדסה כימית", val: 40311}, {name: "טכניון/ביוטכנולוגיה ומזון", val: 43073},
		{name: "טכניון/בית ספר להנדסאים", val: 40309}, {name: "טכניון/הנדסת חומרים", val: 41205},
		{name: "טכניון/מרכז המבקרים", val: 43078}, {name: "טכניון/מעונות העמים", val: 41200},
	];

	const fragment = document.createDocumentFragment();
	busStops.forEach(stopData => {
		const option = document.createElement("option");
		option.value = stopData.val.toString();
		option.textContent = stopData.name;
		if (stopData.val === currentState.bus_station) option.selected = true;
		fragment.appendChild(option);
	});
	common_DOM.stationSelect.appendChild(fragment);
	common_DOM.stationSelect.addEventListener("change", refreshBusTable);

	const intervalID = setInterval(async () => {
		clearBusTable();
		await fetchBusData(intervalID);
	}, 3E4);

	await fetchBusData(intervalID);
})();
