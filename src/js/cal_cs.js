'use strict';
import {CommonPopup} from './common_popup.js';
import {CommonCalendar} from './common_calendar.js';
import {reverseString, xorStrings} from './utils.js';

(function () {
	const popup = new CommonPopup(document.title);
	popup.title = "מטלות קרובות - מודל";
	popup.css_list = ["calendar"];
	const calendar = new CommonCalendar(popup, "cs", document.title);
	popup.popupWrap();
	calendar.calendarWrap();

	calendar.progress(_ => new Promise((b, k) => {
		chrome.storage.local.get({
			cs_cal_finished: {},
			cs_cal_seen: {},
			uidn_arr: ["", ""],
			wcpass: "",
			cal_seen: 0
		}, function (a) {
			if (chrome.runtime.lastError) console.error("TE_cs_cal: " + chrome.runtime.lastError.message), k({
				msg: "שגיאה בניסיון לגשת לנתוני הדפדפן, אנא נסה שנית.",
				is_error: true
			}); else {
				let w = reverseString(xorStrings(a.uidn_arr[0] + "", a.uidn_arr[1]));
				"" == w || "" == a.wcpass ? k({
					msg: "לא הגדרת מספר זהות/סיסמת יומן; יש למלא פרטים אלו בהגדרות התוסף.",
					is_error: true
				}) : (w = `https://grades.cs.technion.ac.il/cal/${w}/${encodeURIComponent(a.wcpass)}`,
					popup.XHR(w, "text").then(function (m) {
						const f = m.response.split("BEGIN:VEVENT");
						if (1 == f.length) b({new_list: [], finished_list: []}); else {
							m = Date.now();
							const C = {}, n = {}, p = {
								banned: /Exam|moed| - Late|\u05d4\u05e8\u05e6\u05d0\u05d4|\u05ea\u05e8\u05d2\u05d5\u05dc/,
								uid: /UID:([0-9.a-zA-Z-]+)/,
								summary: /SUMMARY;LANGUAGE=en-US:(.+)/,
								description: /DESCRIPTION;LANGUAGE=en-US:([^,]+)/,
								url: /URL:(.+)/,
								time: /(?<Y>[0-9]{4})(?<M>[0-9]{2})(?<D>[0-9]{2})(T(?<TH>[0-9]{2})(?<TM>[0-9]{2}))?/
							};
							let t = [], x = [], d;
							for (let l = 1; l < f.length; l++) {
								let q = f[l].match(p.summary)[1], g = q.split("(")[0].trim();
								if (p.banned.test(g)) continue;
								let h = f[l].match(p.uid)[1] || q, c = f[l].match(p.time).groups,
									u = new Date(`${c.Y}-${c.M}-${c.D}T${c.TH || 23}:${c.TM || 59}:00+03:00`);
								if (h.includes(".PHW")) {
									if (u > m) {
										let y = h.replace(".PHW", ".HW");
										g = g.replace("פרסום של ", "");
										n.hasOwnProperty(d) && (n[d] = n[d].replace("[[" + g + "]]", ""));
										t = t.filter(z => z.uid != y);
										x = x.filter(z => z.uid != y)
									}
									continue;
								}
								if (u < m || u > m + 2592E6) continue;
								let A = "icspasswordexpires" == h, B = "icspasswordexpires1" == h;
								A && !B &&
								calendar.insertMessage('תוקף סיסמת הגישה ליומן המטלות של מדמ"ח יפוג בשבוע הקרוב, הוראות לחידושה נמצאות בהגדרות התוסף.', false);
								if (A || B) continue;
								A = "יום " + calendar.w_days[u.getDay()] + ", " + c.D + "." + c.M + "." + c.Y;
								B = f[l].match(p.description)[1];
								let G = f[l].match(p.url)[1];
								c = 0;
								a.cs_cal_finished.hasOwnProperty(h) && (c = 1, C[h] = 0);
								d = q.split("(")[1].split(")")[0];
								n.hasOwnProperty(d) || (n[d] = "");
								n[d] += "[[" + g + "]]";
								q = true;
								a.cs_cal_seen.hasOwnProperty(d) && a.cs_cal_seen[d].includes("[[" + g + "]]") && (q = false);
								g = {
									header: g,
									description: B,
									final_date: A,
									is_new: q,
									goToFunc: () => new Promise(y => y(chrome.tabs.create({url: G}))),
									event: h,
									timestamp: u,
									sys: "cs",
									uid: h
								};
								1 == c ? x.push(g) : t.push(g)
							}
							chrome.storage.local.set({
								cs_cal_finished: C,
								cs_cal_seen: n,
								cal_seen: calendar.removeCalendarAlert(a.cal_seen),
								cscal_update: m
							});
							t.sort((l, h) => l.timestamp - h.timestamp);
							b({new_list: t, finished_list: x})
						}
					}).catch(function (m) {
						const f = ['אירעה שגיאה בניסיון לגשת אל שרת הפקולטה למדמ"ח, אנא נסה שנית מאוחר יותר.',
							'השרת של הפקולטה למדמ"ח מסרב לקבל את סיסמת היומן שלך. הוראות לחידוש סיסמת יומן ה-GR++ נמצאות בהגדרות התוסף.'];
						k({msg: 401 == m ? f[1] : f[0], is_error: true})
					}))
			}
		})
	}))
})();
