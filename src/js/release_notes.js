let version_number = chrome.runtime.getManifest().version;
let date_element = document.getElementById("date").innerText;
let date = new Date(date_element).toLocaleDateString('he-IL', {year: 'numeric', month: 'long', day: 'numeric'});
document.getElementById("title").innerText = `מה חדש – גירסה ${version_number.trim()} – ${date.trim()}`;
document.getElementById("version_range").innerHTML = "&#x202A;" + version_number.replace(version_number.split('.').at(-1), '').substring(0, version_number.length - 2) + ".x&#x202C;";