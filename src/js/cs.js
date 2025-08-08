'use strict';

(function () {
	function addCourseWebsiteLinks() {
		const courseRows = document.querySelectorAll("center > table + table > tbody > tr");
		if (courseRows[1].getAttribute("bgcolor") !== "yellow") {
			courseRows[0].appendChild(document.createElement("th")).textContent = "אתר הקורס";
			// noinspection HtmlDeprecatedAttribute,HtmlRequiredAltAttribute,HtmlUnknownTarget
			const courseButtonTemplate = (new DOMParser).parseFromString('<table>\n            <td align="center" style="vertical-align: middle">\n                <input type="image" src="/Images/StudImages/prev.gif" style="display: inline" />\n            </td>\n        </table>', "text/html").querySelector("td");
			courseRows[courseRows.length - 1].children[0].setAttribute("colspan", "4");
			for (let i = 1; i < courseRows.length - 1; i++) {
				let buttonCell = courseButtonTemplate.cloneNode(true);
				buttonCell.querySelector("input").addEventListener("click", f => {
					f.preventDefault();
					document.forms["SubSub"]["RecreatePath"].value = `5-${i - 1}`;
					document.forms["SubSub"].submit();
				});
				courseRows[i].appendChild(buttonCell);
			}
		}
	}

	function addCopyPasswordButton() {
		let icsLink = document.querySelector("a.ics");
		if (!icsLink) return;

		const password = icsLink.href.slice(-8),
			copyButton = document.createElement("a"),
			icsDiv = document.querySelector("div.ics");
		copyButton.className = "maor_download";
		copyButton.textContent = "העתק סיסמת יומן";
		copyButton.addEventListener("click", () => {
			navigator.clipboard.writeText(password).then(() => {
				copyButton.textContent = "הסיסמה הועתקה בהצלחה!";
			}).catch(err => {
					copyButton.textContent = "שגיאה בהעתקה";
					console.error(err);
				},
			);
		});
		icsDiv.insertBefore(copyButton, icsDiv.childNodes[0]);
	}

	function updateTabNames() {
		const courseTabs = document.querySelectorAll("form[name='SubSub'] table table a.tab");
		for (let tab of courseTabs) {
			tab.textContent += " - " + document.querySelector(`#c${tab.textContent} span.black-text > strong`).textContent;
			tab.setAttribute("style", "{white-space: nowrap; max-width: calc((90vw - 350px) / ${courseTabs.length + 1}); text-overflow: ellipsis; overflow-x: hidden; display: block; min-width: 9ch;}".replace(/[{}]/g, ''));
		}
	}

	if (document.forms["SubSub"]) {
		const pathInputs = document.querySelectorAll("form input[name='RecreatePath']");
		let recreatePathValue = "";
		for (let i = 0; i < pathInputs.length; i++)
			if (pathInputs[i].value.length === 3) {
				recreatePathValue = pathInputs[i].value;
				break;
			}

		if (recreatePathValue.toString() === "0-0") {
			addCourseWebsiteLinks();
		} else if (recreatePathValue.toString() === "0-2") {
			addCopyPasswordButton();
		} else if (recreatePathValue[0].toString() === "5") {
			updateTabNames();
		}
	}
})();
