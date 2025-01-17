'use strict';

(function () {
	function O(a, b, f = {}, d = "", c = null, g = false) {
		a = document.createElement(a);
		a.textContent = d;
		b && (a.className = b);
		for (const k in f) a.setAttribute(k, f[k]);
		if (null != c) g ? c.insertBefore(a, c.childNodes[0]) : c.appendChild(a);
		return a;
	}

	function H(a = "#inlist") {
		let b = 0, f = 0, d = 0, c = 0;
		let g = document.querySelectorAll(`${a} .grade`);
		a = document.querySelectorAll(`${a} .points`);
		for (let k = 0; k < g.length; k++) {
			let e = g[k].parentNode.parentNode.classList.contains("over_binary"), n = parseInt(g[k].value),
				u = parseFloat(a[k].value);
			e || (b += u * n, d += u);
			f += u;
			c += 55 <= n || e ? u : 0;
		}
		a = {};
		a.points = f;
		a.points_passed = c;
		a.count = g.length;
		a.avg = (0 < d ? b / d : 0).toFixed(2);
		return a;
	}

	function P() {
		const a = document.querySelectorAll(":not(#ptors) > .maor_table_row:not(.failed) .points"),
			b = document.querySelectorAll(":not(#ptors) > .maor_table_row .points");
		let f = 0, d = 0;
		a.forEach(c => f += parseFloat(c.value));
		b.forEach(c => d += parseFloat(c.value));
		return d ? parseFloat(100 * f / d).toFixed(2) : 0;
	}

	function I() {
		const a = H(".selected"), b = document.querySelectorAll("#selected_tbl .maor_table_row div");
		b[1].textContent = 1 != a.count ? `${a.count} קורסים` : "קורס 1";
		b[3].textContent = a.avg;
		b[5].textContent = a.points;
		b[7].textContent = a.points_passed;
	}

	function y() {
		const a = H();
		document.getElementById("avg_grade").textContent = a.avg;
		document.getElementById("curr_points").textContent = a.points_passed + h.ex_points;
		document.getElementById("curr_success").textContent = P();
		I();
	}

	function Q(a, b, f, d) {
		let c = "inlist" == f ? "outlist" : "inlist";
		if (!b.className.includes("temporary")) {
			c = z(a, c);
			if (f == "outlist" && a.perma) {
				a.perma = false;
				c.classList.remove("ignored");
				chrome.storage.local.get({calc_ignore: []}, g => {
					chrome.storage.local.set({calc_ignore: g.calc_ignore.filter(k => k != a.num)})
				});
			}
			if (d) {
				a.perma = true;
				c.classList.add("ignored");
				chrome.storage.local.get({calc_ignore: []}, g => {
					g.calc_ignore.push(a.num);
					chrome.storage.local.set({calc_ignore: g.calc_ignore});
				});
			}
		}
		b.remove();
		y();
	}

	function z(a, b, f = null) {
		let d = false;
		f || (f = document.querySelector(`#${b} template`).content, d = true);
		f = f.cloneNode(true);
		const c = f.querySelector(".maor_table_row");
		(55 > parseInt(a.grade) || "incomplete" == b) && c.classList.add("failed");
		"עבר" == a.grade && c.classList.add("over_binary");
		a.perma && c.classList.add("ignored");
		d && c.classList.add("animate");
		d = c.querySelectorAll("div");
		d[0].textContent = a.num;
		d[1].textContent = a.name;
		d[2].querySelector(".points").value = a.points;
		if ("incomplete" != b) {
			const g = d[3].querySelectorAll("div > *");
			g[0].value = a.grade;
			d[4].textContent = a.sem;
			"inlist" == b && g[1].addEventListener("click", () => {
				let e;
				a:{
					e = g[0];
					const n = g[1];
					if (e.disabled)
						e.disabled = false, n.textContent = "אישור", e.focus();
					else if (0 <= e.value && 100 >= e.value && !isNaN(parseInt(e.value))) {
						e.value = parseInt(e.value);
						e.disabled = true;
						n.textContent = "ערוך";
						55 <= e.value ? c.classList.remove("failed") : c.classList.add("failed");
						if (!c.className.includes("temporary")) {
							if (e.value == a.grade) {
								e = void 0;
								break a
							}
							c.classList.add("temporary");
							c.classList.add("animate");
							c.querySelectorAll("div")[4].textContent = "-";
							z(a, "outlist");
						}
						y();
					}
					e = void 0;
				}
				return e;
			});
			d = c.querySelectorAll(".center button");
			for (let e = 0; e < d.length; e++) d[e].addEventListener("click", () => Q(a, c, b, e));
		} else d[3].textContent = a.sem;
		if ("inlist" == b) {
			const k = c.querySelector("input[type='checkbox']");
			a.selected && (c.classList.add("selected"), k.checked = true);
			k.addEventListener("change", () => {
				k.checked ? c.classList.add("selected") : c.classList.remove("selected");
				I();
			})
		}
		document.getElementById(b).appendChild(f);
		return c;
	}

	function D(a, b) {
		const f = document.querySelector(`#${a} template`).content;
		for (let d of b.reverse()) z(d, a, f);
	}

	function R(a, b) {
		a.preventDefault();
		a = new FormData(b);
		a = {
			name: a.get("name"),
			num: " - ",
			points: parseFloat(a.get("points")),
			grade: parseInt(a.get("grade")),
			sem: " - ",
			selected: true
		};
		0 <= a.grade && 100 >= a.grade && .5 <= a.points ? (z(a, "inlist").classList.add("temporary"), y(), b.reset()) : (b.classList.add("failed"), setTimeout(() => b.classList.remove("failed"), 1E3))
	}

	function S(a) {
		const b = document.querySelector("#ptors template").content;
		for (let f of a.reverse()) {
			a = b.cloneNode(true);
			let d = a.querySelectorAll(".maor_table_row div");
			d[0].textContent = f.num;
			d[1].textContent = f.name;
			d[2].querySelector(".points").value = f.points;
			document.getElementById("ptors").appendChild(a);
		}
	}

	function T(a, b, f, d) {
		console.log("showCalculatorN");
		try {
			fetch(chrome.runtime.getURL("html/templates/grades_sheet.html")).then(c => c.text()).then(c => {
				for (c = (new DOMParser).parseFromString(c, "text/html"); document.documentElement.firstChild;) document.documentElement.lastChild.remove();
				document.dir = "rtl";
				for (let g of c.documentElement.childNodes) document.documentElement.appendChild(g);
				let x = {
					ex_points: h.ex_points,
					system_avg: h.system_avg,
					system_points: h.system_points,
					success_rate: h.success_rate
				};
				for (let e of Object.keys(x)) document.getElementById(e).textContent = x[e];
				D("inlist", a);
				D("outlist", b);
				0 < f.length ? D("incomplete", f) : document.getElementById("incomplete_wrapper").style.display = "none";
				0 < d.length ? S(d) : document.getElementById("ptors_wrapper").style.display = "none";
				y();
				const k = document.getElementById("c_form");
				k.addEventListener("submit", e => R(e, k));
				document.getElementById("to_csv").addEventListener("click", () => {
					let e = "מספר,קורס,נקודות,ציון,סמסטר";
					document.querySelectorAll("#inlist div.maor_table_row").forEach(v => {
						let A = [];
						v.querySelectorAll("div").forEach(U => A.push(`"${U.textContent}"`));
						v = v.querySelectorAll("input[type='number']");
						e += `${A[0]},${A[1]},${v[0].value},${v[1].value},${A[4]}\n`
					});
					const n = document.createElement("a"),
						u = new Blob(["\ufeff", e], {type: "text/csv"});
					n.href = window.URL.createObjectURL(u);
					n.download = "grades_" + Date.now() + ".csv";
					n.click();
					n.remove();
				});
			});
		} catch (err) {
			console.error(err);
		}
	}

	let h = {}, q = (new URLSearchParams(window.location.search)).get("TP");
	q ??= (new URLSearchParams(document.referrer)).get("TP");
	q = parseInt(q);
	if (2 !== q)
		O("a", "no-print", {
				href: "https://students.technion.ac.il/local/tcurricular/grades?TP=2",
				target: "_blank",
				style: "border-radius: 4px; color: #000; background-color: var(--sec-light); padding: 4px 8px;"
			}, "פתח מחשבון ממוצע אקדמי - Technion",
			document.querySelector("#page-header div.card-body > .flex-wrap"), false);
	else {
		let p = [], E = [], J = [], K = [], r = "";
		h.total_points_tried = 0;
		h.points_succeed = 0;
		h.ex_points = 0;
		const F = document.querySelectorAll("table.table-sm.table-striped > tbody"),
			V = document.querySelectorAll("table.table-sm > thead > tr:first-of-type > th");
		for (let w = F.length - 1; 0 <= w; w--) {
			const B = F[w].querySelectorAll("tr");
			let x = V[w].textContent.split("(")[0].replace("\n", "").replace("סמסטר", "").trim();
			if ("זיכויים" == x) {
				h.ex_points = parseFloat(F[w].querySelectorAll("tr:last-child th")[1].textContent.trim());
				h.ex_points = isNaN(h.ex_points) ? 0 : h.ex_points;
				for (let t = B.length - 2; 0 <= t; t--) {
					let l = B[t].querySelectorAll("td");
					let m = l[1].textContent;
					let x = l[0].textContent.trim();
					m = m.trim();
					l = parseFloat(l[2].textContent);
					K.push({name: m, num: x, points: 0 < l ? l : 0});
				}
			} else for (let t = B.length - 1; 0 <= t; t--) {
				let m = B[t].querySelectorAll("td"), l = m[3].textContent.replace("*", "").trim();
				if (!("-" == l || "עבר" != l && "לא השלים" != l && isNaN(parseInt(l)))) {
					if ("" == r) (r = x);
					const L = parseInt(l), G = parseFloat(m[2].textContent), W = m[1].textContent,
						M = m[0].textContent.trim(), C = W.trim();
					h.total_points_tried += G;
					h.points_succeed += 55 <= L || "עבר" == l ? G : 0;
					m = {name: C, num: M, points: G, grade: L, sem: x};
					if ("לא השלים" == l)
						m.grade = l, J.push(m);
					else {
						"עבר" == l && (m.grade = l);
						let N = true;
						C.includes("ספורט") || C.includes("חינוך גופני") ||
						p.forEach(a => {
							if (a.name == C || a.num == M) N = false;
						});
						N ? (m.selected = m.sem == r, p.push(m)) : E.push(m);
					}
				}

			}		}
		r = document.querySelectorAll("table.table-sm")[0].querySelectorAll("tr")[2].querySelectorAll("td");
		h.system_points = parseFloat(r[2].textContent.trim());
		h.success_rate = 100 * parseFloat(r[1].textContent.trim());
		h.system_avg = parseFloat(r[0].textContent.trim());
		if (q == 2)
			chrome.storage.local.get({calc_ignore: []}, a => {
				for (let b = p.length - 1; 0 <= b; b--) a.calc_ignore.includes(p[b].num) && (p[b].perma = true, E.push(p[b]), p.splice(b, 1));
				T(p, E, J, K);
			});
	}
})();
