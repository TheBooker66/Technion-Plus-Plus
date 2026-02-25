function reverseString(str: string): string {
	return str.split('').reverse().join('');
}

function xorStrings(str1: string, str2: string): string {
	return str1.split('').map((_, i) =>
		String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i)),
	).join('');
}

async function resetBadge() {
	const badgeColours = await chrome.action.getBadgeBackgroundColor({}),
		badgeText = await chrome.action.getBadgeText({});
	if (badgeColours[0] === 164 && badgeColours[1] === 127 && badgeColours[2] === 0 && badgeText === "!") // Warning colours
		await chrome.action.setBadgeText({text: ""});
}

function resolveTheme(theme: string): void {
	const entirePage = document.documentElement;
	theme === "dark" || (theme === "auto" && window.matchMedia('(prefers-color-scheme: dark)').matches) ?
		entirePage.setAttribute("tplus", "dm") : entirePage.removeAttribute("tplus");
}

export {reverseString, xorStrings, resetBadge, resolveTheme};