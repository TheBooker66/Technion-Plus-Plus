function reverseString(str: string): string {
	return str.split("").reverse().join("");
}

function xorStrings(str1: string, str2: string): string {
	return str1
		.split("")
		.map((_, i) => String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i)))
		.join("");
}

// Safari and standalone WKWebExtension contexts use different URL schemes for the same bundle.
export const isSafariExtension = ["safari-web-extension:", "webkit-extension:"].includes(
	new URL(chrome.runtime.getURL("")).protocol
);

export async function getBadgeLevel(): Promise<"error" | "warning" | null> {
	if ((await chrome.action.getBadgeText({})) !== "!") return null;
	// Safari controls the badge colour, so retain the alert priority independently.
	if (isSafariExtension) {
		const {badgeError} = await chrome.storage.local.get({badgeError: false});
		return badgeError ? "error" : "warning";
	}
	const [red, green, blue] = await chrome.action.getBadgeBackgroundColor({});
	if (red === 215 && green === 0 && blue === 34) return "error";
	if (red === 164 && green === 127 && blue === 0) return "warning";
	return null;
}

async function resetBadge() {
	if ((await getBadgeLevel()) === "warning") await chrome.action.setBadgeText({text: ""});
}

function resolveTheme(theme: string): void {
	const entirePage = document.documentElement;
	if (theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches))
		entirePage.setAttribute("tplus", "dm");
	else entirePage.removeAttribute("tplus");
}

async function calculateBuses(stationID: number): Promise<BusArrival[]> {
	const url = `https://curlbus.app/${stationID}`;
	const res = await fetch(url, {headers: {"Accept": "application/json"}});
	const rawBuses: BusVisit[] = (await res.json())["visits"][stationID];

	const now = Date.now();
	const busArrivals: BusArrival[] = rawBuses.map((bus) => {
		const etaMs = new Date(bus.eta.replace(" ", "T")).getTime();
		return {
			lineNumber: bus.line_name,
			destination: bus.static_info?.route?.destination?.name?.HE || "",
			timeInMinutes: Math.max(0, Math.floor((etaMs - now) / 60000)),
		};
	});

	busArrivals.sort((a, b) => a.timeInMinutes - b.timeInMinutes);
	const seenLines = new Set<string>();
	return busArrivals.map((arrival) => {
		const key = `${arrival.lineNumber}-${arrival.destination}`;
		const firstEh = !seenLines.has(key);
		seenLines.add(key);
		return {...arrival, firstEh: firstEh};
	});
}

export {reverseString, xorStrings, resetBadge, resolveTheme, calculateBuses};
