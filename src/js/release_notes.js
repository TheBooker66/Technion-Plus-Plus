let version_number = chrome.runtime.getManifest().version;
let date_element = document.getElementById("date").innerText;
let date = new Date(date_element).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
document.getElementById("version").innerText = `מה חדש – גירסה ${version_number.trim()} – ${date.trim()}`;