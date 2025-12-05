(function () {
	function addCourseWebsiteLinks() {
		const courseRows = document.querySelectorAll("center > table + table > tbody > tr");
		if (courseRows[1].getAttribute("bgcolor") !== "yellow") {
			courseRows[0].appendChild(document.createElement("th")).textContent = "אתר הקורס";
			// noinspection HtmlUnknownTarget
			const courseButtonTemplate = (new DOMParser).parseFromString(`<table>
            <td style="text-align: center; vertical-align: middle;">
                <input type="image" src="/Images/StudImages/prev.gif" style="display: inline"  alt="חץ לאתר הקורס"/>
            </td>
        </table>`, "text/html").querySelector("td") as HTMLTableCellElement;
			courseRows[courseRows.length - 1].children[0].setAttribute("colspan", "4");
			for (let i = 1; i < courseRows.length - 1; i++) {
				const buttonCell = courseButtonTemplate.cloneNode(true) as DocumentFragment;
				(buttonCell.querySelector("input") as HTMLInputElement).addEventListener("click", f => {
					f.preventDefault();
					document.forms.namedItem("SubSub")!["RecreatePath"].value = `5-${i - 1}`;
					document.forms.namedItem("SubSub")!.submit();
				});
				courseRows[i].appendChild(buttonCell);
			}
		}
	}

	function addCopyPasswordButton() {
		const icsLink = document.querySelector("a.ics") as HTMLAnchorElement;
		if (!icsLink) return;

		const password = icsLink.href.slice(-8),
			copyButton = document.createElement("a"),
			icsDiv = document.querySelector("div.ics") as HTMLDivElement;
		copyButton.className = "tplus_download";
		copyButton.textContent = "העתק סיסמת יומן";
		copyButton.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(password);
				copyButton.textContent = "הסיסמה הועתקה בהצלחה!";
			} catch (err) {
				copyButton.textContent = "התרחשה שגיאה בהעתקה.";
				console.error(err);
			}
		});
		icsDiv.insertBefore(copyButton, icsDiv.childNodes[0]);
	}

	function updateTabNames() {
		const courseTabs = document.querySelectorAll("form[name='SubSub'] table table a.tab");
		for (const tab of courseTabs) {
			tab.textContent += " - " + (document.querySelector(`#c${tab.textContent} span.black-text > strong`) as HTMLElement).textContent;
			tab.setAttribute("style", "{white-space: nowrap; max-width: calc((90vw - 350px) / ${courseTabs.length + 1}); text-overflow: ellipsis; overflow-x: hidden; display: block; min-width: 9ch;}".replace(/[{}]/g, ''));
		}
	}

	if (document.forms.namedItem("SubSub")) {
		const pathInputs = document.querySelectorAll("form input[name='RecreatePath']") as NodeListOf<HTMLInputElement>;
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
