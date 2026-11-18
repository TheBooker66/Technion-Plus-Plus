// WeBWorK logs you out after some time with no authenticated request.
// This quietly requests the course home page in the background on a fixed interval.

(async function () {
	const FIVE_MINUTES = 5 * 60 * 1000;

	const {webwork_keepalive} = await chrome.storage.local.get({webwork_keepalive: true});
	if (!webwork_keepalive) return;

	// URL layout is /<webwork root>/<courseID>/...
	const [root, courseId] = location.pathname.split("/").filter(Boolean);
	if (!courseId) return;

	const courseUrl = new URL(`/${root}/${courseId}/`, location.origin);

	if (!document.querySelector('a[href*="/logout"]')) return;

	const ping = async () => {
		try {
			const res = await fetch(courseUrl.href, {
				method: "GET",
				credentials: "include",
				cache: "no-store",
				redirect: "follow",
			});
			const text = await res.text();
			if (/name=["']passwd["']/.test(text) && !/\/logout/.test(text)) {
				clearInterval(timer);
				return;
			}
		} catch {
			// Network error
		}
	};

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === "local" && changes.webwork_keepalive && !changes.webwork_keepalive.newValue) {
			clearInterval(timer);
		}
	});

	const timer = setInterval(ping, FIVE_MINUTES);
})();
