'use strict';

(function () {
	function q(c, C, p, D) {
		if (0 >= c.length) return;
		const r = document.createElement("a");
		r.setAttribute("class", "maor_download");
		r.addEventListener("click", () => {
			const y = window.location.href.includes("ho_") ? decodeURIComponent(decodeURIComponent(window.location.href.split("ho_")[1].split(".html")[0])).replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "").trim() + "/" : "",
				v = {sub_pre: "", list: []};
			let f = document.querySelector(".titlebarname span");
			f = f.querySelector(".lang-en") ? f.querySelector(".lang-en").textContent.trim() : f.textContent.trim();
			f = "" != f ? f : document.getElementsByTagName("html")[0].getAttribute("data-course").trim();
			f = f.replace(/\./g, " ").replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "");
			const x = window.location.hostname.includes("webcourse");
			for (let m = 0; m < c.length; m++) {
				const z = document.getElementById("maor_sub_" + D).checked ? c[m][1].replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_ ]/g, "").trim() + "/" : "";
				let t = {};
				if (x) {
					const A = c[m][0].split("/");
					t.n = f + "/" + y + z + decodeURIComponent(A[A.length - 1].split("?")[0]).replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_\. ]/g,
						"").trim();
					t.u = c[m][0]
				} else t.n = f + "/" + y + z + decodeURIComponent(c[m][0].split("/WCFiles/")[1]).replace(/[^a-zA-Z\u05d0-\u05ea0-9\-_\. ]/g, "").trim(), t.u = decodeURIComponent(c[m][0]).split("/WCFiles/")[1];
				v.list.push(t);
			}
			v.sub_pre = x ? "" : decodeURIComponent(c[0][0]).split("?")[1].split("/WCFiles/")[0] + "/WCFiles/";
			v.sys = x ? 3 : 2;
			chrome.runtime.sendMessage({mess_t: "multidownload", chunk: v});
		});
		r.textContent = "הכל" === p ? "הורדת כל הקבצים " : "הורדת קבצי " + p + " ";
		p = document.createElement("span");
		p.setAttribute("style", "display: inline-block");
		p.textContent = " (" + c.length + ")";
		r.appendChild(p);
		C.appendChild(r);
	}

	let l = document.getElementsByTagName("a");
	for (let a = 0; a < l.length; a++) "wc_output" == l[a].getAttribute("target") && l[a].setAttribute("target", "_blank");
	if (window.location.href.includes("ho.html") || -1 != window.location.href.search("ho_.*.html"))
		for (let l = document.getElementsByClassName("tickets"), a = 0; a < l.length; a++) {
			let g = [], h = [], e = [], w = [], k = [],
				n = l[a].getElementsByClassName("ticket");
			for (let d = 0; d < n.length; d++) {
				const B = n[d].getElementsByTagName("a"), u = n[d].getElementsByTagName("h2")[0].textContent;
				for (let c = 0; c < B.length; c++) {
					const b = B[c].getAttribute("href");
					if (b.includes("Spring") || b.includes("Summer") || b.includes("Winter")) b.includes(".pdf") ? g.push([b, u]) : b.includes(".ppt") || b.includes(".pptx") || b.includes(".pps") || b.includes(".ppsx") ? h.push([b, u]) : b.includes(".doc") || b.includes(".docx") ? e.push([b,
						u]) : b.includes(".zip") ? w.push([b, u]) : k.push([b, u])
				}
			}
			if (0 < g.length + h.length + e.length + k.length) {
				const n = document.createElement("fieldset"), d = document.createElement("div");
				n.appendChild(document.createElement("legend")).textContent = "Technion";
				d.className = "maor_flex";
				k = g.concat(h, e, w, k);
				k.length > g.length && k.length > h.length && k.length > e.length && k.length > w.length &&
				q(k, d, "הכל", a);
				q(g, d, "PDF", a);
				q(h, d, "PowerPoint", a);
				q(e, d, "Word", a);
				q(w, d, "ZIP", a);
				g = document.createElement("label");
				g.className = "maor_download";
				h = document.createElement("div");
				e = document.createElement("input");
				e.setAttribute("type", "checkbox");
				e.id = "maor_sub_" + a;
				h.appendChild(e);
				e = document.createElement("span");
				e.textContent = "הורד כל כותרת לתיקיה נפרדת";
				h.appendChild(e);
				g.appendChild(h);
				d.appendChild(g);
				n.appendChild(d);
				l[a].insertBefore(document.createElement("div").appendChild(n).parentNode, l[a].firstChild).className = "maor_fieldset";
			}
		}
})();
