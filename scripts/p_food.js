'use strict';
(function () {
	function p(m) {
		var e = document.getElementById("info");
		e.className = "error_bar";
		e.style.display = "block";
		e.textContent = m
	}

	var k = new CommonPopup;
	k.title = "\u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u05e4\u05ea\u05d5\u05d7\u05d5\u05ea \u05d1\u05d8\u05db\u05e0\u05d9\u05d5\u05df";
	k.popupWrap();
	chrome.storage.local.get({allow_timings: !1}, m => {
		chrome.runtime.lastError ? (console.log("TE_food_err: " + chrome.runtime.lastError.message), p("\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d0\u05d7\u05d6\u05d5\u05e8 \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05de\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05d3\u05e4\u05d3\u05e4\u05df, \u05d0\u05e0\u05d0 \u05e0\u05e1\u05d4 \u05e9\u05e0\u05d9\u05ea.")) :
			m.allow_timings ? k.XHR("../food.json", "json").then(e => {
				e = e.response;
				var f = new Date;
				f = {day: f.getDay(), hour: f.getHours(), minutes: f.getMinutes(), nt: 0};
				f.nt = 100 * f.hour + f.minutes;
				var q = document.getElementById("food_table"), n = 0, r = k.loadTemplate("list-item");
				for (let h = 0; h < e.length - 1; h++) {
					var c = e[h];
					var a = f;
					var d = 0;
					a.nt = 5 > a.hour ? 2400 + 100 * a.hour + a.minutes : a.nt;
					0 > a.day - 5 && c.ns <= a.nt && c.ne > a.nt && (d = 1);
					c.hasOwnProperty("hamishi") && 4 == a.day && (d = c.hamishi < a.nt ? 0 : 1);
					5 == a.day && 0 < c.wd && (c.shi_s <= a.nt && c.shi_e > a.nt &&
					99 != c.shi_e && (d = 1), c.shi_s <= a.nt && 1900 > a.nt && 99 == c.shi_e && (d = 2));
					if (6 == a.day && 2 == c.wd) {
						if (c.sha_s <= a.nt && c.sha_e > a.nt && 99 != c.sha_s || c.shi_e > a.nt && 5 > a.hour) d = 1;
						1630 < a.nt && 99 == c.sha_s && 5 < a.hour && (d = 3)
					}
					a = d;
					if (0 != a) {
						c = r.cloneNode(!0);
						d = c.querySelectorAll(".list_item div");
						d[0].getElementsByTagName("b")[0].textContent = e[h].name;
						d[0].getElementsByTagName("span")[0].textContent += e[h].location;
						3 == a && (d[1].textContent = "\u05e4\u05ea\u05d5\u05d7 \u05de\u05d7\u05e6\u05d9 \u05e9\u05e2\u05d4 \u05dc\u05d0\u05d7\u05e8 \u05e6\u05d0\u05ea \u05d4\u05e9\u05d1\u05ea");
						a = d[2];
						d = a.textContent;
						var g = e[h], l = f, b = 0;
						0 > l.day - 5 && (b = g.ne);
						4 == l.day && g.hasOwnProperty("hamishi") && (b = g.hamishi);
						5 == l.day && 0 < g.wd && (b = g.shi_e);
						6 == l.day && 2 == g.wd && (b = g.sha_e);
						2400 < b && (b -= 2400);
						99 == b ? b = "\u05e9\u05e2\u05d4 \u05d5\u05d7\u05e6\u05d9 \u05dc\u05e4\u05e0\u05d9 \u05e9\u05d1\u05ea" : 0 == b ? b = " -- " : (b = b.toString(), b = 3 == b.length ? "0" + b : b, b = b[0] + b[1] + ":" + b[2] + b[3]);
						a.textContent = d + b;
						0 < n && (a = document.createElement("div"), a.className = "divider", q.appendChild(a));
						q.appendChild(c);
						n++
					}
				}
				document.getElementById("info").textContent =
					0 == n ? "\u05db\u05dc \u05d4\u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u05d1\u05d8\u05db\u05e0\u05d9\u05d5\u05df \u05e1\u05d2\u05d5\u05e8\u05d5\u05ea." : "\u05d4\u05e8\u05e9\u05d9\u05de\u05d4 \u05d0\u05d9\u05e0\u05d4 \u05e2\u05d3\u05db\u05e0\u05d9\u05ea \u05dc\u05d7\u05d2\u05d9\u05dd \u05d5\u05e9\u05d0\u05e8 \u05de\u05d5\u05e2\u05d3\u05d9\u05dd \u05de\u05d9\u05d5\u05d7\u05d3\u05d9\u05dd."
			}).catch(e => console.log("TE_Error_FOOD: " + e)) : p('\u05d9\u05e9 \u05dc\u05d0\u05e9\u05e8 \u05e9\u05d9\u05de\u05d5\u05e9 \u05d1"\u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u05e4\u05ea\u05d5\u05d7\u05d5\u05ea \u05d1\u05d8\u05db\u05e0\u05d9\u05d5\u05df" \u05d1\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05ea\u05d5\u05e1\u05e3.')
	})
})();
