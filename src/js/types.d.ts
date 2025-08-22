type HWSystem = "moodle" | "cs" | "webwork" | "ua";

type HWAssignment = {
	eventID: number,
	name: string,
	description: string,
	course: string,
	sys: HWSystem,
	finalDate: string,
	timestamp: number,
	newEh: boolean,
	goToFunc: () => Promise<chrome.tabs.Tab>,
};

type Semester = "חורף" | "אביב" | "קיץ";

type CalculatorCourse = {
	num: string,
	name: string,
	points: number,
	binary: boolean,
	grade: number | string,
	year: number,
	semester: Semester,
	perm_ignored: boolean,
	selected: boolean,
}

type RecordingCourse = {
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

type BusLine = {
	ID: number,
	CompanyName: "אגד" | "נסיעות ותיירות" | "סופרבוס" | "ג.ב. טורס" | "קווים" | "נתיב אקספרס",
	Shilut: string, // Bus line number
	DestinationQuarterName: "חיפה אוניברסיטה",
	MinutesToArrival: 0,
	MinutesToArrivalList: number[],
}

type DownloadItem = {
	sys: number,
	sub_pre: string,
	list: { u: string, n: string }[],
}