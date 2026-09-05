import {CommonPopup} from "./common_popup.js";
import {calculateBuses} from "./utils.js";
import {TE_shutBusesAlerts, TE_toggleBusAlert} from "./service_worker.js";

const commonDOM = {
	busTable: document.getElementById("bus_table") as HTMLDivElement,
	minSelect: document.getElementById("min_select") as HTMLSelectElement,
	stationSelect: document.getElementById("station_select") as HTMLSelectElement,
	spinner: document.getElementById("spinner") as HTMLDivElement,
};

function createBusLineElement(lineDetails: (string | number)[]) {
	const busLineTemplate = popup.loadTemplate("bus_line");
	const detailElements = busLineTemplate.querySelectorAll(".drow div");
	for (let i = 0; i < 3; i++) detailElements[i].textContent = lineDetails[i].toString();
	return busLineTemplate.querySelector(".drow") as Node;
}

function setupBusLineClickEvent(element: HTMLDivElement, arrival: BusArrival, busAlerts: StorageData["bus_alerts"]) {
	if (busAlerts.includes(arrival.lineNumber) && arrival.firstEh) element.classList.add("chosen");

	element.addEventListener("click", async () => {
		if (arrival.timeInMinutes <= parseInt(commonDOM.minSelect.value)) {
			element.classList.add("blat");
			setTimeout(() => element.classList.remove("blat"), 1e3);
		} else {
			if (!arrival.firstEh) {
				await chrome.runtime.sendMessage({
					mess_t: "silent_notification",
					message: "ניתן ליצור התראה רק לאוטובוס הראשון המופיע ברשימה עבור קו ספציפי בכיוון ספציפי.\n",
				});
				element.classList.add("blat");
				setTimeout(() => element.classList.remove("blat"), 1e3);
			} else {
				await TE_toggleBusAlert(arrival.lineNumber);
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

async function fetchBusData(intervalID: number, busAlerts: StorageData["bus_alerts"]) {
	try {
		const buses = await calculateBuses(parseInt(commonDOM.stationSelect.value));
		const fragment = document.createDocumentFragment();
		if (buses.length === 0) fragment.append(createBusLineElement(["", "לא נמצאו קווי אוטובוס לתצוגה.", ""]));
		else
			for (const bus of buses) {
				const element = createBusLineElement([
					bus.lineNumber,
					bus.destination,
					bus.timeInMinutes,
				]) as HTMLDivElement;
				setupBusLineClickEvent(element, bus, busAlerts);
				fragment.append(element);
			}

		commonDOM.busTable.append(fragment);
	} catch (err) {
		console.error("TPP: failed to retrieve bus data", err);
		displayError("שגיאה באחזור נתונים, אנא נסה שנית.");
		clearInterval(intervalID);
	}

	commonDOM.spinner.style.display = "none";
}

async function saveSettings() {
	const alertTime = parseInt(commonDOM.minSelect.value) || 5,
		stationID = parseInt(commonDOM.stationSelect.value);

	await chrome.storage.local.set({bus_time: alertTime, bus_station: stationID});
}

function clearBusTable() {
	while (commonDOM.busTable.childNodes.length > 3) {
		commonDOM.busTable.removeChild(commonDOM.busTable.lastChild!);
	}
}

async function refreshBusTable(busAlerts: StorageData["bus_alerts"]) {
	await TE_shutBusesAlerts();
	await saveSettings();
	clearBusTable();
	commonDOM.spinner.style.display = "block";
	await fetchBusData(0, busAlerts);
}

async function main() {
	const storageData: StorageData = await chrome.storage.local.get({
		bus_station: 41205,
		bus_time: 10,
		bus_alerts: [],
	});
	commonDOM.minSelect.value = storageData.bus_time.toString();
	commonDOM.minSelect.addEventListener("change", saveSettings);
	const busStops = [
		{name: 'מל"ל/הצפירה', val: 43016},
		{name: "טכניון/מעונות נווה אמריקה", val: 43280},
		{name: "טכניון/בניין הספורט", val: 43015},
		{name: "טכניון/הנדסה אזרחית", val: 43022},
		{name: "טכניון/הנדסה חקלאית", val: 43076},
		{name: "טכניון/הנדסה כימית", val: 40311},
		{name: "טכניון/ביוטכנולוגיה ומזון", val: 43073},
		{name: "טכניון/בית ספר להנדסאים", val: 40309},
		{name: "טכניון/הנדסת חומרים", val: 41205},
		{name: "טכניון/מרכז המבקרים", val: 43078},
		{name: "טכניון/מעונות העמים", val: 41200},
	];
	const fragment = document.createDocumentFragment();
	busStops.forEach((stopData) => {
		const option = document.createElement("option");
		option.value = stopData.val.toString();
		option.textContent = stopData.name;
		if (stopData.val === storageData.bus_station) option.selected = true;
		fragment.append(option);
	});
	commonDOM.stationSelect.append(fragment);
	commonDOM.stationSelect.addEventListener("change", () => refreshBusTable(storageData.bus_alerts));
	const intervalID = setInterval(async () => {
		clearBusTable();
		await fetchBusData(intervalID, storageData.bus_alerts);
	}, 3e4);
	await fetchBusData(intervalID, storageData.bus_alerts);
}

const popup = new CommonPopup("אוטובוסים קרובים - זמן אמת", ["buses"], document.title);
const storageData: StorageData = await chrome.storage.local.get({allow_timings: false});
if (storageData.allow_timings) await main();
else displayError('יש לאשר שימוש ב"אוטובוסים קרובים" בהגדרות התוסף.');
