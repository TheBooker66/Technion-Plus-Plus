'use strict';

(function () {
	function t(a, c) {
		a.setAttribute("class", "hidden-command-button");
		c.setAttribute("class", "hidden-command-button");
		if (window.location.href.includes("folderID")) {
			const d = decodeURIComponent(window.location.href).split('folderID="')[1].split('"')[0];
			fetch(`https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Podcast.ashx?courseid=${d}&type=mp4`)
				.then(res => res.text())
				.then(text => (new DOMParser).parseFromString(text, "text/xml"))
				.then(html => {
					if (html.getElementsByTagName("item").length !== 0) {
						a.setAttribute("class", "maor_panopto_action css-fehuet");
						a.setAttribute("style", "margin-right: 8px");
						c.setAttribute("class", "maor_panopto_action css-fehuet");
						c.setAttribute("style", "margin-right: 8px");
						const g = setInterval(() => {
							if ("none" == document.getElementById("loadingMessage").style.display &&
								0 < document.getElementsByClassName("thumbnail-link").length &&
								"none" != document.getElementsByClassName("thumbnail-link")[0].style.display) {
								clearInterval(g);
								const e = document.getElementById("listViewContainer").getElementsByTagName("tr");
								for (let f = 0; f < e.length - 1; f++) {
									const p = e[f].getElementsByClassName("item-title")[0];
									if (p.getElementsByClassName("maor_download").length === 0) {
										const a = document.createElement("a");
										a.setAttribute("class", "maor_download");
										a.textContent = "הורדה";
										a.addEventListener("click", () => {
											chrome.runtime.sendMessage({
												mess_t: "singledownload",
												link: "https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/" + e[f].getAttribute("id") + ".mp4",
												name: p.textContent.trim().replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4"
											});
										});
										const h = document.createElement("br");
										p.appendChild(h);
										p.appendChild(a);
										if (window.location.href.includes("folderID")) {
											const l = document.createElement("label"),
												h = document.createElement("div"),
												e = document.createElement("input");
											l.setAttribute("class", "maor_download");
											e.setAttribute("type", "checkbox");
											h.textContent = "בחר";
											e.className = "maor_check";
											h.appendChild(e);
											l.appendChild(h);
											p.appendChild(l);
										}
									}

								}
							}
						}, 2E3);
					}
				}).catch(err => console.error(err));
		}
	}

	function u(a) {
		if (1 == a.cssRules.length) ["#viewer {background-color: #000 !important;}", "#viewerHeader, .transport-button, #timeElapsed, #timeRemaining, #positionControl, .viewer .transport-button .clicked, #volumeFlyout, #playSpeedExpander, #qualityButton, #qualityExpander, #inlineMessageLetterbox, .next-delivery-thumb, #thumbnailList, #thumbnailList img, .thumbnail-timestamp {filter:invert(1);}", "#leftPane aside {background-color: #eee; filter: invert(1);}", "#leftPane {background-color: #111;}", "#playControlsWrapper {background-color: #000;}", "#playControls {background-color: #000; border-top: 1px solid #555; opacity: 0.8;}", "#playControls:hover, #playControls:focus {opacity: 1;}", "#thumbnailList {background-color: #eee;}", "#leftPane #eventTabs #eventTabControl .event-tab-header{filter:invert(0.05);}", "#leftPane #searchRegion input {background-color: transparent}", "#transportControls {background-color: transparent !important; border-left-color: #0c0c0d !important;}", "#playSpeedExpander > div, #qualityExpander > div {filter: none !important;}", "#thumbnailList img {opacity: 0.5;}", "#thumbnailList img:hover{opacity:1}"]
			.forEach(s => a.insertRule(s, 0)); else for (; 1 < a.cssRules.length;) a.deleteRule(0);
	}

	function q(a) {
		const c = {};
		switch (a) {
			case "showhide":
				c.panopto_hide = "true" !== document.getElementById("toggleThumbnailsButton").getAttribute("aria-expanded");
				break;
			case "darkmode":
				c.panopto_light = document.getElementById("m_darkmode").checked;
				break;
			case "speed":
				c.panopto_speed = document.querySelector(".play-speed.selected").id;
				break;
			case "settings":
				c.panopto_save = document.getElementById("m_save").checked;
		}
		chrome.storage.local.set(c, () => {
			chrome.runtime.lastError && console.error("TE_panopto_3: " + chrome.runtime.lastError.message);
		});
	}

	if (true === window.location.href.includes("List.aspx")) {
		if (true !== window.location.href.includes("query=")) {
			const m = document.createElement("a"), n = document.createElement("a"),
				k = document.querySelector("#actionHeader > div");
			m.addEventListener("click", async () => {
				const a = decodeURIComponent(window.location.href).split('folderID="')[1].split('"')[0],
					c = document.getElementById("contentHeaderText").textContent.replace(/[0-9]{4,}[swi]: /, "")
						.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "") + "/";
				const response =
					await fetch("https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Podcast.ashx?courseid=" + a + "&type=mp4");
				if (4 === response.readyState) if (200 === response.status) {
					const b = response.response.getElementsByTagName("item"), g = {sys: 1, sub_pre: "", list: []};
					for (let e = 0; e < b.length; e++) {
						let h = {};
						h.u = b[e].getElementsByTagName("guid")[0].textContent.split("/Syndication/")[1];
						h.n = c + b[e].getElementsByTagName("title")[0].textContent
							.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4";
						g.list.push(h);
					}
					0 < g.list.length && chrome.runtime.sendMessage({mess_t: "multidownload", chunk: g});
				} else window.alert("שגיאה בניסיון הורדת הקורס, אנא נסה שנית מאוחר יותר.");
			});
			m.textContent = "הורד את כל הקורס";
			n.addEventListener("click", () => {
				const a = document.querySelectorAll("#listViewContainer tr.list-view-row"),
					c = document.getElementById("contentHeaderText").textContent
						.replace(/[0-9]{4,}[swi]: /, "").replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "") + "/",
					d = {sys: 1, sub_pre: "", list: []};
				for (let b = 0; b < a.length; b++) {
					if (!a[b].querySelector(".maor_check").checked) continue;
					let g = {};
					g.u = a[b].id + ".mp4";
					g.n = c + a[b].querySelector("a.detail-title").textContent.trim().replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, "").replace(/\s\s+/g, " ") + ".mp4";
					d.list.push(g);
				}
				0 < d.list.length && chrome.runtime.sendMessage({mess_t: "multidownload", chunk: d});
			});
			n.textContent = "הורד פריטים שנבחרו";
			k.insertBefore(m, k.childNodes[0]);
			k.insertBefore(n, k.childNodes[1]);
			t(m, n);
			window.addEventListener("hashchange", () => {
				t(m, n);
			});
		}
	} else {
		const menu = (new DOMParser).parseFromString(`
\t<div id="maor_menu_container">
\t\t<div id="maor_menu" class="start">
\t\t\t<div id="maor_content">
\t\t\t\t<div id="maor_overlay"></div>
\t\t\t\t<div id="m_cant_download"><a><i>הורדת ההקלטה נחסמה על ידי צוות הקורס</i></a></div>
\t\t\t\t<a id="m_download_mp4" class="maor_hidden">הורדת הקלטה</a>
\t\t\t\t<a id="m_download_mp3" class="maor_hidden">הורדת שמע</a>
\t\t\t\t<div id="m_vid_list" class="maor_hidden">
\t\t\t\t\t<div>בחר וידאו: </div>
\t\t\t\t\t<span><canvas></canvas></span>
\t\t\t\t\t<span><canvas></canvas></span>
\t\t\t\t\t<span>סגור</span>
\t\t\t\t</div>
\t\t\t\t<a id="m_snapshot">צלם תמונה</a>
\t\t\t\t<a id="m_expand" class="maor_hidden">פצל לשני מסכים</a>
\t\t\t\t<a id="m_float" class="maor_hidden">פתח בחלון צף</a>
\t\t\t\t<a id="m_speed">
\t\t\t\t\t<div><span>2.25</span><span>2.5</span><span>2.75</span><span>3</span></div>
\t\t\t\t\t<span style="display: block">מהירויות נוספות</span>
\t\t\t\t</a>
\t\t\t\t<a id="m_sound">שיפורי שמע</a>
\t\t\t\t<label for="m_darkmode"><a>מצב לילה<input id="m_darkmode" type="checkbox" /></a></label>
\t\t\t\t<label for="m_save"><a>זכור הגדרות<input id="m_save" type="checkbox" /></a></label>
\t\t\t</div>
\t\t\t<div id="maor_koteret">Technion<sup>++</sup></div>
\t\t</div>

\t\t<div id="maor_sound">
\t\t\t<div class="m_header">
\t\t\t\tשיפורי שמע <sup>BETA</sup>
\t\t\t\t<span id="maor_sound_close">סגור</span>
\t\t\t</div>

\t\t\t<div class="m_grid">

\t\t\t\t<div>
\t\t\t\t\tהשימוש באפקטים הבאים עלול להגביר רעשי רקע.
\t\t\t\t\t<span style="display: none"><br />בדפדפן פיירפוקס, השימוש באפקטים הנ"ל ינעל את הרצת הווידאו למהירות x1. כדי לבטל נעילה זו יש לרענן את הדף.</span>
\t\t\t\t</div>
\t\t\t\t<div></div>

\t\t\t\t<div>
\t\t\t\t\t<b>רמת סינון רעשי רקע</b><br />
\t\t\t\t\tסינון בסיסי, שימושי למשל עבור הקלטות עם "זמזום חשמלי" ברקע.
\t\t\t\t</div>
\t\t\t\t<div>
\t\t\t\t\t<select id="maor_sound_noise">
\t\t\t\t\t\t<option selected value="0">ללא</option>
\t\t\t\t\t\t<option value="1">נמוכה</option>
\t\t\t\t\t\t<option value="2">בינונית</option>
\t\t\t\t\t\t<option value="3">גבוהה</option>
\t\t\t\t\t</select>
\t\t\t\t</div>
\t\t
\t\t\t\t<div>
\t\t\t\t\t<b>תוספת ווליום</b><br />
\t\t\t\t\tשימושי כאשר עוצמת השמע של ההקלטה נמוכה מאוד.
\t\t\t\t</div>
\t\t\t\t<div>
\t\t\t\t\t<select id="maor_sound_volume">
\t\t\t\t\t\t<option selected value="0">ללא</option>
\t\t\t\t\t\t<option value="1">נמוכה</option>
\t\t\t\t\t\t<option value="2">בינונית</option>
\t\t\t\t\t\t<option value="3">גבוהה</option>
\t\t\t\t\t</select>
\t\t\t\t</div>
\t\t
\t\t\t\t<div>
\t\t\t\t\t<b>איזון צלילים</b><br />
\t\t\t\t\tמגביר צלילים נמוכים ומנמיך צלילים גבוהים מאוד. שימושי כאשר איכות ההקלטה לא אחידה.
\t\t\t\t</div>
\t\t\t\t<div>
\t\t\t\t\t<select id="maor_sound_compressor">
\t\t\t\t\t\t<option selected value="0">כבוי</option>
\t\t\t\t\t\t<option value="1">פעיל</option>
\t\t\t\t\t</select>
\t\t\t\t</div>
\t\t
\t\t\t</div>
\t\t\t<div class="m_grid" style="display: none">
\t\t\t\tעקב מגבלות טכניות לא ניתן להשתמש בשיפורי שמע עבור הקלטה זו.
\t\t\t</div>

\t\t</div>

\t</div>
\t`, "text/html").getElementById("maor_menu_container");
		for (let d of menu.getElementsByTagName("a"))
			if (d.id)
				d.style.backgroundImage = "url(" + chrome.runtime.getURL("icons/panopto_icons/" + d.id.replace(/_mp[34]/, "") + ".svg") + ")";
		document.getElementById("transportControls").appendChild(document.createElement("div")).classList.add("maor_menu_divider", "transport-button");
		document.getElementById("transportControls").appendChild(menu);
		document.getElementById("maor_koteret").style.backgroundImage = "url(" + chrome.runtime.getURL("icons/technion_plus_plus/icon-16.png").toString() + ")";

		const name = window.location.href.split("?")[1].split("id=")[1].split("&")[0],
			name2 = document.title.replace(/[^a-zA-Z\u05d0-\u05ea0-9\- ]/g, ""),
			element = document.getElementById("m_cant_download"), downloads = {
				3: { // short for mp3
					url: `https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/${name}.mp4?mediaTargetType=audioPodcast`,
					name: name2 + "_voice.mp4"
				}, 4: { // short for mp4
					url: `https://panoptotech.cloud.panopto.eu/Panopto/Podcast/Syndication/${name}.mp4`,
					name: name2 + ".mp4"
				}
			};
		Object.keys(downloads).forEach(s => {
			fetch(downloads[s].url, {method: "head", mode: "no-cors"}).then(h => {
				if (h.status == 0) {
					element.classList.add("maor_hidden");
					let e = document.getElementById(`m_download_mp${s}`);
					e.classList.remove("maor_hidden");
					e.addEventListener("click", () => {
						chrome.runtime.sendMessage({
							mess_t: "singledownload", link: downloads[s].url, name: downloads[s].name
						});
					});
				}
			});
		});

		const style = document.head.appendChild(document.createElement("style")).sheet;
		style.insertRule(".player {background-color: #000 !important;}", 0);
		document.getElementById("m_darkmode").addEventListener("change", () => {
			u(style);
			q("darkmode");
		});
		document.getElementById("m_save").addEventListener("change", () => q("settings"));
		if (document.pictureInPictureEnabled && !document.querySelector(".video-js").disablePictureInPicture) {
			document.getElementById("m_float").classList.remove("maor_hidden");
			document.getElementById("m_float").addEventListener("click", () => {
				document.pictureInPictureElement || document.querySelector(".video-js").requestPictureInPicture();
			});
		}
		for (const span of document.querySelectorAll("#m_speed span")) span.addEventListener("click", () => {
			let c;
			for (c of document.querySelectorAll(".video-js")) c.playbackRate = span.textContent;
			(c = document.querySelector(".maor_selected")) && c.classList.remove("maor_selected");
			span.classList.add("maor_selected");
		});

		chrome.storage.local.get({
			panopto_speed: "Normal", panopto_light: false, panopto_hide: false, panopto_save: true
		}, c => {
			chrome.runtime.lastError && console.error("TE_panopto_2: " + chrome.runtime.lastError.message);
			if (c.panopto_save) {
				document.getElementById("m_save").checked = c.panopto_save;
				c.panopto_light && u(style);
				document.getElementById("m_darkmode").checked = c.panopto_light;
				const d = setInterval(() => {
					if (document.getElementById("Faster")) {
						clearInterval(d);
						c.panopto_hide && "none" != document.getElementById("toggleThumbnailsButton").style.display && document.getElementById("toggleThumbnailsButton").click();
						document.getElementById(c.panopto_speed).click();
						for (let speed of document.getElementsByClassName("play-speed"))
							speed.addEventListener("click", () => {
								q("speed");
								const e = document.querySelector(".maor_selected");
								e && e.classList.remove("maor_selected")
							});
						document.getElementById("toggleThumbnailsButton").addEventListener("click", () => {
							q("showhide");
						});
					}
				}, 2E3);
			}
		});

		(new MutationObserver((records, observer) => {
			for (const record of records) for (let i = 0; i < record.addedNodes.length; i++) {
				let node = record.addedNodes[i];
				if ("function" === typeof node.querySelector && !document.getElementById("new_win") &&
					node.classList.contains("player") && document.getElementsByClassName("video-js").length === 2) {
					const h = (new DOMParser).parseFromString(
						'\n<div style="color: #777; font-style: italic; z-index:1; width: 250px; margin:auto; display:block; ' +
						'padding: 10px; line-height:1; position: relative;text-align: center; direction: rtl; display: none">' +
						'\n\t<h4 dir="ltr">Technion<sup>++</sup></h4>\n\tהוידאו נפתח לתצוגה בחלון חדש, ' +
						'יש לסגור את החלון החדש כדי לחזור ולצפות בווידאו כאן.\n</div>\n',
						"text/html").querySelector("div");
					document.getElementById("secondaryScreen").insertBefore(h, document.getElementById("secondaryScreen").childNodes[0]);
					const e = document.getElementById("m_expand");
					e.classList.remove("maor_hidden");
					const k = document.getElementsByClassName("video-js"), b = k[k.length - 1], l = a => {
						b.style.display = a ? "none" : "block";
						h.style.display = a ? "block" : "none";
						e.style.opacity = a ? .3 : 1;
					};
					e.addEventListener("click", () => {
						if (.3 != e.style.opacity) {
							l(true);
							const a = window.open("", "Technion", "width=830,height=655,menubar=no,statusbar=no,titlebar=no,toolbar=no");
							a.document.title = "Technion - " + document.title;
							a.document.body.setAttribute("style", "text-align: center; background: #000; font-family: arial; direction: rtl; font-size: 11px; color: #f9f9fa;");
							const c = document.createElement("canvas");
							a.document.body.appendChild(c);
							c.height = b.videoHeight;
							c.width = b.videoWidth;
							c.setAttribute("style", "max-width: 800px; border: 1px solid #fff; margin: auto; display: block;");
							const m = c.getContext("2d");
							m.drawImage(b, 0, 0);
							const f = () => {
								if (b.paused || b.ended) return;
								c.height = b.videoHeight;
								c.width = b.videoWidth;
								m.drawImage(b, 0, 0);
								setTimeout(f, 1E3 / 60);
							};
							f();
							b.addEventListener("play", f);
							let g = false;
							a.document.addEventListener("dblclick", () => {
								if (!g) return;
								"function" === typeof a.document.mozCancelFullScreen ?
									a.document.mozCancelFullScreen() : a.document.webkitExitFullscreen();
								g = false;
							});
							let d = document.createElement("button");
							d.addEventListener("click", () => {
								"function" === typeof c.mozRequestFullScreen ? c.mozRequestFullScreen() : c.webkitRequestFullscreen();
								g = true;
							});
							d.textContent = "מסך מלא";
							d.setAttribute("style", "margin: 8px; cursor: pointer");
							a.document.body.appendChild(d);
							a.onbeforeunload = () => l(false);
							d = document.createElement("span");
							d.textContent = "ניתן לגרור את החלון למסך שני וכך לצפות בווידאו במצב מסך מלא בשני המסכים.";
							a.document.body.appendChild(d);
						}
					});

					observer.disconnect();
					return;
				}
			}
		})).observe(document.getElementById("viewerContent"), {childList: true, subtree: true});

		const a = document.getElementById("m_snapshot"), c = document.getElementById("m_vid_list"),
			d = c.getElementsByTagName("canvas"), b = document.getElementsByClassName("video-js"),
			g = f => {
				d[f].width = 28 / b[f].videoHeight * b[f].videoWidth;
				d[f].height = 28;
				d[f].getContext("2d").drawImage(b[f], 0, 0, b[f].videoWidth, b[f].videoHeight, 0, 0, d[f].width, d[f].height);
			};
		c.getElementsByTagName("span")[2].addEventListener("click", () => {
			c.className = "maor_hidden";
			document.getElementById("maor_menu").classList.remove("start", "overlaid");
		});
		const canvas = document.createElement("canvas"), h = [document.createElement("a"), document.createElement("a")],
			p = new MouseEvent("click", {bubbles: true, cancelable: true, view: window}), l = f => {
				canvas.width = b[f].videoWidth;
				canvas.height = b[f].videoHeight;
				canvas.getContext("2d").drawImage(b[f], 0, 0);
				try {
					h[f].href = canvas.toDataURL("image/png");
				} catch (err) {
					if (err.name === "SecurityError")
						return window.alert("לא ניתן לצלם תמונה מהווידאו עקב הגנות דפדפן. נסו לעשות צילום מסך עם win+shift+s.");
				}
				h[f].download = "snapshot_" + Date.now() + ".png";
				h[f].dispatchEvent(p);
			};
		d[0].addEventListener("click", () => l(0));
		d[1].addEventListener("click", () => l(1));
		a.addEventListener("click", () => {
			g(0);
			if (b.length === 2) {
				document.getElementById("maor_menu").classList.add("start", "overlaid");
				c.className = "maor_persist";
				g(1);
			} else l(0);
		});

		document.getElementById("m_sound").style.display = "none";
		setTimeout(() => document.getElementById("maor_menu").classList.remove("start"), 1500);
	}
})();
