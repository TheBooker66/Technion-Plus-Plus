(function () {
	function addCourseWebsiteLinks() {
		const courseRows = document.querySelectorAll("center > br + table > tbody > tr");
		if (courseRows[1].getAttribute("bgcolor") !== "yellow") {
			courseRows[0].appendChild(document.createElement("th")).textContent = "אתר הקורס";
			courseRows[courseRows.length - 1].children[0].setAttribute("colspan", "4");

			const courseButtonTemplate = new DOMParser()
				.parseFromString(
					`<table>
            <td style="text-align: center; vertical-align: middle;">
                <a class="tp_link" title="חץ לאתר הקורס"/>
            </td>
        </table>`,
					"text/html"
				)
				.querySelector("td") as HTMLTableCellElement;
			const style = document.createElement("style");
			// noinspection SpellCheckingInspection,GrazieStyle
			style.textContent = `.tp_link {
  display: inline-block; width: 31px; height: 14px; 
  background-image: url('data:image/gif;base64,R0lGODlhHwAOALMOAP98AP+VAv9tAP9+Av+SAP+xAf/OAf+sAP/nAP/IAP/4AP/jAP/3AP//AAAAAAAAACH5BAEAAA4ALAAAAAAfAA4AAARV0MlJq70i372B/x4nEmRpkiJ1rGzrrlwiz3RtJ9Wi73zv94ygcEgsGoWNpHLJbDqVFYV0Sq1aqxyEdsvtehGpiWFMLpvH4UthzW6v06KAfC6Hwwf4CAA7');
  background-repeat: no-repeat; background-position: center; background-size: contain;
  overflow: hidden; border: none;
} .tp_link:hover {
  background-color: transparent;
}`;
			const cookie = window.location.toString().split("settings_courses/")[1];

			for (let i = 1; i < courseRows.length - 1; i++) {
				const buttonCell = courseButtonTemplate.cloneNode(true) as DocumentFragment;
				(buttonCell.querySelector("a") as HTMLAnchorElement).href =
					`https://grades.cs.technion.ac.il/${courseRows[i].children[0].textContent}/${cookie}`;
				courseRows[i].appendChild(buttonCell);
			}
			document.head.append(style);
		}
	}

	function addCopyPasswordButton() {
		const icsLink = document.querySelector("a.ics") as HTMLAnchorElement;
		if (!icsLink) return;

		const password = icsLink.href.slice(-14),
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
		const currentTab = document.querySelector("div > table > tbody > tr > td > span") as HTMLSpanElement,
			restOfTabs = document.querySelectorAll(
				"div > table > tbody > tr > td > div > a"
			) as NodeListOf<HTMLAnchorElement>;
		const allTabs = [...restOfTabs, currentTab] as HTMLElement[];
		for (const tab of allTabs) {
			tab.textContent +=
				" - " +
				(document.querySelector(`#c${tab.textContent} span.black-text > strong`) as HTMLElement).textContent;
			tab.setAttribute(
				"style",
				"{white-space: nowrap; max-width: calc((90vw - 350px) / ${courseTabs.length + 1}); text-overflow: ellipsis; overflow-x: hidden; display: block; min-width: 9ch;}".replace(
					/[{}]/g,
					""
				)
			);
		}
	}

	const currentPage = window.location.toString().split("/")[3];
	if (currentPage === "settings_courses") addCourseWebsiteLinks();
	else if (currentPage === "settings_auto_update") addCopyPasswordButton();
	else if (/\d{8}/.test(currentPage)) updateTabNames();
})();
