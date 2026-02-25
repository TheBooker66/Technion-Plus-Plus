import {resolveTheme} from "./utils";

const semesterOrder = {
	חורף: 1,
	אביב: 2,
	קיץ: 3,
};

function handleStorageError(operation: string) {
	if (chrome.runtime.lastError) {
		console.error(`TE_calculator_${operation}: ${chrome.runtime.lastError.message}`);
		return true;
	}
	return false;
}

function calculateTableStats(tableSelector: string) {
	const gradeElements = document.querySelectorAll(`${tableSelector} .grade`) as NodeListOf<HTMLInputElement>,
		pointsElements = document.querySelectorAll(`${tableSelector} .points`) as NodeListOf<HTMLInputElement>;
	let sum = 0,
		totalPoints = 0,
		pointsForAverage = 0,
		pointsWithPassingGrade = 0;

	for (let i = 0; i < gradeElements.length; i++) {
		const points = parseFloat(pointsElements[i].value);
		totalPoints += points;

		if (gradeElements[i].tagName === "INPUT") {
			const grade = parseFloat(gradeElements[i].value);
			pointsWithPassingGrade += 55 <= grade ? points : 0;
			sum += points * grade;
			pointsForAverage += points;
		} else {
			const grade = gradeElements[i].textContent;
			pointsWithPassingGrade += grade === "עובר" || grade === "פטור עם ניקוד" ? points : 0;
		}
	}

	return {
		points: totalPoints,
		points_passed: pointsWithPassingGrade,
		count: gradeElements.length,
		avg: (pointsForAverage > 0 ? sum / pointsForAverage : 0).toFixed(2),
	};
}

function updateSelectedCoursesStats() {
	const selectedTableCells = document.querySelectorAll("#selected_tbl td"),
		selectedStats = calculateTableStats(".selected");

	if (selectedStats.count === 0) selectedTableCells[1].textContent = "לא בחרתם אף קורס, נו באמת...";
	else if (selectedStats.count === 1) selectedTableCells[1].textContent = "קורס 1";
	else selectedTableCells[1].textContent = `${selectedStats.count} קורסים`;

	selectedTableCells[3].textContent = selectedStats.avg;
	selectedTableCells[5].textContent = selectedStats.points.toString();
	selectedTableCells[7].textContent = selectedStats.points_passed.toString();
}

function handleSelectAllClick(event: Event) {
	const checkedEh = (event.target as HTMLInputElement).checked;

	document.querySelectorAll("#grades_list tbody tr").forEach((rowElement) => {
		const checkbox = rowElement.querySelector("input[type='checkbox'].select_course") as HTMLInputElement;
		checkbox.checked = checkedEh;
		rowElement.classList.toggle("selected", checkedEh);
	});

	updateSelectedCoursesStats();
}

function updateAllStats() {
	const allGradesStats = calculateTableStats("#grades_list"),
		allPointsElements = document.querySelectorAll("#grades_list tr .points") as NodeListOf<HTMLInputElement>,
		passingPointsElements = document.querySelectorAll(
			"#grades_list tr:not(.failed) .points"
		) as NodeListOf<HTMLInputElement>;
	const totalPoints = Array.from(allPointsElements).reduce((sum, element) => sum + parseFloat(element.value), 0),
		totalPassingPoints = Array.from(passingPointsElements).reduce(
			(sum, element) => sum + parseFloat(element.value),
			0
		);

	document.getElementById("avg_grade")!.textContent = allGradesStats.avg;
	document.getElementById("total_points")!.textContent = allGradesStats.points_passed.toString();
	document.getElementById("success_rate")!.textContent = totalPoints
		? ((100 * totalPassingPoints) / totalPoints).toFixed(2)
		: "0";
	updateSelectedCoursesStats();
}

