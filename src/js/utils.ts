function reverseString(str: string): string {
	return str.split('').reverse().join('');
}

function xorStrings(str1: string, str2: string): string {
	return str1.split('').map((_, i) =>
		String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i)),
	).join('');
}

export {reverseString, xorStrings};