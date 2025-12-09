(function () {
	const path = document.location.pathname.toLowerCase();
	if ("/index.aspx" === path || "/indexeng.aspx" === path) {
		const lang = "/index.aspx" === path ? 0 : 1;
		const button_data = {
			grad_dir: ["left", "right"],
			padding: ["1em 0 1em 3em", "1em 3em 1em 0"],
			title: [
				"לחץ להתחלת תהליך השיתוף",
				"Click to start the sharing process",
			],
			button: [
				"שיתוף היסטוגרמות עם CheeseFork",
				"Share histograms with CheeseFork",
			],
			info: [
				"למידע אודות שיתוף היסטוגרמות",
				"For information about sharing histograms",
			],
			info_link: ["לחץ כאן", "press here"],
		};
		const html = new DOMParser().parseFromString(
			`
    <div style="margin-bottom: 1em; border-width: 2px 0; border-image: linear-gradient(to ${button_data.grad_dir[lang]}, rgb(6, 62, 111), transparent) 1; width: max-content;padding: ${button_data.padding[lang]}; border-style: solid;">
        <a class="tplus_download" id="cf_loader" title="${button_data.title[lang]}">
        	<i class="far fa-hand-point-${button_data.grad_dir[lang]} fa-fw"></i> ${button_data.button[lang]}
        </a><br />
        <small style="margin: 4px;">
            (${button_data.info[lang]} 
            <a href="https://cheesefork.cf/share-histograms.html" target="_blank">${button_data.info_link[lang]}</a>.)
        </small>
    </div>`,
			"text/html",
		).body.firstChild as HTMLDivElement;
		const page = document.getElementById("contents") as HTMLDivElement;
		const element = page.insertBefore(html, page.firstChild);
		const loader = element.querySelector("#cf_loader") as HTMLAnchorElement;
		loader.addEventListener("click", () => {
			const script = document.createElement("script");
			script.setAttribute("charset", "utf-8");
			script.src = chrome.runtime.getURL(
				"./lib/cheesefork/share-histograms.js",
			);
			script.onload = () => loader.remove();
			(document.head || document.documentElement).appendChild(script);
		});
	}
})();
