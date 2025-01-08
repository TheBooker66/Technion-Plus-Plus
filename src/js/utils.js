function reverseString(str) {
	return str.split('').reverse().join('');
}

function xorStrings(str1, str2) {
	return str1.split('').map((char, i) =>
		String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i))
	).join('');
}

export {reverseString, xorStrings}