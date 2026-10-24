import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const SCRIPT = readFileSync(
	new URL("./right-click-rights.user.js", import.meta.url),
	"utf8",
);
const HOST = "example.com";
const OFF_KEY = `disabled:${HOST}`;

// Runs the userscript in a fresh page that shares `store` with earlier runs,
// so a second call behaves like the next visit to the same site.
const loadPage = (store = new Map()) => {
	const dom = new JSDOM(
		"<!doctype html><html><head></head><body></body></html>",
		{
			url: `https://${HOST}/`,
			runScripts: "outside-only",
		},
	);
	const { window } = dom;
	const menu = new Map();
	let nextMenuId = 1;

	window.GM_getValue = (key, fallback) =>
		store.has(key) ? store.get(key) : fallback;
	window.GM_setValue = (key, value) => store.set(key, value);
	window.GM_deleteValue = (key) => store.delete(key);
	window.GM_registerMenuCommand = (label, onClick) => {
		const id = nextMenuId++;
		menu.set(id, { label, onClick });
		return id;
	};
	window.GM_unregisterMenuCommand = (id) => menu.delete(id);

	window.eval(SCRIPT);

	const isSelectable = () =>
		[...window.document.querySelectorAll("style")].some((style) =>
			style.textContent.includes("user-select: text"),
		);
	const pressAltS = () =>
		window.document.dispatchEvent(
			new window.KeyboardEvent("keydown", {
				code: "KeyS",
				altKey: true,
				bubbles: true,
			}),
		);
	const menuLabels = () => [...menu.values()].map((item) => item.label);
	const clickMenu = () => [...menu.values()][0].onClick();

	// Fires a cancelable event on <body> and reports whether the page's
	// handlers managed to cancel it.
	const isCanceled = (type) =>
		!window.document.body.dispatchEvent(
			new window.Event(type, { bubbles: true, cancelable: true }),
		);
	const blockWithListener = (type) =>
		window.document.addEventListener(type, (e) => e.preventDefault());
	const blockWithHandler = (type) => {
		window.document[`on${type}`] = () => false;
	};

	return {
		store,
		isSelectable,
		pressAltS,
		menuLabels,
		clickMenu,
		isCanceled,
		blockWithListener,
		blockWithHandler,
	};
};

describe("right-click-rights", () => {
	it("enables selection on a site with no saved setting", () => {
		const page = loadPage();

		expect(page.isSelectable()).toBe(true);
		expect(page.store.size).toBe(0);
	});

	it("keeps selection off on a site that was turned off before", () => {
		const page = loadPage(new Map([[OFF_KEY, true]]));

		expect(page.isSelectable()).toBe(false);
	});

	it("turns selection off with Alt+S and records the site", () => {
		const page = loadPage();

		page.pressAltS();

		expect(page.isSelectable()).toBe(false);
		expect(page.store.get(OFF_KEY)).toBe(true);
	});

	it("remembers the off setting on the next visit", () => {
		const first = loadPage();
		first.pressAltS();

		const next = loadPage(first.store);

		expect(next.isSelectable()).toBe(false);
	});

	it("turns selection back on and discards the saved setting", () => {
		const page = loadPage(new Map([[OFF_KEY, true]]));

		page.pressAltS();

		expect(page.isSelectable()).toBe(true);
		expect(page.store.has(OFF_KEY)).toBe(false);
	});

	it("toggles from the menu and keeps one menu item that shows the state", () => {
		const page = loadPage();
		expect(page.menuLabels()).toEqual([
			`Right-Click Rights: ON for ${HOST} (click to disable)`,
		]);

		page.clickMenu();

		expect(page.isSelectable()).toBe(false);
		expect(page.menuLabels()).toEqual([
			`Right-Click Rights: off for ${HOST} (click to enable)`,
		]);
	});

	describe.each(["contextmenu", "selectstart", "copy"])(
		"page blocking of %s",
		(type) => {
			it("is ignored when added with addEventListener", () => {
				const page = loadPage();
				page.blockWithListener(type);

				expect(page.isCanceled(type)).toBe(false);
			});

			it("is ignored when set as an on-event handler", () => {
				const page = loadPage();
				page.blockWithHandler(type);

				expect(page.isCanceled(type)).toBe(false);
			});

			it("works again on a site that was turned off", () => {
				const page = loadPage(new Map([[OFF_KEY, true]]));
				page.blockWithListener(type);

				expect(page.isCanceled(type)).toBe(true);
			});
		},
	);
});
