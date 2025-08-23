type HWSystem = "moodle" | "cs" | "webwork" | "ua";

// If a property is not present, it is due to the assignment being a user-added assignment ("ua")
type HWAssignment = {
	eventID: number,
	name: string,
	description: string,
	course?: string,
	sys: HWSystem,
	done: boolean,
	timestamp: number,
	finalDate?: string,
	newEh?: boolean,
	goToFunc?: () => Promise<chrome.tabs.Tab>,
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
};

type RecordingCourse = {
	n: string, // Course name
	v: { // Course data
		vn: string, // Recording name
		l: string, // Recording ID
		p: number, // panoptoEh
		t: number, // No clue
		b: string, // No clue
	}[],
	a?: string, // Course Alias
};

type BusLine = {
	ID: number,
	CompanyName: "אגד" | "נסיעות ותיירות" | "סופרבוס" | "ג.ב. טורס" | "קווים" | "נתיב אקספרס",
	Shilut: string, // Bus line number
	DestinationQuarterName: "חיפה אוניברסיטה",
	MinutesToArrival: 0,
	MinutesToArrivalList: number[],
};

type DownloadItem = {
	sys: number, // Panopto or the old video server
	sub_pre: string, // No clue
	list: {
		u: string, // Video URL
		n: string, // Video name
	}[],
};