'use strict';

(function () {
	let a = document.location.pathname.toLowerCase();
	if ("/index.aspx" === a || "/indexeng.aspx" === a) {
		a = "/index.aspx" === a ? 0 : 1;
		let b = {
			grad_dir: ["left", "right"],
			padding: ["1em 0 1em 3em", "1em 3em 1em 0"],
			title: ["לחץ להתחלת תהליך השיתוף", "Click to start sharing process"],
			button: ["שיתוף היסטוגרמות עם CheeseFork", "Share histograms with CheeseFork"],
			info: ["למידע אודות שיתוף היסטוגרמות", "For information about sharing histograms"],
			info_link: ["לחץ כאן", "press here"],
		};
		a = (new DOMParser).parseFromString(`
    <div style="margin-bottom: 1em; border-width: 2px 0; border-image: linear-gradient(to ${b.grad_dir[a]}, hsl(208, 90%, 23%), transparent) 1; width: max-content;padding: ${b.padding[a]}; border-style: solid;">
        <a class="maor_download" id="cf_loader" title="${b.title[a]}"><i class="far fa-hand-point-${b.grad_dir[a]} fa-fw"></i> ${b.button[a]}</a><br />
        <small style="margin: 4px;">
            (${b.info[a]} 
            <a href="https://cheesefork.cf/share-histograms.html" target="_blank">${b.info_link[a]}</a>.)
        </small>
    </div>`, "text/html").body.firstChild;
		b = document.getElementById("contents");
		b.insertBefore(a, b.firstChild).querySelector("#cf_loader").addEventListener("click", () => {
			const c = document.createElement("script");
			c.setAttribute("charset", "utf-8");
			c.src = chrome.runtime.getURL("cheesefork/share-histograms.js");
			c.onload = () => this.remove();
			(document.head || document.documentElement).appendChild(c);
		});
	}
})();
