const version_number = chrome.runtime.getManifest().version;
const date = new Date((document.getElementById("date") as HTMLSpanElement).textContent)
	.toLocaleDateString('he-IL', {year: 'numeric', month: 'long', day: 'numeric'});
(document.getElementById("title") as HTMLSpanElement).textContent = `מה חדש – גירסה ${version_number.trim()} – ${date.trim()}`;
(document.getElementById("version_range") as HTMLSpanElement).textContent =
	version_number.substring(0, version_number.indexOf('.', version_number.indexOf('.') + 1));
const linkElement = document.getElementById("storeLink") as HTMLAnchorElement,
	storeURL = "https://chromewebstore.google.com/detail/technion-plus-plus/pfhjnidbfndnjhpcpfecngcigdjebemk";
linkElement.setAttribute("href", storeURL);
linkElement.setAttribute("target", "_blank");