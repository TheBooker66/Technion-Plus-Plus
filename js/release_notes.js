let version_number = chrome.runtime.getManifest().version,
	date = new Date("2024-12-20").toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
document.getElementById("version").innerText = `מה חדש – גירסה ${version_number.trim()} – ${date.trim()}`;