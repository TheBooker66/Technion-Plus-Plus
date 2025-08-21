import {CommonPopup} from "./common_popup.js";
import {TE_shutBusesAlerts} from "../service_worker.js";
import type {BusLine} from "./utils.js";

(function () {
	function createBusLineElement(lineDetails = ["", "", 0], parentContainer: HTMLDivElement) {
		const busLineTemplate = popup.loadTemplate("bus_line");
		const detailElements = busLineTemplate.querySelectorAll(".drow div");
		for (let i = 0; 3 > i; i++) detailElements[i].textContent = lineDetails[i].toString();
		return parentContainer.appendChild(busLineTemplate.querySelector(".drow") as Node);
	}

	function setupBusLineClickEvent(busData: BusLine, arrivalTimeIndex: number, alertList: string[], parentContainer: HTMLDivElement) {
		const element = createBusLineElement([busData["Shilut"], busData["DestinationQuarterName"], busData["MinutesToArrivalList"][arrivalTimeIndex]], parentContainer) as HTMLDivElement;
		if (alertList.indexOf(busData["Shilut"]) !== -1 && arrivalTimeIndex === 0) element.classList.add("chosen");
		element.addEventListener("click", () => {
			if (busData["MinutesToArrivalList"][arrivalTimeIndex] <= parseInt((document.getElementById("min_select") as HTMLInputElement)?.value)) {
				element.classList.add("blat");
				setTimeout(() => element.classList.remove("blat"), 1E3);
			} else {
				if (arrivalTimeIndex > 0) {
					void chrome.runtime.sendMessage({
						mess_t: "silent_notification",
						message: "ניתן ליצור התראה רק לאוטובוס הראשון המופיע ברשימה עבור קו ספציפי בכיוון ספציפי.\n",
					});
					element.classList.add("blat");
					setTimeout(() => element.classList.remove("blat"), 1E3);
				} else {
					void chrome.runtime.sendMessage({
						mess_t: "bus_alert",
						bus_kav: busData["Shilut"],
					});
					element.classList.contains("chosen") ? element.className = "drow" : element.classList.add("chosen");
				}
			}
		});
	}

	function displayError(msg: string) {
		(document.getElementById("additional") as HTMLDivElement).style.display = "none";
		(document.getElementById("error") as HTMLDivElement).style.display = "block";
		(document.getElementById("error") as HTMLDivElement).textContent = msg;
	}

	function fetchBusData(intervalID: number) {
		const url = encodeURI("https://bus.gov.il/WebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/"
			+ (document.getElementById("station_select") as HTMLSelectElement).value + "/he/false");
		chrome.storage.local.get({buses_alerts: []}, storageData => {
			if (chrome.runtime.lastError) {
				console.error("TE_bus_err: " + chrome.runtime.lastError.message);
				displayError("שגיאה באחזור נתונים מהגדרות הדפדפן, אנא נסה שנית.");
				clearInterval(intervalID);
				return;
			}

			chrome.runtime.sendMessage({mess_t: "buses", url: url}, (apiResponse: BusLine[]) => {
				const busTable = document.getElementById("bus_table") as HTMLDivElement;
				if (apiResponse.length === 0)
					createBusLineElement(["", "לא נמצאו קווי אוטובוס לתצוגה.", ""], busTable);
				let count = 0;
				for (let i = 0; i < apiResponse.length; i++) {
					if (apiResponse[i]["MinutesToArrivalList"] === null)
						continue;
					for (let j = 0; j < apiResponse[i]["MinutesToArrivalList"].length; j++) {
						setupBusLineClickEvent(apiResponse[i], j, storageData.buses_alerts, busTable);
						count++;
					}
				}
				if (count === 0) createBusLineElement(["", "לא נמצאו קווי אוטובוס לתצוגה.", ""], busTable);
				(document.getElementById("spinner") as HTMLDivElement).style.display = "none";
			});
		});
	}

	function saveSettings() {
		let alertTime;
		switch ((document.getElementById("min_select") as HTMLSelectElement).value) {
			case "10":
				alertTime = 10;
				break;
			case "15":
				alertTime = 15;
				break;
			default:
				alertTime = 5;
		}
		const stationID = parseInt((document.getElementById("station_select") as HTMLSelectElement).value);
		chrome.storage.local.set({bus_time: alertTime, bus_station: stationID}, () => {
			if (chrome.runtime.lastError)
				console.error("TE_bus_err: " + chrome.runtime.lastError.message);
		});
	}

	function clearBusTable() {
		const busTable = document.getElementById("bus_table") as HTMLDivElement;
		for (let i = busTable.childNodes.length - 1; 3 <= i; i--)
			busTable.removeChild(busTable.childNodes[i]);
	}

	function refreshBusTable() {
		TE_shutBusesAlerts();
		saveSettings();
		clearBusTable();
		fetchBusData(0);
	}

	const popup = new CommonPopup("אוטובוסים קרובים - זמן אמת", ["buses"], document.title);
	const bus_stops = [
		{
			name: 'מל"ל/הצפירה',
			val: 43016,
		}, {
			name: "טכניון/מעונות נווה אמריקה",
			val: 43280,
		}, {
			name: "טכניון/בניין הספורט",
			val: 43015,
		}, {
			name: "טכניון/הנדסה אזרחית",
			val: 43022,
		}, {
			name: "הנדסה אזרחית",
			val: 42644,
		}, {
			name: "טכניון/הנדסה חקלאית",
			val: 43076,
		}, {
			name: "טכניון/הנדסה כימית",
			val: 40311,
		}, {
			name: "טכניון/ביוטכנולוגיה ומזון",
			val: 43073,
		}, {
			name: "טכניון/בית ספר להנדסאים",
			val: 40309,
		}, {
			name: "טכניון/הנדסת חומרים",
			val: 41205,
		}, {
			name: "טכניון/מרכז המבקרים",
			val: 43078,
		}, {
			name: "טכניון/מעונות העמים",
			val: 41200,
		},
	];
	chrome.storage.local.get({bus_station: 41205, bus_time: 10, allow_timings: false}, storageData => {
		if (chrome.runtime.lastError) {
			console.error("TE_bus_err: " + chrome.runtime.lastError.message);
			displayError("שגיאה באחזור נתונים מהגדרות הדפדפן, אנא נסה שנית.");
			return;
		}
		if (!storageData.allow_timings) {
			displayError('יש לאשר שימוש ב"אוטובוסים קרובים" בהגדרות התוסף.');
			return;
		}

		const timeSelector = document.getElementById("min_select") as HTMLSelectElement;
		timeSelector.querySelectorAll("option")[storageData.bus_time / 5 - 1].selected = true;
		timeSelector.addEventListener("change", saveSettings);

		const stationSelectElement = document.getElementById("station_select") as HTMLSelectElement;
		bus_stops.forEach(stopData => {
			const optionElement = document.createElement("option") as HTMLOptionElement;
			optionElement.value = stopData.val.toString();
			optionElement.textContent = stopData.name;
			stopData.val === storageData.bus_station && (optionElement.selected = true);
			stationSelectElement.appendChild(optionElement);
		});
		stationSelectElement.addEventListener("change", refreshBusTable);
		const intervalID = setInterval(() => {
			clearBusTable();
			fetchBusData(intervalID);
		}, 3E4);
		fetchBusData(intervalID);
	});
})();
