'use strict';

import {CommonPopup} from "./common.js";
import {TE_shutBusesAlerts} from "../bg_main.js";

(function () {
	function m(a = ["", "", ""], c) {
		for (var e = f.loadTemplate("busline"), d = e.querySelectorAll(".drow div"), b = 0; 3 > b; b++) d[b].textContent = a[b];
		return c.appendChild(e.querySelector(".drow"))
	}

	function q(a, c, e, d) {
		var b = m([a.Shilut, a.DestinationQuarterName, a.MinutesToArrivalList[c]], e);
		-1 !== d.indexOf(a.Shilut) && 0 == c && b.classList.add("chosen");
		b.addEventListener("click", () => {
			a.MinutesToArrivalList[c] <= parseInt(document.getElementById("min_select").value) ? (b.classList.add("blat"), setTimeout(() =>
				b.classList.remove("blat"), 1E3)) : 0 < c ? (chrome.runtime.sendMessage({
				mess_t: "silent_notification",
				message: "ניתן ליצור התראה רק לאוטובוס הראשון המופיע ברשימה עבור קו ספציפי.\n"
			}), b.classList.add("blat"), setTimeout(() => b.classList.remove("blat"),
				1E3)) : (chrome.runtime.sendMessage({
				mess_t: "bus_alert",
				bus_kav: a.Shilut,
				bus_before: c
			}), b.classList.contains("chosen") ? b.className = "drow" : b.classList.add("chosen"))
		})
	}

	function k(a) { // Old url: https://mslworld.egged.co.il/MslWebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/
		var c = "https://bus.gov.il/WebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/"
			+ document.getElementById("station_select").value + "/he/false";
		c = encodeURI(c);
		chrome.storage.local.get({buses_alerts: []}, e => {
			chrome.runtime.lastError ?
				(console.log("TE_bus_err: " + chrome.runtime.lastError.message),
					g("שגיאה באחזור נתונים מהגדרות הדפדפן, אנא נסה שנית."),
					clearInterval(a)) :
				chrome.runtime.sendMessage({mess_t: "buses", url: c}, d => {
					var b = document.getElementById("bus_table");
					0 == d.length && m(["", "לא נמצאו קווי אוטובוס לתצוגה.", ""], b);
					for (var h = 0; h < d.length; h++) {
						console.log(d[h])
						for (var l = 0; l < d[h].MinutesToArrivalList.length; l++)
							q(d[h], l, b, e.buses_alerts);
					}

					document.getElementById("spinner").style.display = "none"
				})
		})
	}

	function g(a) {
		document.getElementById("additional").style.display = "none";
		document.getElementById("error").style.display = "block";
		document.getElementById("error").textContent = a
	}

	function n() {
		var a;
		switch (document.getElementById("min_select").value) {
			case "10":
				a = 10;
				break;
			case "15":
				a = 15;
				break;
			default:
				a = 5
		}
		var c = parseInt(document.getElementById("station_select").value);
		chrome.storage.local.set({bus_time: a, bus_station: c}, () => {
			chrome.runtime.lastError && console.log("TE_bus_err: " + chrome.runtime.lastError.message)
		})
	}

	function p() {
		for (var a = document.getElementById("bus_table"), c = a.childNodes.length - 1; 3 <= c; c--)
			a.removeChild(a.childNodes[c])
	}

	function r() {
		TE_shutBusesAlerts();
		n();
		p();
		k(0)
	}

	var f = new CommonPopup;
	f.title = "אוטובוסים קרובים - זמן אמת";
	f.css_list = ["buses"];
	f.popupWrap();
	var bus_stops = [{
		name: 'מל"ל/הצפירה',
		val: 43016
	}, {
		name: "טכניון/מעונות נווה אמריקה",
		val: 43280
	}, {
		name: "טכניון/בניין הספורט",
		val: 43015
	}, {
		name: "טכניון/הנדסה אזרחית",
		val: 43022
	}, {
		name: "הנדסה אזרחית",
		val: 42644
	}, {
		name: "טכניון/הנדסה חקלאית",
		val: 43076
	}, {
		name: "טכניון/הנדסה כימית",
		val: 40311
	}, {
		name: "טכניון/ביוטכנולוגיה ומזון",
		val: 43073
	}, {
		name: "טכניון/בית ספר להנדסאים",
		val: 40309
	}, {
		name: "טכניון/הנדסת חומרים",
		val: 41205
	}, {
		name: "טכניון/מרכז המבקרים",
		val: 43078
	}, {
		name: "טכניון/מעונות העמים",
		val: 41200
	}];
	chrome.storage.local.get({bus_station: 41205, bus_time: 10, allow_timings: !1}, a => {
		if (chrome.runtime.lastError) {
			console.log("TE_bus_err: " + chrome.runtime.lastError.message);
			g("שגיאה באחזור נתונים מהגדרות הדפדפן, אנא נסה שנית.");
		} else if (a.allow_timings) {
			document.getElementById("min_select").getElementsByTagName("option")[a.bus_time / 5 - 1].selected = !0;
			document.getElementById("min_select").addEventListener("change", n);
			var c = document.getElementById("station_select");
			bus_stops.forEach(d => {
				var b = document.createElement("option");
				b.value = d.val;
				b.textContent = d.name;
				d.val === a.bus_station && (b.selected = !0);
				c.appendChild(b)
			});
			c.addEventListener("change", r);
			var e = setInterval(() => {
				p();
				k(e)
			}, 3E4);
			k(e)
		} else g('יש לאשר שימוש ב"אוטובוסים קרובים" בהגדרות התוסף.')
	})
})();
