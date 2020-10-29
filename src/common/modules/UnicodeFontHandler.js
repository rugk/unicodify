"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
// import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";
import { isMobile } from "./MobileHelper.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import { fonts } from "/common/modules/data/Fonts.js";

const caseIds = Object.freeze(["Lowercase", "Uppercase", "Capitalize Each Word", "Toggle Case"]);
const fontIds = Object.freeze(["Superscript", "Small Caps", "All Small Caps", "Unicase", "separator", "Serif bold", "Serif italic", "Serif bold italic", "Sans-serif", "Sans-serif bold", "Sans-serif italic", "Sans-serif bold italic", "Script", "Script bold", "Fraktur", "Fraktur bold", "Monospace", "Double-struck", "separator", "Circled", "Circled (black)", "Squared", "Squared (black)", "Fullwidth"]);

/**
 * Change Unicode font.
 * It replaces each ASCII character in the text with the corresponding character from the Unicode font.
 *
 * @param {string} text
 * @param {string} afont
 * @returns {string}
 */
function changeFont(text, afont) {
	const font = fonts[afont];
	// console.log(afont, font);
	let output = '';

	for (let letter of text) {
		const code = letter.charCodeAt(0);
		if (code >= 33 && code <= 127) {
			if (font.length == 94)
				letter = font[code - '!'.charCodeAt(0)];
			else if (letter >= 'A' && letter <= 'Z') {
				letter = font[code - 'A'.charCodeAt(0)];
			} else if (letter >= 'a' && letter <= 'z') {
				if (font.length == 26 || font.length == 26 + 10)
					letter = font[code - 'a'.charCodeAt(0)];
				else if (font.length == 26 + 26 || font.length == 26 + 26 + 10)
					letter = font[code - 'a'.charCodeAt(0) + 26];
			} else if (letter >= '0' && letter <= '9') {
				if (font.length == 26 + 10)
					letter = font[code - '0'.charCodeAt(0) + 26];
				else if (font.length == 26 + 26 + 10)
					letter = font[code - '0'.charCodeAt(0) + 26 + 26];
			}
		}
		output += letter;
	}

	return output;
}

/**
 * Capitalize Each Word.
 *
 * @param {string} atext
 * @returns {string}
 */
function capitalizeEachWord(atext) {
	// Regular expression Unicode property escapes and lookbehind assertions require Firefox/Thunderbird 78
	return atext.replace(/(?<=^|\P{Alpha})\p{Alpha}\S*/gu, ([h, ...t]) => h.toLocaleUpperCase() + t.join(''));
}

/**
 * Toggle Case.
 *
 * @param {string} atext
 * @returns {string}
 */
function toggleCase(atext) {
	let output = '';

	for (let letter of atext) {
		const upper = letter.toLocaleUpperCase();
		const lower = letter.toLocaleLowerCase();
		if (letter === lower && letter !== upper)
			letter = upper;
		else if (letter === upper && letter !== lower)
			letter = lower;
		output += letter;
	}

	return output;
}

/**
 * Change Case
 *
 * @public
 * @const
 * @type {Object.<string, function>}
 */
const changeCase = {
	"lowercase": (str) => str.toLocaleLowerCase(),
	"uppercase": (str) => str.toLocaleUpperCase(),
	"capitalize-each-word": (str) => capitalizeEachWord(str.toLocaleLowerCase()),
	"toggle-case": (str) => toggleCase(str)
};

/**
 * Handle context menu click.
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {void}
 */
function handle(info, tab) {
	let text = info.selectionText;

	if (text) {
		text = text.normalize();
		let output = '';

		switch (info.menuItemId) {
			case "lowercase":
			case "uppercase":
			case "capitalize-each-word":
			case "toggle-case":
				output = changeCase[info.menuItemId](text);
				break;
			case "superscript":
			case "small-caps":
			case "all-small-caps":
			case "unicase":
			case "serif-bold":
			case "serif-italic":
			case "serif-bold-italic":
			case "sans-serif":
			case "sans-serif-bold":
			case "sans-serif-italic":
			case "sans-serif-bold-italic":
			case "script":
			case "script-bold":
			case "fraktur":
			case "fraktur-bold":
			case "monospace":
			case "double-struck":
			case "circled":
			case "circled-(black)":
			case "squared":
			case "squared-(black)":
			case "fullwidth": {
				output = changeFont(text, info.menuItemId);
				break;
			}
		}

		browser.tabs.executeScript(tab.id, {
			code: `insertIntoPage("${output}");`,
			frameId: info.frameId
		});
	}
}

/**
 * Apply new Unicode font settings.
 *
 * @param {Object} unicodeFont
 * @returns {void}
 */
function applySettings(unicodeFont) {
	const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird

	// menus.removeAll();

	if (unicodeFont.changeCase) {
		for (const id of caseIds) {
			// .replaceAll(" ", "-");
			const aid = id.toLowerCase().split(" ").join("-");
			menus.create({
				"id": aid,
				"title": changeCase[aid](id),
				"contexts": ["editable"],
			});
		}
	}

	if (unicodeFont.changeCase && unicodeFont.changeFont) {
		menus.create({
			id: "separator-2",
			type: "separator",
			contexts: ["editable"]
		});
	}

	if (unicodeFont.changeFont) {
		for (const id of fontIds) {
			if (id === "separator") {
				menus.create({
					// id: id,
					type: "separator",
					contexts: ["editable"]
				});
			} else {
				// .replaceAll(" ", "-");
				const aid = id.toLowerCase().split(" ").join("-");
				// console.log(id, aid, fonts[aid], changeFont(id, aid));
				menus.create({
					"id": aid,
					"title": changeFont(id, aid),
					"contexts": ["editable"],
				});
			}
		}
	}
}

/**
 * Init Unicode font module.
 *
 * @public
 * @returns {void}
 */
export async function init() {
	if (await isMobile()) {
		return;
	}

	const unicodeFont = await AddonSettings.get("unicodeFont");

	applySettings(unicodeFont);

	const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird

	menus.onClicked.addListener(handle);
}

/* BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT, (request) => {
    // clear cache by reloading all options
    // await AddonSettings.loadOptions();

    return applySettings(request.optionValue);
}); */