function createCourseRowElement(courseData: CalculatorCourse, mainList: string) {
	const templateContent = (document.querySelector(`#${mainList}_template`) as HTMLTemplateElement)?.content.cloneNode(
		true
	) as DocumentFragment;
	const rowElement = templateContent.querySelector("tr") as HTMLTableRowElement;

	rowElement.classList.add("animate");
	if (parseInt(courseData.grade.toString()) < 55 || courseData.grade === "נכשל") rowElement.classList.add("failed");
	if (courseData.perm_ignored) rowElement.classList.add("ignored");

	const cellElements = rowElement.querySelectorAll("td");
	cellElements[0].textContent = courseData.num.toString();
	cellElements[0].id = "course_" + courseData.num.toString();
	cellElements[1].textContent = courseData.name;
	(cellElements[2].querySelector(".points") as HTMLInputElement).value = courseData.points.toString();
	cellElements[4].textContent = courseData.semester;
	cellElements[5].textContent = courseData.year.toString();

	const gradeInput = cellElements[3].querySelector(".grade") as HTMLInputElement;
	const editButton = cellElements[3].querySelector("button") as HTMLButtonElement;

	if (Number.isNaN(Number(courseData.grade))) {
		const gradeText = document.createElement("span");
		gradeText.classList.add("grade");
		gradeText.textContent = courseData.grade.toString();
		gradeInput.replaceWith(gradeText);
		rowElement.classList.toggle("failed", gradeText.textContent === "נכשל");
		if (editButton) editButton.remove();
	} else {
		gradeInput.value = courseData.grade.toString();
	}

	if (mainList === "grades_list" && courseData.selected) {
		const checkbox = rowElement.querySelector("input[type='checkbox']") as HTMLInputElement;
		rowElement.classList.add("selected");
		checkbox.checked = true;
	}

	return rowElement;
}

async function handleGradesListClick(event: PointerEvent) {
	const target = event.target as HTMLElement;
	if (!target) return;

	const rowElement = target.closest("tr");
	if (!rowElement) return;
	if (rowElement.parentElement?.tagName !== "TBODY") return;

	if (target.matches("td input[type='checkbox'].select_course")) {
		if ((target as HTMLInputElement).checked) rowElement.classList.add("selected");
		else rowElement.classList.remove("selected");
		updateSelectedCoursesStats();
		return;
	}

	if (!target.matches("td button")) return;

	const storageData = (await chrome.storage.local.get({grades: []})) as StorageData;
	const allGrades = storageData.grades;
	const courseNum = (rowElement.querySelector("td:first-child") as HTMLTableCellElement).textContent;
	const courseData = allGrades.find((course: CalculatorCourse) => course.num === courseNum);

	if (!courseData) {
		console.error("Course not found in storage for num:", courseNum);
		return;
	}

	const gradeInput = rowElement.querySelector(".grade") as HTMLInputElement;
	switch (target.textContent) {
		case "ערוך":
			gradeInput.disabled = false;
			target.textContent = "אישור";
			gradeInput.focus();
			break;
		case "אישור":
			const newGradeValue = parseFloat(gradeInput.value.toString());
			if (Number.isNaN(newGradeValue) || newGradeValue < 0 || newGradeValue > 100) {
				alert("נא להזין ציון תקין בין 0 ל-100.");
				gradeInput.classList.add("failed");
				setTimeout(() => gradeInput.classList.remove("failed"), 1000);
				return;
			}

			gradeInput.disabled = true;
			target.textContent = "ערוך";
			if (newGradeValue === courseData.grade) return;

			gradeInput.value = newGradeValue.toString();
			rowElement.classList.toggle("failed", newGradeValue <= 55);

			if (!rowElement.classList.contains("temporary")) {
				rowElement.classList.add("temporary", "animate");
				rowElement.querySelectorAll("td")[4].textContent = "-";
				rowElement.querySelectorAll("td")[5].textContent = "-";
				document
					.getElementById("ignore_list")
					?.querySelector("tbody")
					?.prepend(createCourseRowElement(courseData, "ignore_list"));
			}
			break;
		case "תמיד":
			courseData.perm_ignored = true;
			await chrome.storage.local.set({grades: allGrades});
			handleStorageError("ignore_grade");
		// eslint-disable-next-line no-fallthrough
		case "התעלם":
			rowElement.remove();
			document
				.getElementById("ignore_list")
				?.querySelector("tbody")
				?.prepend(createCourseRowElement(courseData, "ignore_list"));
			break;
		case "מחק":
			rowElement.remove();
			document.getElementById("ignore_list")?.querySelector(`#course_${courseNum}`)?.closest("tr")?.remove();
			document
				.getElementById("grades_list")
				?.querySelector("tbody")
				?.prepend(createCourseRowElement(courseData, "grades_list"));
			break;
	}
	updateAllStats();
}

