var version_number = chrome.runtime.getManifest().version;
document.getElementById("version").innerText = "מה חדש - גירסה " + version_number.trim();