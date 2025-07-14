'use strict';

let gradesList = [], ignoredList = [];
const semesterOrder = {
	"חורף": 1,
	"אביב": 2,
	"קיץ": 3
};

function sorter(list) {
	return list.sort((a, b) =>
		a.year - b.year || semesterOrder[a.semester] - semesterOrder[b.semester] || a.num - b.num
	);
}

function calculateTableStats(tableSelector) {
	const gradeElements = document.querySelectorAll(`${tableSelector} .grade`),
		pointsElements = document.querySelectorAll(`${tableSelector} .points`);
	let sum = 0, totalPoints = 0, pointsForAverage = 0, pointsWithPassingGrade = 0;

	for (let i = 0; i < gradeElements.length; i++) {
		const points = parseFloat(pointsElements[i].value);
		let grade = parseInt(gradeElements[i].value);
		if (isNaN(grade)) {
			grade = gradeElements[i].textContent;
			totalPoints += points;
			pointsWithPassingGrade += grade === "עובר" ? points : 0;

		} else {
			totalPoints += points;
			pointsWithPassingGrade += 55 <= grade ? points : 0;
			sum += points * grade;
			pointsForAverage += points;
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
	const selectedTableCells = document.querySelectorAll("#selected_tbl .maor_table_row div"),
		selectedStats = calculateTableStats(".selected");
	selectedTableCells[1].textContent = selectedStats.count !== 1 ? `${selectedStats.count} קורסים` : "קורס 1";
	selectedTableCells[3].textContent = selectedStats.avg;
	selectedTableCells[5].textContent = selectedStats.points.toString();
	selectedTableCells[7].textContent = selectedStats.points_passed.toString();
}

function updateAllStats() {
	const allGradesStats = calculateTableStats("#grades_list"),
		allPointsElements = document.querySelectorAll("#grades_list .maor_table_row .points"),
		passingPointsElements = document.querySelectorAll("#grades_list .maor_table_row:not(.failed) .points"),
		totalPoints = Array.from(allPointsElements)
			.reduce((sum, element) => sum + parseFloat(element.value), 0),
		totalPassingPoints = Array.from(passingPointsElements)
			.reduce((sum, element) => sum + parseFloat(element.value), 0);
	document.getElementById("avg_grade").textContent = allGradesStats.avg;
	document.getElementById("total_points").textContent = allGradesStats.points_passed.toString();
	document.getElementById("success_rate").textContent = totalPoints ? (100 * totalPassingPoints / totalPoints).toFixed(2) : 0;
	updateSelectedCoursesStats();
}

function addCourseRow(courseData, mainList) {
	const templateContent = document.querySelector(`#${mainList} template`).content.cloneNode(true);
	const rowElement = templateContent.querySelector(".maor_table_row");

	rowElement.classList.add("animate");
	if (courseData.grade < 55 || courseData.grade === "נכשל") rowElement.classList.add("failed");
	if (courseData.perm_ignored) rowElement.classList.add("ignored");

	const cellElements = rowElement.querySelectorAll("div");
	cellElements[0].textContent = courseData.num;
	cellElements[1].textContent = courseData.name;
	cellElements[2].querySelector(".points").value = courseData.points;
	cellElements[4].textContent = courseData.semester;
	cellElements[5].textContent = courseData.year;
	const [gradeInput, editButton] = cellElements[3].querySelectorAll("div > *");
	if (isNaN(courseData.grade)) {
		const gradeText = document.createElement("span");
		gradeText.classList.add('grade');
		gradeInput.replaceWith(gradeText);
		gradeText.textContent = courseData.grade;
		rowElement.classList.toggle("failed", gradeText.textContent === "נכשל");
		if (editButton) editButton.remove();
	} else gradeInput.value = courseData.grade;
	if (mainList === "grades_list") {
		editButton.addEventListener("click", () => {
			if (gradeInput.disabled) {
				gradeInput.disabled = false;
				editButton.textContent = "אישור";
				gradeInput.focus();
			} else if (0 <= gradeInput.value && 100 >= gradeInput.value) {
				gradeInput.disabled = true;
				editButton.textContent = "ערוך";
				rowElement.classList.toggle("failed", gradeInput.value <= 55);
				if (!rowElement.className.includes("temporary") && gradeInput.value !== courseData.grade) {
					rowElement.classList.add("temporary");
					rowElement.classList.add("animate");
					rowElement.querySelectorAll("div")[4].textContent = "-";
					rowElement.querySelectorAll("div")[5].textContent = "-";
					addCourseRow(courseData, "ignore_list");
				}
				updateAllStats();
			}
		});

		const checkbox = rowElement.querySelector("input[type='checkbox']");
		if (courseData.selected) {
			rowElement.classList.add("selected");
			checkbox.checked = true;
		}
		checkbox.addEventListener("change", () => {
			checkbox.checked ? rowElement.classList.add("selected") : rowElement.classList.remove("selected");
			updateSelectedCoursesStats();
		});
	}

	const buttons = rowElement.querySelectorAll(".center button"),
		antiList = mainList === "grades_list" ? "ignore_list" : "grades_list";
	if (antiList === "ignore_list") {
		for (let btnIndex = 0; btnIndex < buttons.length; btnIndex++) {
			buttons[btnIndex].addEventListener("click", () => {
				if (!rowElement.className.includes("temporary")) {
					const newRowElement = addCourseRow(courseData, antiList);
					if (btnIndex) {
						courseData.perm_ignored = true;
						newRowElement.classList.add("ignored");
						chrome.storage.local.get({grades: []}, storage => {
							for (let i = 0; i < storage.grades.length; i++) {
								if (storage.grades[i].num === courseData.num) {
									storage.grades[i].perm_ignored = true;
									break;
								}
							}
							chrome.storage.local.set({grades: storage.grades}, () => {
								if (chrome.runtime.lastError)
									console.error("TE_calculator_ignore_grade: " + chrome.runtime.lastError.message);
							});
						});
					}
				}
				rowElement.remove();
				updateAllStats();
			});
		}
	} else {
		buttons[0].addEventListener("click", () => {
			const newRowElement = addCourseRow(courseData, antiList);
			if (courseData.perm_ignored) {
				courseData.perm_ignored = false;
				newRowElement.classList.remove("ignored");
				chrome.storage.local.get({grades: []}, storage => {
					for (let i = 0; i < storage.grades.length; i++) {
						if (storage.grades[i].num === courseData.num) {
							storage.grades[i].perm_ignored = false;
							break;
						}
					}
					chrome.storage.local.set({grades: storage.grades}, () => {
						if (chrome.runtime.lastError)
							console.error("TE_calculator_ignore_grade: " + chrome.runtime.lastError.message);
					});
				});
			}
			rowElement.remove();

			// Remove the temporary row, if needed, by checking the course numbers
			const tempRows = document.querySelectorAll(`#${antiList} .temporary`);
			for (const tempRow of tempRows) {
				if (tempRow.querySelector("div").textContent === courseData.num) {
					tempRow.remove();
					break;
				}
			}

			// Select the row if needed
			const selectedTableCells = document.querySelectorAll(".selected div");
			if (selectedTableCells[4]?.textContent === courseData.semester &&
				selectedTableCells[5]?.textContent === courseData.year) {
				newRowElement.classList.add("selected");
				newRowElement.querySelector("input[type='checkbox']").checked = true;
			}
			updateAllStats();
		});
		buttons[1].addEventListener("click", () => {
			const sureEh = confirm("האם אתה בטוח שברצונך למחוק את הקורס הזה?");
			if (!sureEh) return;

			rowElement.remove();
			chrome.storage.local.get({grades: []}, storage => {
				for (let i = 0; i < storage.grades.length; i++) {
					if (storage.grades[i].num === courseData.num) {
						storage.grades.splice(i, 1);
						break;
					}
				}
				chrome.storage.local.set({grades: storage.grades}, () => {
					if (chrome.runtime.lastError)
						console.error("TE_calculator_delete_grade: " + chrome.runtime.lastError.message);
				});
			});
			updateAllStats();
		});
	}

	document.getElementById(mainList).appendChild(templateContent);
	return rowElement;
}

chrome.storage.local.get({dark_mode: false, grades: []}, storage => {
	// Ease on the eyes
	document.body.classList.toggle("dark-mode", storage.dark_mode);

	// Differentiate between ignored and regular courses
	[gradesList, ignoredList] = storage.grades.reduce((lists, course) => {
		lists[course.perm_ignored ? 1 : 0].push(course);
		return lists;
	}, [[], []]).map(sorter);

	// Add course data to appropriate lists
	for (let course of gradesList.reverse()) addCourseRow(course, "grades_list");
	for (let course of ignoredList.reverse()) addCourseRow(course, "ignore_list");

	// Auto-select latest semester and year courses
	const latestYear = storage.grades.reduce((acc, course) => Math.max(acc, course.year), 1912).toString();
	const latestSemester = storage.grades.findLast(course => course.year === latestYear)?.semester;
	document.querySelectorAll("#grades_list .maor_table_row").forEach(row => {
		const cells = row.querySelectorAll("div");
		if (cells[5].textContent === latestYear && cells[4].textContent === latestSemester) {
			row.classList.add("selected");
			row.querySelector("input[type='checkbox']").checked = true;
		}
	});

	updateAllStats();
});

// Handle regular vs binary grades (and form resets)
const binary_checkbox = document.getElementById("binaryEh");
binary_checkbox.addEventListener("change", () => {
	const gradeInput = document.getElementById("grade"),
		gradeLabel = document.getElementById("grade_label"),
		binaryGradeInput = document.getElementById("binary_grade"),
		binaryGradeLabel = document.getElementById("binary_grade_label");
	gradeInput.hidden = binary_checkbox.checked;
	gradeLabel.style.display = binary_checkbox.checked ? "none" : "block";
	binaryGradeInput.hidden = !binary_checkbox.checked;
	binaryGradeLabel.style.display = !binary_checkbox.checked ? "none" : "block";
});

// Handle new grades
const addGradeForm = document.getElementById("add_grade_form");
addGradeForm.addEventListener("submit", event => {
	event.preventDefault();
	const formData = new FormData(addGradeForm);
	const newCourse = {
		num: formData.get("num"),
		name: formData.get("name"),
		points: formData.get("points"),
		binary: binary_checkbox.checked,
		grade: binary_checkbox.checked ? formData.get("binary_grade") : formData.get("grade"),
		year: formData.get("year"),
		semester: formData.get("semester"),
	};

	if (!newCourse.name || !newCourse.points) {
		addGradeForm.classList.add("failed");
		setTimeout(() => addGradeForm.classList.remove("failed"), 1000);
		return;
	}

	if (isNaN(parseFloat(newCourse.num)) || newCourse.num.length !== 8) {
		alert("נא לכתוב מספר קורס תקין.")
		addGradeForm.classList.add("failed");
		setTimeout(() => addGradeForm.classList.remove("failed"), 1000);
		return;
	}

	addCourseRow(newCourse, "grades_list");
	chrome.storage.local.get({grades: []}, storage => {
		storage.grades.push(newCourse);
		chrome.storage.local.set({grades: storage.grades}, () => {
			if (chrome.runtime.lastError)
				console.error("TE_calculator_add_grade: " + chrome.runtime.lastError.message);
		});
	});
	updateAllStats();
	addGradeForm.reset();
	binary_checkbox.dispatchEvent(new Event('change'));
});

// Set up CSV export
document.getElementById("to_csv").addEventListener("click", () => {
	let csvContent = `מספר קורס,שם קורס,נק"ז,ציון,סמסטר,שנה\n`;
	document.querySelectorAll("#grades_list div.maor_table_row").forEach(row => {
		const cells = Array.from(row.querySelectorAll("div"));
		console.log(cells);
		csvContent += `${cells[0].textContent},${cells[1].textContent},${cells[2].querySelector("input").value},`
			+ `${cells[3].querySelector("input")?.value || cells[3].querySelector("span").textContent},`
			+ `${cells[4].textContent},${cells[5].textContent}\n`;
	});

	const downloadLink = document.createElement("a");
	const csvBlob = new Blob(["\ufeff", csvContent], {type: "text/csv"});
	downloadLink.href = window.URL.createObjectURL(csvBlob);
	downloadLink.download = "ציונים_" + Date.now() + ".csv";
	downloadLink.click();
	downloadLink.remove();
});
