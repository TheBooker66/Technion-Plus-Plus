function reverseString(str: string): string {
	return str.split('').reverse().join('');
}

function xorStrings(str1: string, str2: string): string {
	return str1.split('').map((_, i) =>
		String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i)),
	).join('');
}

function resetBadge() {
	chrome.action.getBadgeBackgroundColor({}, (badgeColours) => {
		chrome.action.getBadgeText({}, async (badgeText) => {
			if (badgeColours[0] === 215 && badgeColours[1] === 0 && badgeColours[2] === 34 && badgeText === "!")
				await chrome.action.setBadgeText({text: ""});
		});
	});
}

export {reverseString, xorStrings, resetBadge};