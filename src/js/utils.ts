function reverseString(str: string): string {
	return str.split('').reverse().join('');
}

function xorStrings(str1: string, str2: string): string {
	return str1.split('').map((_, i) =>
		String.fromCharCode(str1.charCodeAt(i) ^ str2.charCodeAt(i)),
	).join('');
}

interface HWAssignment {
	eventID: number,
	name: string,
	description: string,
	course: string,
	sys: "moodle" | "cs" | "webwork" | "ua",
	finalDate: string,
	timestamp: number,
	newEh: boolean,
	goToFunc: () => Promise<chrome.tabs.Tab>,
}

interface CalculatorCourse {
	num: number,
	name: string,
	points: number,
	binary: boolean,
	grade: number | string,
	year: number,
	semester: "חורף" | "אביב" | "קיץ",
	perm_ignored: boolean,
	selected: boolean,
}

interface RecordingCourse {
	n: string, // Course name
	data: { // Course data
		vn: string, // Recording name
		l: string, // Recording ID
		p: number, // panoptoEh
		t: number, // No clue
		b: string // No clue
	}[],
	a?: string, // Course Alias
}

interface BusLine {
	ID: number,
	CompanyName: "אגד" | "נסיעות ותיירות" | "סופרבוס" | "ג.ב. טורס" | "קווים" | "נתיב אקספרס",
	Shilut: string, // Bus line number
	DestinationQuarterName: "חיפה אוניברסיטה",
	MinutesToArrival: 0,
	MinutesToArrivalList: number[],
}

interface DownloadItem {
	sys: number,
	sub_pre: string,
	list: { u: string, n: string }[],
}

export {reverseString, xorStrings, HWAssignment, CalculatorCourse, RecordingCourse, BusLine, DownloadItem};