async function handleIgnoreListClick(event: PointerEvent) {
	const target = event.target as HTMLElement;
	if (!target) return;

	const rowElement = target.closest("tr");
	if (!rowElement) return;
	if (rowElement.parentElement?.tagName !== "TBODY") return;

	if (!target.matches("td button")) return;

	const storageData = (await chrome.storage.local.get({grades: []})) as StorageData;
	const allGrades = storageData.grades;
	const courseNum = (rowElement.querySelector("td:first-child") as HTMLTableCellElement).textContent;
	const courseData = allGrades.find((course: CalculatorCourse) => course.num === courseNum);

	if (!courseData) {
		console.error("Course not found in storage for num:", courseNum);
		return;
	}

	switch (target.textContent) {
		case "שחזר":
			courseData.perm_ignored = false;
			rowElement.remove();
			document.getElementById("grades_list")?.querySelector(`#course_${courseNum}`)?.closest("tr")?.remove();
			document
				.getElementById("grades_list")
				?.querySelector("tbody")
				?.prepend(createCourseRowElement(courseData, "grades_list"));
			await chrome.storage.local.set({grades: allGrades});
			handleStorageError("restore_grade");
			break;
		case "מחק":
			const sureEh = confirm("האם אתם בטוחים שברצונכם למחוק את הקורס הזה?");
			if (!sureEh) return;

			rowElement.remove();
			document.getElementById("grades_list")?.querySelector(`#course_${courseNum}`)?.closest("tr")?.remove();
			const updatedGrades = allGrades.filter((course: CalculatorCourse) => course.num !== courseNum);
			await chrome.storage.local.set({grades: updatedGrades});
			handleStorageError("delete_grade");
			break;
	}
	updateAllStats();
}

/**
 * Validates course input data, for both form and CSV inputs.
 * @param {CalculatorCourse} course - The course object to validate.
 * @returns {{isValid: boolean, message: string}} - An object indicating validity and a message if invalid.
 */
function validateCourseInput(course: CalculatorCourse): {isValid: boolean; message: string} {
	if (!/^[0-9A-Za-z]{8}$/.test(course.num.toString())) {
		return {isValid: false, message: "מספר הקורס חייב להיות בן 8 תווים (ספרות או אותיות)."};
	}
	if (!course.name || course.name.length === 0) {
		return {isValid: false, message: "שם הקורס אינו יכול להיות ריק."};
	}
	if (Number.isNaN(Number(course.points)) || parseInt(course.points.toString()) < 0) {
		return {isValid: false, message: "נא לכתוב מספר נקודות זכות תקין (מספר חיובי)."};
	}
	if (
		!course.binary &&
		(Number.isNaN(Number(course.grade)) ||
			parseInt(course.grade.toString()) < 0 ||
			parseInt(course.grade.toString()) > 100)
	) {
		return {isValid: false, message: "נא להזין ציון מספרי תקין בין 0 ל-100."};
	}
	if (
		course.binary &&
		!["עובר", "נכשל", "פטור", "פטור עם ניקוד", "פטור ללא ניקוד"].includes(course.grade.toString())
	) {
		return {isValid: false, message: "נא לבחור 'עובר' או 'נכשל' עבור ציון בינארי."};
	}
	if (course.year && (Number.isNaN(Number(course.year)) || course.year < 1912 || course.year > 65537)) {
		return {isValid: false, message: "שנה לא תקינה."};
	}
	if (course.semester && !Object.hasOwn(semesterOrder, course.semester)) {
		return {isValid: false, message: "סמסטר לא תקין."};
	}
	return {isValid: true, message: "Valid"};
}

