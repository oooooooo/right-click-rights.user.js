// ==UserScript==
// @name         Right-Click Rights
// @namespace    https://github.com/oooooooo
// @homepageURL  https://github.com/oooooooo/right-click-rights.user.js
// @supportURL   https://github.com/oooooooo/right-click-rights.user.js/issues
// @downloadURL  https://raw.githubusercontent.com/oooooooo/right-click-rights.user.js/main/right-click-rights.user.js
// @updateURL    https://raw.githubusercontent.com/oooooooo/right-click-rights.user.js/main/right-click-rights.user.js
// @version      4.0.0
// @description  Re-enable right-click, text selection and copy on sites that block them. On by default; turn it off per site from the userscript menu or with Alt+S.
// @author       oooooooo
// @license      MIT
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @noframes
// ==/UserScript==

(() => {
	// Only sites turned off are stored, so every other site stays on.
	const OFF_KEY = `disabled:${location.hostname}`;

	// `text`, not `auto`: the computed value of `auto` depends on the parent,
	// so it stays `none` under an ancestor that disabled selection.
	const CSS = `
    *, *::before, *::after {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
    }
  `;

	let enabled = !GM_getValue(OFF_KEY, false);
	let menuId = null;

	// Toggle the text rather than `style.disabled`: setting `disabled` before
	// the element is in the document is ignored, so the CSS would still apply.
	const style = document.createElement("style");
	const applyStyle = () => {
		style.textContent = enabled ? CSS : "";
	};
	applyStyle();

	const attach = () =>
		(document.head || document.documentElement).appendChild(style);
	attach();

	// Some pages rebuild <head> during load, which drops the style element.
	document.addEventListener("DOMContentLoaded", () => {
		if (!style.isConnected) attach();
	});

	// Stopping the event here, before any page handler runs, also defeats
	// `oncontextmenu = () => false`, which cancels without calling
	// `preventDefault` and so cannot be undone after the fact.
	for (const type of ["contextmenu", "selectstart", "copy"]) {
		window.addEventListener(
			type,
			(e) => {
				if (enabled) e.stopImmediatePropagation();
			},
			true,
		);
	}

	const toast = (text) => {
		const el = document.createElement("div");
		el.textContent = text;
		el.style.cssText = [
			"all: initial",
			"position: fixed",
			"z-index: 2147483647",
			"left: 50%",
			"bottom: 32px",
			"transform: translateX(-50%)",
			"padding: 10px 18px",
			"border-radius: 6px",
			"background: rgba(0, 0, 0, 0.85)",
			"color: #fff",
			"font: 14px/1.4 sans-serif",
			"pointer-events: none",
		]
			.map((d) => `${d} !important`)
			.join(";");
		(document.body || document.documentElement).appendChild(el);
		setTimeout(() => el.remove(), 1600);
	};

	const renderMenu = () => {
		if (typeof GM_registerMenuCommand !== "function") return;
		if (menuId !== null && typeof GM_unregisterMenuCommand === "function") {
			GM_unregisterMenuCommand(menuId);
		}
		const label = enabled
			? `Right-Click Rights: ON for ${location.hostname} (click to disable)`
			: `Right-Click Rights: off for ${location.hostname} (click to enable)`;
		menuId = GM_registerMenuCommand(label, () => toggle());
	};

	const toggle = () => {
		enabled = !enabled;
		if (enabled) {
			GM_deleteValue(OFF_KEY);
		} else {
			GM_setValue(OFF_KEY, true);
		}
		applyStyle();
		renderMenu();
		toast(
			enabled ? "Right-Click Rights enabled" : "Right-Click Rights disabled",
		);
	};

	renderMenu();

	document.addEventListener(
		"keydown",
		(e) => {
			if (
				e.altKey &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.shiftKey &&
				e.code === "KeyS"
			) {
				e.preventDefault();
				toggle();
			}
		},
		true,
	);
})();
