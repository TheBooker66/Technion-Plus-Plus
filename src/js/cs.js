'use strict';

(function () {
	function e() {
		const a = document.querySelectorAll("center > table + table > tbody > tr");
		if ("yellow" != a[1].getAttribute("bgcolor")) {
			a[0].appendChild(document.createElement("th")).textContent = "אתר הקורס";
			const c = (new DOMParser).parseFromString('<table>\n            <td align="center" style="vertical-align: middle">\n                <input type="image" src="/Images/StudImages/prev.gif" style="display: inline" />\n            </td>\n        </table>',
				"text/html").querySelector("td");
			a[a.length - 1].children[0].setAttribute("colspan", "4");
			for (let b = 1; b < a.length - 1; b++) {
				let d = c.cloneNode(true);
				d.querySelector("input").addEventListener("click", f => {
					f.preventDefault();
					document.forms.SubSub.RecreatePath.value = `5-${b - 1}`;
					document.forms.SubSub.submit()
				});
				a[b].appendChild(d)
			}
		}
	}

	function g() {
		let a = document.querySelector("a.ics");
		if (a) {
			const c = a.href.slice(-8);
			a = document.querySelector("div.ics");
			const b = document.createElement("a");
			b.className = "maor_download";
			b.textContent = "העתק סיסמת יומן";
			a.insertBefore(b, a.childNodes[0]);
			b.addEventListener("click", () => {
				navigator.clipboard.writeText(c).then(() => {
					b.textContent = "הסיסמה הועתקה בהצלחה!"
				}).catch(err => {
						b.textContent = "שגיאה בהעתקה";
						console.error(err);
					}
				)
			})
		}
	}

	function h() {
		const a = document.querySelectorAll("form[name='SubSub'] table table a.tab");
		for (let c of a) c.textContent += " - " + document.querySelector(`#c${c.textContent} span.black-text > strong`).textContent, c.setAttribute("style", `
                white-space: nowrap;
                max-width: calc((90vw - 350px) / ${a.length + 1});
                text-overflow: ellipsis;
                overflow-x: hidden;
                display: block;
                min-width: 9ch;
            `)
	}

	if (document.forms.SubSub) {
		let a = document.querySelectorAll("form input[name='RecreatePath']"), c = "";
		for (let b = 0; b < a.length; b++) if (3 == a[b].value.length) {
			c = a[b].value;
			break
		}
		"0-0" == c && e();
		"0-2" == c && g();
		"5" == c[0] && h()
	}
})();