function setUpButtons() {
	const binary_checkbox = document.getElementById("binaryEh") as HTMLInputElement,
		gradeInput = document.getElementById("grade") as HTMLInputElement,
		gradeLabel = document.getElementById("grade_label") as HTMLLabelElement,
		binaryGradeInput = document.getElementById("binary_grade") as HTMLInputElement,
		binaryGradeLabel = document.getElementById("binary_grade_label") as HTMLLabelElement;

	binary_checkbox.addEventListener("change", () => {
		gradeInput.hidden = binary_checkbox.checked;
		gradeLabel.hidden = binary_checkbox.checked;
		binaryGradeInput.hidden = !binary_checkbox.checked;
		binaryGradeLabel.hidden = !binary_checkbox.checked;
	});

	const now = new Date();
	const currentMonth = now.getMonth() + 1,
		currentYear = now.getFullYear();
	(document.getElementById("semester") as HTMLSelectElement).value =
		currentMonth <= 4 ? "חורף" : currentMonth >= 4 && currentMonth <= 8 ? "אביב" : "קיץ";
	(document.getElementById("year") as HTMLInputElement).value = currentYear.toString();

	const addGradeForm = document.getElementById("add_grade_form") as HTMLFormElement;
	addGradeForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const formData = new FormData(addGradeForm);
		const {num, name, points, binaryEh, grade, binary_grade, year, semester} = Object.fromEntries(formData) as {
			[key: string]: string;
		};

		const newCourse: CalculatorCourse = {
			num: num.trim(),
			name: name.trim(),
			points: parseFloat(points),
			binary: binaryEh === "on",
			grade: binaryEh === "on" ? binary_grade.trim() : parseFloat(grade),
			year: parseInt(year, 10),
			semester: semester.trim() as Semester,
			perm_ignored: false,
			selected: false,
		};

		const validationResult = validateCourseInput(newCourse);
		if (!validationResult.isValid) {
			alert(validationResult.message);
			addGradeForm.classList.add("failed");
			setTimeout(() => addGradeForm.classList.remove("failed"), 1000);
			return;
		}

		const storageData = (await chrome.storage.local.get({grades: []})) as StorageData;
		if (storageData.grades.some((course) => course.num === newCourse.num)) {
			alert(`קורס עם המספר ${newCourse.num} כבר קיים ברשימה.`);
			addGradeForm.classList.add("failed");
			setTimeout(() => addGradeForm.classList.remove("failed"), 1000);
			return;
		}
		storageData.grades.push(newCourse);
		await chrome.storage.local.set({grades: storageData.grades});
		handleStorageError("add_grade");
		const newRow = createCourseRowElement(newCourse, "grades_list");
		document.getElementById("grades_list")?.querySelector("tbody")?.prepend(newRow);

		const latestYear = storageData.grades.reduce(
			(acc: number, course: CalculatorCourse) => Math.max(acc, course.year),
			1912
		);
		const latestSemesterOrder = storageData.grades
			.filter((course: CalculatorCourse) => course.year === latestYear)
			.reduce(
				(maxOrder: number, course: CalculatorCourse) => Math.max(maxOrder, semesterOrder[course.semester]),
				0
			);
		const latestSemester = Object.keys(semesterOrder).find(
			(key) => semesterOrder[key as Semester] === latestSemesterOrder
		);
		if (newCourse.year === latestYear && newCourse.semester === latestSemester) {
			newRow.classList.add("selected");
			(newRow.querySelector("input[type='checkbox']") as HTMLInputElement).checked = true;
			newCourse.selected = true;
		}
		updateAllStats();

		addGradeForm.reset();
		binary_checkbox.dispatchEvent(new Event("change"));
		(document.getElementById("semester") as HTMLSelectElement).value =
			currentMonth <= 4 ? "חורף" : currentMonth >= 4 && currentMonth <= 8 ? "אביב" : "קיץ";
	});

	(document.getElementById("export") as HTMLInputElement).addEventListener("click", () => {
		if (document.querySelectorAll("#grades_list tbody tr").length === 0) {
			alert("אין קורסים לייצא. תתחילו בלהוסיף קורסים למחשבון.");
			return;
		}

		let csvContent = `מספר קורס,שם קורס,נק"ז,ציון,סמסטר,שנה\n`;
		document.querySelectorAll("#grades_list tbody tr").forEach((row) => {
			const cells = Array.from(row.querySelectorAll("td"));
			const courseNum = cells[0].textContent;
			const courseName = cells[1].textContent;
			const points = cells[2].querySelector("input")?.value || "0";
			const grade = cells[3].querySelector("input")?.value || cells[3].querySelector("span")?.textContent || "";
			const semester = cells[4].textContent;
			const year = cells[5].textContent;

			const escapeCsv = (str: string) =>
				str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
			csvContent += `${courseNum},${escapeCsv(courseName)},${points},${grade},${semester},${year}\n`;
		});

		const downloadLink = document.createElement("a");
		const csvBlob = new Blob(["\ufeff", csvContent], {type: "text/csv;charset=utf-8;"});
		downloadLink.href = window.URL.createObjectURL(csvBlob);
		downloadLink.download = "ציונים_" + Date.now() + ".csv";
		downloadLink.click();
		downloadLink.remove();
	});

	(document.getElementById("import") as HTMLInputElement).addEventListener("click", () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".csv, application/pdf";
		input.onchange = (event) => {
			const target = event.target as HTMLInputElement;
			if (!target) return;
			const file = target.files?.[0];
			if (!file) return;

			function smallValidate(
				currentStoredGrades: CalculatorCourse[],
				newCourses: CalculatorCourse[],
				course: CalculatorCourse,
				line: string
			) {
				const validationResult = validateCourseInput(course);
				if (!validationResult.isValid) {
					console.warn(`Validation failed for row: ${line} - ${validationResult.message}`);
					return false;
				}

				if (
					currentStoredGrades.some((c: CalculatorCourse) => c.num === course.num) ||
					newCourses.some((c: CalculatorCourse) => c.num === course.num)
				) {
					console.log(`Skipping duplicate course during import: ${course.num}`);
					return false;
				}
				return true;
			}

			async function commitToStorage(currentStoredGrades: CalculatorCourse[]) {
				if (newCourses.length > 0) {
					currentStoredGrades.push(...newCourses);
					await chrome.storage.local.set({grades: currentStoredGrades});
					handleStorageError("import_grade");
					await renderAllCourses();
					alert("הייבוא הושלם!");
				} else alert("לא נמצאו קורסים תקינים לייבוא מהקובץ.");
			}

			const newCourses: CalculatorCourse[] = [];
			if (file.name.endsWith(".csv")) {
				const reader = new FileReader();
				reader.readAsText(file, "UTF-8");
				reader.onload = async (event) => {
					const lines = (event?.target?.result as string)
						?.split("\n")
						.filter((line) => line.trim() !== "")
						.slice(1);
					const storageData = (await chrome.storage.local.get({grades: []})) as StorageData;
					const currentStoredGrades = storageData.grades;

					lines.forEach((line) => {
						const parts = [];
						let currentField = "",
							charIndex = 0,
							inQuote = false;

						while (charIndex < line.length) {
							const char = line[charIndex],
								nextChar = line[charIndex + 1];

							if (char === '"') {
								if (inQuote && nextChar === '"') {
									// An escaped double quote ("")
									currentField += '"';
									charIndex++;
								} else {
									// Start or end of a quoted field
									inQuote = !inQuote;
								}
							} else if (char === ",") {
								if (inQuote) {
									// Comma inside a quoted field
									currentField += char;
								} else {
									// Comma outside a quoted field
									parts.push(currentField);
									currentField = "";
								}
							} else currentField += char;
							charIndex++;
						}
						parts.push(currentField);

						if (parts.length !== 6) {
							console.warn(
								"Skipping malformed row (incorrect number of columns) during csv import:",
								line
							);
							return;
						}

						const gradeStr = parts[3].trim();
						const binaryEh = Number.isNaN(parseFloat(gradeStr));
						const csvCourse: CalculatorCourse = {
							num: parts[0].trim(),
							name: parts[1].trim(),
							points: parseFloat(parts[2].trim()),
							grade: binaryEh ? gradeStr : parseFloat(gradeStr),
							semester: parts[4].trim() as Semester,
							year: parseInt(parts[5].trim(), 10),
							binary: binaryEh,
							perm_ignored: false,
							selected: false,
						};

						if (smallValidate(currentStoredGrades, newCourses, csvCourse, line)) newCourses.push(csvCourse);
					});

					await commitToStorage(currentStoredGrades);
				};
			} else if (file.name.endsWith(".pdf")) {
				const reader = new FileReader();
				reader.readAsArrayBuffer(file);
				reader.onload = async (event) => {
					const pdfjsPath = "lib/pdfjs/";
					const pdfjs = await import(chrome.runtime.getURL(pdfjsPath + "pdf.min.mjs"));
					pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(pdfjsPath + "pdf.worker.min.mjs");

					const pdf = await pdfjs.getDocument(new Uint8Array(event?.target?.result as ArrayBuffer)).promise;
					let text = "";
					for (let i = 1; i <= pdf.numPages; i++) {
						const page = await pdf.getPage(i);
						const content = await page.getTextContent();
						text += content.items.map((item: {str: string}) => item.str).join(" ") + "\n";
					}
					const lines = text
						// Add a line break before any sequence of 6 or more digits not preceded by a line break
						.replace(/([^\n])(\d{6,})/g, "$1\n$2")
						.replace(/([^\n])(נקודות מצטברות)/g, "$1\n$2")
						.replace(/([^\n])(\d+(?:.\d+)?\s*נקודות רישום:)/g, "$1\n$2")
						// Split the text into lines
						.split("\n")
						.map((line) => line.trim())
						// Filter out empty lines
						.filter((line) => line.length > 0);
					// Remove the last part of the last line
					lines[lines.length - 1] = lines[lines.length - 1]
						.substring(0, lines[lines.length - 1].indexOf("סוף תעודת הציונים"))
						.trim();

					const coursePattern =
						/^(\d{6}|\d{8}) ([\w\s\p{P}\u0590-\u05FF]+?) (1?\d(?:\.\d)? |20(?:\.0)? |)(\d{1,3}|עובר|לא עובר|פטור ללא ניקוד|פטור עם ניקוד|פטור) \d{4}-(\d{4}) (חורף|אביב|קיץ) ([\u0590-\u05FF]{3}"[\u0590-\u05FF]+)$/u;
					const storageData = (await chrome.storage.local.get({grades: []})) as StorageData;
					const currentStoredGrades = storageData.grades;

					lines.forEach((line) => {
						const parts = coursePattern.exec(line);

						if (!parts) {
							console.warn("Skipping malformed row (regex didn't match) during PDF import:", line);
							return;
						}

						const gradeStr = parts[4].trim();
						const binaryEh = Number.isNaN(parseFloat(gradeStr));
						const pdfCourse: CalculatorCourse = {
							num: parts[1].trim(),
							name: parts[2].trim(),
							points: parts[3] ? parseFloat(parts[3].trim()) : 0,
							grade: binaryEh ? gradeStr.trim() : parseFloat(gradeStr),
							semester: parts[6].trim() as Semester,
							year: parseInt(parts[5].trim(), 10),
							binary: binaryEh,
							perm_ignored: false,
							selected: false,
						};

						if (smallValidate(currentStoredGrades, newCourses, pdfCourse, line)) newCourses.push(pdfCourse);
					});

					await commitToStorage(currentStoredGrades);
				};
			} else {
				alert("נא לבחור קובץ csv, Excel או pdf.");
			}
		};
		input.click();
	});

	document.getElementById("delete_grades")?.addEventListener("click", async () => {
		const sureEh = confirm("האם אתה בטוח שברצונך למחוק את כל הציונים מזיכרון התוסף? פעולה זו אינה הפיכה!");
		if (!sureEh) return;

		await chrome.storage.local.set({grades: []});
		if (!handleStorageError("delete_all_grades")) {
			document.getElementById("grades_list")!.querySelector("tbody")!.innerHTML = "";
			document.getElementById("ignore_list")!.querySelector("tbody")!.innerHTML = "";
			updateAllStats();
			alert("כל הציונים נמחקו בהצלחה.");
		} else alert("אירעה שגיאה בעת מחיקת הציונים. אנא רעננו את העמוד ונסו שנית.");
	});

	(document.getElementById("grades_list") as HTMLTableElement).addEventListener("click", handleGradesListClick);
	(document.getElementById("ignore_list") as HTMLTableElement).addEventListener("click", handleIgnoreListClick);

	(document.getElementById("select_all_courses") as HTMLInputElement).addEventListener(
		"change",
		handleSelectAllClick
	);
}

