'use strict';
(function () {
	function v(a, c, d) {
		if (!(0 < c.getElementsByClassName("maor_download").length)) {
			var b = document.createElement("a");
			b.setAttribute("class", "maor_download");
			b.textContent = "הורדה";
			var g = "https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/" + a + ".mp4";
			b.addEventListener("click", function () {
				chrome.runtime.sendMessage({mess_t: "singledownload", link: g, name: d})
			});
			a = document.createElement("br");
			c.appendChild(a);
			c.appendChild(b);
			if (window.location.href.includes("folderID")) {
				b = document.createElement("label");
				b.setAttribute("class", "maor_download");
				a = document.createElement("div");
				a.textContent = "בחר";
				var e = document.createElement("input");
				e.setAttribute("type", "checkbox");
				e.className = "maor_check";
				a.appendChild(e);
				b.appendChild(a);
				c.appendChild(b)
			}
		}
	}

	async function w() {
		var a = decodeURIComponent(window.location.href).split('folderID="')[1].split('"')[0],
			c = document.getElementById("contentHeaderText").textContent.replace(/[0-9]{4,}[swi]: /, "")
				.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "") + "/";
		const response =
			await fetch("https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Podcast.ashx?courseid=" + a + "&type=mp4");
		if (4 === response.readyState)
			if (200 === response.status) {
				var b = response.response.getElementsByTagName("item"), g = {sys: 1, sub_pre: "", list: []};
				for (let e = 0; e < b.length; e++) {
					let h = {};
					h.u = b[e].getElementsByTagName("guid")[0].textContent.split("/Syndication/")[1];
					h.n = c + b[e].getElementsByTagName("title")[0].textContent.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g,
						"").replace(/\s\s+/g, " ") + ".mp4";
					g.list.push(h)
				}
				0 < g.list.length && chrome.runtime.sendMessage({mess_t: "multidownload", chunk: g})
			} else window.alert("שגיאה בניסיון הורדת הקורס, אנא נסה שנית מאוחר יותר.")
	}

	function t(a, c) {
		a.setAttribute("class", "hidden-command-button");
		c.setAttribute("class", "hidden-command-button");
		if (!1 !== window.location.href.includes("folderID")) {
			var d = decodeURIComponent(window.location.href).split('folderID="')[1].split('"')[0];
			fetch(`https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Podcast.ashx?courseid=${d}&type=mp4`)
				.then(b => b.text())
				.then(b => (new DOMParser).parseFromString(b, "text/xml"))
				.then(b => {
					if (0 != b.getElementsByTagName("item").length) {
						a.setAttribute("class",
							"maor_panopto_action css-fehuet");
						a.setAttribute("style", "margin-right: 8px");
						c.setAttribute("class", "maor_panopto_action css-fehuet");
						c.setAttribute("style", "margin-right: 8px");
						var g = setInterval(() => {
							if ("none" == document.getElementById("loadingMessage").style.display && 0 < document.getElementsByClassName("thumbnail-link").length && "none" != document.getElementsByClassName("thumbnail-link")[0].style.display) {
								clearInterval(g);
								var e = document.getElementById("listViewContainer").getElementsByTagName("tr");
								for (let f = 0; f < e.length - 1; f++) {
									var h = e[f].getAttribute("id"), p = e[f].getElementsByClassName("item-title")[0],
										l = p.textContent.trim().replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4";
									v(h, p, l)
								}
							}
						}, 2E3)
					}
				}).catch(err => console.log(err))
		}
	}

	function u(a) {
		if (1 == a.cssRules.length) ["#viewer {background-color: #000 !important;}", "#viewerHeader, .transport-button, #timeElapsed, #timeRemaining, #positionControl, .viewer .transport-button .clicked, #volumeFlyout, #playSpeedExpander, #qualityButton, #qualityExpander, #inlineMessageLetterbox, .next-delivery-thumb, #thumbnailList, #thumbnailList img, .thumbnail-timestamp {filter:invert(1);}",
			"#leftPane aside {background-color: #eee; filter: invert(1);}", "#leftPane {background-color: #111;}", "#playControlsWrapper {background-color: #000;}", "#playControls {background-color: #000; border-top: 1px solid #555; opacity: 0.8;}", "#playControls:hover, #playControls:focus {opacity: 1;}", "#thumbnailList {background-color: #eee;}", "#leftPane #eventTabs #eventTabControl .event-tab-header{filter:invert(0.05);}", "#leftPane #searchRegion input {background-color: transparent}", "#transportControls {background-color: transparent !important; border-left-color: #0c0c0d !important;}",
			"#playSpeedExpander > div, #qualityExpander > div {filter: none !important;}", "#thumbnailList img {opacity: 0.5;}", "#thumbnailList img:hover{opacity:1}"].forEach(function (c) {
			a.insertRule(c, 0)
		}); else for (; 1 < a.cssRules.length;) a.deleteRule(0)
	}

	function q(a) {
		var c = {};
		switch (a) {
			case "showhide":
				c.panopto_hide = "true" == document.getElementById("toggleThumbnailsButton").getAttribute("aria-expanded") ? !1 : !0;
				break;
			case "darkmode":
				c.panopto_light = document.getElementById("m_darkmode").checked;
				break;
			case "speed":
				c.panopto_speed = document.querySelector(".play-speed.selected").id;
				break;
			case "settings":
				c.panopto_save = document.getElementById("m_save").checked
		}
		chrome.storage.local.set(c, () => {
			chrome.runtime.lastError && console.log("TE_panopto_3: " + chrome.runtime.lastError.message)
		})
	}

	function x(a) {
		chrome.storage.local.get({
			panopto_speed: "Normal",
			panopto_light: !1,
			panopto_hide: !1,
			panopto_save: !0
		}, c => {
			chrome.runtime.lastError && console.log("TE_panopto_2: " + chrome.runtime.lastError.message);
			if (c.panopto_save) {
				document.getElementById("m_save").checked =
					c.panopto_save;
				c.panopto_light && u(a);
				document.getElementById("m_darkmode").checked = c.panopto_light;
				var d = setInterval(() => {
					if (document.getElementById("Faster")) {
						clearInterval(d);
						c.panopto_hide && "none" != document.getElementById("toggleThumbnailsButton").style.display
						&& document.getElementById("toggleThumbnailsButton").click();
						document.getElementById(c.panopto_speed).click();
						var b = document.getElementsByClassName("play-speed");
						for (let g of b) g.addEventListener("click", () => {
							q("speed");
							var e = document.querySelector(".maor_selected");
							e && e.classList.remove("maor_selected")
						});
						document.getElementById("toggleThumbnailsButton").addEventListener("click", () => {
							q("showhide")
						})
					}
				}, 2E3)
			}
		})
	}

	function y() {
		var a = document.querySelectorAll("#listViewContainer tr.list-view-row"),
			c = document.getElementById("contentHeaderText").textContent.replace(/[0-9]{4,}[swi]: /, "").replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "") + "/",
			d = {sys: 1, sub_pre: "", list: []};
		for (let b = 0; b < a.length; b++) {
			if (!a[b].querySelector(".maor_check").checked) continue;
			let g = {};
			g.u = a[b].id +
				".mp4";
			g.n = c + a[b].querySelector("a.detail-title").textContent.trim().replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4";
			d.list.push(g)
		}
		0 < d.list.length && chrome.runtime.sendMessage({mess_t: "multidownload", chunk: d})
	}

	function z() {
		(new MutationObserver(function (a, c) {
			for (var d of a) for (a = 0; a < d.addedNodes.length; a++) {
				let b = d.addedNodes[a];
				if ("function" === typeof b.querySelector && !document.getElementById("new_win") && b.classList.contains("player") && 2 == document.getElementsByClassName("video-js").length) {
					d =
						document.createElement("script");
					d.src = chrome.runtime.getURL("js/panopto_new.js");
					document.body.appendChild(d);
					c.disconnect();
					return
				}
			}
		})).observe(document.getElementById("viewerContent"), {childList: !0, subtree: !0})
	}

	function A() {
		var a = document.getElementById("m_snapshot"), c = document.getElementById("m_vid_list"),
			d = c.getElementsByTagName("canvas"), b = document.getElementsByClassName("video-js"), g = function (f) {
				d[f].width = 28 / b[f].videoHeight * b[f].videoWidth;
				d[f].height = 28;
				d[f].getContext("2d").drawImage(b[f],
					0, 0, b[f].videoWidth, b[f].videoHeight, 0, 0, d[f].width, d[f].height)
			};
		c.getElementsByTagName("span")[2].addEventListener("click", () => {
			c.className = "maor_hidden";
			document.getElementById("maor_menu").classList.remove("start", "overlaid")
		});
		var e = document.createElement("canvas"), h = [document.createElement("a"), document.createElement("a")],
			p = new MouseEvent("click", {bubbles: !0, cancelable: !0, view: window}), l = f => {
				e.width = b[f].videoWidth;
				e.height = b[f].videoHeight;
				e.getContext("2d").drawImage(b[f], 0, 0);
				h[f].href =
					e.toDataURL("image/png");
				h[f].download = "snapshot_" + Date.now() + ".png";
				h[f].dispatchEvent(p)
			};
		d[0].addEventListener("click", () => l(0));
		d[1].addEventListener("click", () => l(1));
		a.addEventListener("click", () => {
			g(0);
			2 == b.length ? (document.getElementById("maor_menu").classList.add("start", "overlaid"), c.className = "maor_persist", g(1)) : l(0)
		})
	}

	function B() {
		var a = window.location.href.split("?")[1].split("id=")[1].split("&")[0],
			c = document.title.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, ""),
			d = document.getElementById("m_cant_download"),
			b = {
				3: {
					u: `https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/${a}.mp4?mediaTargetType=audioPodcast`,
					n: c + "_voice.mp4"
				}, 4: {
					u: `https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/${a}.mp4`,
					n: c + ".mp4"
				}
			};
		Object.keys(b).forEach(g => {
			let e = document.getElementById(`m_download_mp${g}`);
			fetch(b[g].u, {method: "head", mode: "no-cors"}).then(h => {
				0 == h.status && (d.classList.add("maor_hidden"), e.classList.remove("maor_hidden"), e.addEventListener("click", function () {
					chrome.runtime.sendMessage({
						mess_t: "singledownload",
						link: b[g].u, name: b[g].n
					})
				}))
			})
		})
	}

	function C() {
		var a = (new DOMParser).parseFromString(
			'\n\t<div id="maor_menu_container">' +
			'\n\t\t<div id="maor_menu" class="start">\n\t\t\t<div id="maor_content">\n\t\t\t\t<div id="maor_overlay">' +
			'</div>\n\t\t\t\t<div id="m_cant_download"><a><i>הורדת ההקלטה נחסמה על ידי צוות הקורס</i></a></div>\n' +
			'\t\t\t\t<a id="m_download_mp4" class="maor_hidden">הורדת הקלטה</a>\n' +
			'\t\t\t\t<a id="m_download_mp3" class="maor_hidden">הורדת שמע</a>\n' +
			'\t\t\t\t<div id="m_vid_list" class="maor_hidden">\n' +
			'\t\t\t\t\t<div>בחר וידאו: </div>\n' +
			'\t\t\t\t\t<span><canvas></canvas></span>\n' +
			'\t\t\t\t\t<span><canvas></canvas></span>\n' +
			'\t\t\t\t\t<span>סגור</span>\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\t\t<a id="m_snapshot">צלם תמונה</a>\n' +
			'\t\t\t\t<a id="m_expand" class="maor_hidden">פצל לשני מסכים</a>\n' +
			'\t\t\t\t<a id="m_float" class="maor_hidden">פתח בחלון צף</a>\n' +
			'\t\t\t\t<a id="m_speed">\n' +
			'\t\t\t\t\t<div><span>2.25</span><span>2.5</span><span>2.75</span><span>3</span></div>\n' +
			'\t\t\t\t\t<span style="display: block">מהירויות נוספות</span>\n' +
			'\t\t\t\t</a>\n' +
			'\t\t\t\t<a id="m_sound">שיפורי שמע</a>\n' +
			'\t\t\t\t<label for="m_darkmode"><a>מצב לילה<input id="m_darkmode" type="checkbox" /></a></label>\n' +
			'\t\t\t\t<label for="m_save"><a>זכור הגדרות<input id="m_save" type="checkbox" /></a></label>\n' +
			'\t\t\t</div>\n' +
			'\t\t\t<div id="maor_koteret">Technion<sup>++</sup></div>\n' +
			'\t\t</div>\n' +
			'\n' +
			'\t\t<div id="maor_sound">\n' +
			'\t\t\t<div class="m_header">\n' +
			'\t\t\t\tשיפורי שמע <sup>BETA</sup>\n' +
			'\t\t\t\t<span id="maor_sound_close">סגור</span>\n' +
			'\t\t\t</div>\n' +
			'\n' +
			'\t\t\t<div class="m_grid">\n' +
			'\n' +
			'\t\t\t\t<div>\n' +
			'\t\t\t\t\tהשימוש באפקטים הבאים עלול להגביר רעשי רקע.\n' +
			'\t\t\t\t\t<span style="display: none"><br />בדפדפן פיירפוקס, השימוש באפקטים הנ"ל ינעל את הרצת הווידאו למהירות x1. כדי לבטל נעילה זו יש לרענן את הדף.</span>\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\t\t<div></div>\n' +
			'\n' +
			'\t\t\t\t<div>\n' +
			'\t\t\t\t\t<b>רמת סינון רעשי רקע</b><br />\n' +
			'\t\t\t\t\tסינון בסיסי, שימושי למשל עבור הקלטות עם "זמזום חשמלי" ברקע.\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\t\t<div>\n' +
			'\t\t\t\t\t<select id="maor_sound_noise">\n' +
			'\t\t\t\t\t\t<option selected value="0">ללא</option>\n' +
			'\t\t\t\t\t\t<option value="1">נמוכה</option>\n' +
			'\t\t\t\t\t\t<option value="2">בינונית</option>\n' +
			'\t\t\t\t\t\t<option value="3">גבוהה</option>\n' +
			'\t\t\t\t\t</select>\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\n' +
			'\t\t\t\t<div>\n' +
			'\t\t\t\t\t<b>תוספת ווליום</b><br />\n' +
			'\t\t\t\t\tשימושי כאשר עוצמת השמע של ההקלטה נמוכה מאוד.\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\t\t<div>\n' +
			'\t\t\t\t\t<select id="maor_sound_volume">\n' +
			'\t\t\t\t\t\t<option selected value="0">ללא</option>\n' +
			'\t\t\t\t\t\t<option value="1">נמוכה</option>\n' +
			'\t\t\t\t\t\t<option value="2">בינונית</option>\n' +
			'\t\t\t\t\t\t<option value="3">גבוהה</option>\n' +
			'\t\t\t\t\t</select>\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\n' +
			'\t\t\t\t<div>\n' +
			'\t\t\t\t\t<b>איזון צלילים</b><br />\n' +
			'\t\t\t\t\tמגביר צלילים נמוכים ומנמיך צלילים גבוהים מאוד. שימושי כאשר איכות ההקלטה לא אחידה.\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\t\t<div>\n' +
			'\t\t\t\t\t<select id="maor_sound_compressor">\n' +
			'\t\t\t\t\t\t<option selected value="0">כבוי</option>\n' +
			'\t\t\t\t\t\t<option value="1">פעיל</option>\n' +
			'\t\t\t\t\t</select>\n' +
			'\t\t\t\t</div>\n' +
			'\t\t\n' +
			'\t\t\t</div>\n' +
			'\t\t\t<div class="m_grid" style="display: none">\n' +
			'\t\t\t\tעקב מגבלות טכניות לא ניתן להשתמש בשיפורי שמע עבור הקלטה זו.\n\t\t\t</div>\n\n\t\t</div>\n\n\t</div>\n\t',
			"text/html").getElementById("maor_menu_container"), c = a.getElementsByTagName("a");
		for (let d of c) d.id && (d.style.backgroundImage = "url(" + chrome.runtime.getURL("icons/panopto_icons/" + d.id.replace(/_mp[34]/, "") + ".svg") + ")");
		document.getElementById("transportControls").appendChild(document.createElement("div")).classList.add("maor_menu_divider", "transport-button");
		document.getElementById("transportControls").appendChild(a);
		document.getElementById("maor_koteret").style.backgroundImage =
			"url(" + chrome.runtime.getURL("icons/technion_plus_plus/icon-16.png").toString() + ")"
	}

	if (!0 === window.location.href.includes("List.aspx")) {
		if (!0 !== window.location.href.includes("query=")) {
			var k = document.querySelector("#actionHeader > div"), m = document.createElement("a");
			m.addEventListener("click", w);
			m.textContent = "הורד את כל הקורס";
			k.insertBefore(m, k.childNodes[0]);
			var n = document.createElement("a");
			n.addEventListener("click", y);
			n.textContent = "הורד פריטים שנבחרו";
			k.insertBefore(n, k.childNodes[1]);
			t(m, n);
			window.addEventListener("hashchange", () => {
				t(m, n)
			})
		}
	} else {
		C();
		B();
		var r = document.head.appendChild(document.createElement("style")).sheet;
		r.insertRule(".player {background-color: #000 !important;}", 0);
		document.getElementById("m_darkmode").addEventListener("change", function () {
			u(r);
			q("darkmode")
		});
		document.getElementById("m_save").addEventListener("change", () => q("settings"));
		document.pictureInPictureEnabled && !document.querySelector(".video-js").disablePictureInPicture &&
		(document.getElementById("m_float").classList.remove("maor_hidden"), document.getElementById("m_float").addEventListener("click", () => {
			document.pictureInPictureElement || document.querySelector(".video-js").requestPictureInPicture()
		}));
		k = document.querySelectorAll("#m_speed span");
		for (let a of k) a.addEventListener("click", () => {
			for (var c of document.querySelectorAll(".video-js")) c.playbackRate = a.textContent;
			(c = document.querySelector(".maor_selected")) && c.classList.remove("maor_selected");
			a.classList.add("maor_selected")
		});
		x(r);
		z();
		A();
		document.getElementById("m_sound").style.display = "none";
		setTimeout(() => document.getElementById("maor_menu").classList.remove("start"), 1500)
	}
})();
