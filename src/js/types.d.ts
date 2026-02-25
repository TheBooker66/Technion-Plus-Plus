type StorageData = {
	// --- Core Identity & Auth ---
	username: string;
	email_server: boolean;
	uidn_arr: [string, string];
	maor_p: string;
	phrase: string;
	term: string;
	enable_login: boolean;
	quick_login: boolean;
	external_user: boolean;
	external_enable: boolean;

	// --- Global UI & Settings ---
	theme: "light" | "dark" | "auto";
	email_preference: "gmail" | "outlook" | "program";
	custom_name: string;
	custom_link: string;
	remoodle: boolean;
	remoodle_angle: number;

	// --- Notifications ---
	hw_alerts: boolean;
	alerts_sound: boolean;
	notif_vol: number;

	// --- General Agenda/Calendar ---
	user_agenda: {[key: string]: HWAssignment};
	pinned_assignments: number[];
	cal_seen: number;
	organizer_fullscreen: boolean;
	filter_toggles: {
		appeals: boolean;
		zooms: boolean;
		attendance: boolean;
		reserveDuty: boolean;
	};

	// --- Module: Moodle ---
	moodle_cal_enabled: boolean;
	moodle_cal_prop: string;
	moodle_cal_max: number;
	moodle_cal_courses: {[key: HWAssignment["course"]]: string};
	moodle_cal_finished: number[];

	// --- Module: CS System ---
	cs_cal_enabled: boolean;
	cs_cal_pass: string;
	cs_cal_update: number;
	cs_cal_seen: {[key: string]: string[]};
	cs_cal_finished: number[];

	// --- Module: WebWork ---
	webwork_cal_enabled: boolean;
	webwork_cal_update: number;
	webwork_cal_courses: {[key: string]: WebWorkCourse};
	webwork_cal_events: {[key: string]: WebWorkAssignment};

	// --- Module: Videos ---
	videos_update: number;
	videos_last: string[];
	videos_data: {[key: string]: RecordingCourse["v"]};
	videos_courses: string[][];

	// --- Module: Panopto ---
	panopto_save: boolean;
	panopto_speed: number;
	panopto_dark_mode: boolean;
	panopto_return_backwards: boolean;
	panopto_floating_speed: boolean;
	panopto_scroll_volume: boolean;
	panopto_hide_thumbnails: boolean;
	panopto_hide_sidebar: boolean;

	// --- Module: Bus Lines ---
	bus_alerts: BusLine["Shilut"][];
	bus_station: number;
	bus_time: number;
	allow_timings: boolean;

	// --- Misc. Utilities ---
	grades: CalculatorCourse[];
	sap_hist: boolean;
	dl_current: number;
	dl_queue: DownloadItem[];
};

type HWSystem = "moodle" | "cs" | "webwork" | "ua";

// If a property is not present, it is due to the assignment being a user-added assignment ("ua")
type HWAssignment = {
	eventID: number;
	name: string;
	description: string;
	course?: string;
	sys: HWSystem;
	done: boolean;
	pinned: boolean;
	timestamp: number;
	finalDate?: string;
	newEh?: boolean;
	goToFunc?: () => void;
};

type Semester = "חורף" | "אביב" | "קיץ";

type CalculatorCourse = {
	num: string;
	name: string;
	points: number;
	binary: boolean;
	grade: number | string;
	year: number;
	semester: Semester;
	perm_ignored: boolean;
	selected: boolean;
};

type WebWorkAssignment = {
	h: string; // Homework name
	ts: number; // Timestamp
	due: string; // Due date as string
	seen: boolean; // Seen by user
	done: boolean; // Done by user
};

type WebWorkCourse = {
	name: string;
	lti: string;
};

type RecordingCourse = {
	n: string; // Course name
	v: {
		// Course data
		vn: string; // Recording name
		l: string; // Recording ID
		p: number; // Panopto or the old Video Server (always Panopto)
		t: number; // Lecture or Exercise
		b: string; // No clue
	}[];
	a?: string; // Course Alias
};

type BusLine = {
	Shilut: string; // Bus line number
	DestinationQuarterName: string; // Bus line destination
	MinutesToArrival: number; // Minutes to arrival for the first bus of a line
	MinutesToArrivalList: number[]; // Minutes to arrival for all buses of a line
};

type DownloadItem = {
	sys: number; // URL prefix (Moodle / Panopto / CS websites)
	sub_pre: string; // URL midfix (e.g. course name)
	list: {
		u: string; // URL suffix (e.g. file name on server)
		n: string; // File name to save as
	}[];
};