async function renderAllCourses() {
	const storageData = (await chrome.storage.local.get({grades: []})) as StorageData;
	const allGrades = storageData.grades;
	let latestYear = 1912,
		latestSemesterOrder = 0;

	if (allGrades.length > 0) {
		latestYear = allGrades.reduce((acc: number, course: CalculatorCourse) => Math.max(acc, course.year), 1912);
		latestSemesterOrder = allGrades
			.filter((course: CalculatorCourse) => course.year === latestYear)
			.reduce(
				(maxOrder: number, course: CalculatorCourse) => Math.max(maxOrder, semesterOrder[course.semester]),
				0
			);
	}
	const latestSemester = Object.keys(semesterOrder).find(
		(key) => semesterOrder[key as Semester] === latestSemesterOrder
	);

	const gradesToPersist = allGrades.map((course: CalculatorCourse) => {
		course.selected = course.semester === latestSemester && course.year === latestYear;
		return course;
	});

	await chrome.storage.local.set({grades: gradesToPersist});
	handleStorageError("initial_selection_update");

	const lists = {
		grades_list: storageData.grades.filter((course: CalculatorCourse) => !course.perm_ignored),
		ignore_list: storageData.grades.filter((course: CalculatorCourse) => course.perm_ignored),
	};

	for (const listKey in lists) {
		document.getElementById(listKey)!.querySelector("tbody")!.innerHTML = "";
		const fragment = document.createDocumentFragment();
		const sortedData: CalculatorCourse[] = [...lists[listKey as "grades_list" | "ignore_list"]].sort(
			(a: CalculatorCourse, b: CalculatorCourse) =>
				a.year - b.year ||
				semesterOrder[a.semester] - semesterOrder[b.semester] ||
				parseInt(a.num) - parseInt(b.num)
		);
		sortedData.forEach((courseData: CalculatorCourse) => {
			const rowElement = createCourseRowElement(courseData, listKey);
			fragment.prepend(rowElement);
		});
		document.getElementById(listKey)?.querySelector("tbody")?.appendChild(fragment);
	}
	updateAllStats();
}

// Initial setup and data load
const storageData = (await chrome.storage.local.get({theme: "light"})) as StorageData;
resolveTheme(storageData.theme);
document.getElementById("goToSettings")?.addEventListener("click", () => chrome.runtime.openOptionsPage());
setUpButtons();
await renderAllCourses();
