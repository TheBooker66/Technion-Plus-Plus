'use strict';
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
				message: "\u05e0\u05d9\u05ea\u05df \u05dc\u05d9\u05e6\u05d5\u05e8 \u05d4\u05ea\u05e8\u05d0\u05d4 \u05e8\u05e7 \u05dc\u05d0\u05d5\u05d8\u05d5\u05d1\u05d5\u05e1 \u05d4\u05e8\u05d0\u05e9\u05d5\u05df \u05d4\u05de\u05d5\u05e4\u05d9\u05e2 \u05d1\u05e8\u05e9\u05d9\u05de\u05d4 \u05e2\u05d1\u05d5\u05e8 \u05e7\u05d5 \u05e1\u05e4\u05e6\u05d9\u05e4\u05d9.\n"
			}), b.classList.add("blat"), setTimeout(() => b.classList.remove("blat"),
				1E3)) : (chrome.runtime.sendMessage({
				mess_t: "bus_alert",
				bus_kav: a.Shilut,
				bus_before: c
			}), b.classList.contains("chosen") ? b.className = "drow" : b.classList.add("chosen"))
		})
	}

	function k(a) {
		var c = "https://mslworld.egged.co.il/MslWebApi/api/passengerinfo/GetRealtimeBusLineListByBustop/" + document.getElementById("station_select").value + "/he/false";
		chrome.storage.local.get({buses_alerts: []}, e => {
			chrome.runtime.lastError ? (console.log("TE_bus_err: " + chrome.runtime.lastError.message), g("\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d0\u05d7\u05d6\u05d5\u05e8 \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05de\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05d3\u05e4\u05d3\u05e4\u05df, \u05d0\u05e0\u05d0 \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea."),
				clearInterval(a)) : f.XHR(c, "json").then(function (d) {
				var b = document.getElementById("bus_table");
				d = d.response;
				for (var h = 0; h < d.length; h++) for (var l = 0; l < d[h].MinutesToArrivalList.length; l++) q(d[h], l, b, e.buses_alerts);
				0 == d.length && m(["", "\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05e7\u05d5\u05d5\u05d9 \u05d0\u05d5\u05d8\u05d5\u05d1\u05d5\u05e1 \u05dc\u05ea\u05e6\u05d5\u05d2\u05d4.", ""], b);
				document.getElementById("spinner").style.display = "none"
			}).catch(function () {
				g("\u05e0\u05d9\u05e1\u05d9\u05d5\u05df \u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05dc\u05e9\u05e8\u05ea \u05e0\u05db\u05e9\u05dc, \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea \u05de\u05d0\u05d5\u05d7\u05e8 \u05d9\u05d5\u05ea\u05e8.");
				clearInterval(a)
			})
		})
	}

	function g(a) {
		document.getElementById("additional").style.display = "none";
		document.getElementById("error").style.display = "block";
		document.getElementById("error").textContent = a
	}

	function n() {
		switch (document.getElementById("min_select").value) {
			case "10":
				var a = 10;
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
		for (var a = document.getElementById("bus_table"), c = a.childNodes.length - 1; 3 <= c; c--) a.removeChild(a.childNodes[c])
	}

	function r() {
		chrome.runtime.getBackgroundPage(a => a.TE_shutdownBusesAlerts());
		n();
		p();
		k(0)
	}

	var f = new CommonPopup;
	f.title = "\u05d0\u05d5\u05d8\u05d5\u05d1\u05d5\u05e1\u05d9\u05dd \u05e7\u05e8\u05d5\u05d1\u05d9\u05dd - \u05d6\u05de\u05df \u05d0\u05de\u05ea";
	f.css_list = ["bus_check"];
	f.popupWrap();
	var t = [{
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d1\u05e0\u05d9\u05d9\u05df \u05d4\u05e1\u05e4\u05d5\u05e8\u05d8",
		val: 43015
	}, {
		name: '\u05de\u05dc"\u05dc/\u05d4\u05e6\u05e4\u05d9\u05e8\u05d4',
		val: 43016
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d4\u05e0\u05d3\u05e1\u05d4 \u05d0\u05d6\u05e8\u05d7\u05d9\u05ea",
		val: 43022
	}, {
		name: "\u05d4\u05e0\u05d3\u05e1\u05d4 \u05d0\u05d6\u05e8\u05d7\u05d9\u05ea",
		val: 42644
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05de\u05e2\u05d5\u05e0\u05d5\u05ea \u05d4\u05e2\u05de\u05d9\u05dd",
		val: 41200
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05de\u05e2\u05d5\u05e0\u05d5\u05ea \u05d4\u05e1\u05d8\u05d5\u05d3\u05e0\u05d8\u05d9\u05dd",
		val: 42643
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05de\u05e8\u05db\u05d6 \u05d4\u05de\u05d1\u05e7\u05e8\u05d9\u05dd",
		val: 43078
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d1\u05e0\u05d9\u05d9\u05df \u05d4\u05e0\u05d3\u05e1\u05ea \u05d7\u05d5\u05de\u05e8\u05d9\u05dd",
		val: 42986
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d4\u05e0\u05d3\u05e1\u05ea \u05d7\u05d5\u05de\u05e8\u05d9\u05dd",
		val: 41205
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d1\u05d9\u05ea \u05e1\u05e4\u05e8 \u05dc\u05d4\u05e0\u05d3\u05e1\u05d0\u05d9\u05dd",
		val: 40309
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d1\u05d9\u05d5\u05d8\u05db\u05e0\u05d5\u05dc\u05d5\u05d2\u05d9\u05d4 \u05d5\u05de\u05d6\u05d5\u05df",
		val: 43073
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d4\u05e0\u05d3\u05e1\u05d4 \u05db\u05d9\u05de\u05d9\u05ea",
		val: 40311
	}, {
		name: "\u05d8\u05db\u05e0\u05d9\u05d5\u05df/\u05d4\u05e0\u05d3\u05e1\u05d4 \u05d7\u05e7\u05dc\u05d0\u05d9\u05ea",
		val: 43076
	}];
	chrome.storage.local.get({bus_station: 43015, bus_time: 10, allow_timings: !1}, a => {
		if (chrome.runtime.lastError) console.log("TE_bus_err: " +
			chrome.runtime.lastError.message), g("\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d0\u05d7\u05d6\u05d5\u05e8 \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05de\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05d3\u05e4\u05d3\u05e4\u05df, \u05d0\u05e0\u05d0 \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea."); else if (a.allow_timings) {
			document.getElementById("min_select").getElementsByTagName("option")[a.bus_time / 5 - 1].selected = !0;
			document.getElementById("min_select").addEventListener("change", n);
			var c = document.getElementById("station_select");
			t.forEach(d => {
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
		} else g('\u05d9\u05e9 \u05dc\u05d0\u05e9\u05e8 \u05e9\u05d9\u05de\u05d5\u05e9 \u05d1"\u05d0\u05d5\u05d8\u05d5\u05d1\u05d5\u05e1\u05d9\u05dd \u05e7\u05e8\u05d5\u05d1\u05d9\u05dd" \u05d1\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05ea\u05d5\u05e1\u05e3.')
	})
})();