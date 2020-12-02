"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";
import { isMobile } from "./MobileHelper.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import { CASE, FONT, SEPARATOR, contextMenuList, menuTranslation, fontMap, caseByString, fontByString } from "/common/modules/data/Fonts.js";

/**
 * Changes the Unicode font of the given text.
 *
 * It replaces each ASCII character in the text with the corresponding character from the Unicode font.
 *
 * @param {string} text
 * @param {Symbol} chosenFont
 * @returns {string}
 */
function changeFont(text, chosenFont) {
    const font = fontMap[chosenFont];
    let output = "";

    for (let letter of text) {
        const code = letter.charCodeAt(0);
        if (code >= 33 && code <= 127) {
            if (font.length === 94) {
                letter = font[code - "!".charCodeAt(0)];
            } else if (letter >= "A" && letter <= "Z") {
                letter = font[code - "A".charCodeAt(0)];
            } else if (letter >= "a" && letter <= "z") {
                if (font.length === 26 || font.length === 26 + 10) {
                    letter = font[code - "a".charCodeAt(0)];
                } else if (font.length === 26 + 26 || font.length === 26 + 26 + 10) {
                    letter = font[code - "a".charCodeAt(0) + 26];
                }
            } else if (letter >= "0" && letter <= "9") {
                if (font.length === 26 + 10) {
                    letter = font[code - "0".charCodeAt(0) + 26];
                } else if (font.length === 26 + 26 + 10) {
                    letter = font[code - "0".charCodeAt(0) + 26 + 26];
                }
            }
        }
        output += letter;
    }

    return output;
}

/**
 * Capitalize Each Word.
 *
 * @param {string} text
 * @returns {string}
 */
function capitalizeEachWord(text) {
    // Regular expression Unicode property escapes and lookbehind assertions require Firefox/Thunderbird 78
    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#bcd:javascript.builtins.RegExp
    // return text.replace(/(?<=^|\P{Alpha})\p{Alpha}\S*/gu, ([h, ...t]) => h.toLocaleUpperCase() + t.join(''));
}

/**
 * Toggle case of text.
 *
 * @param {string} text
 * @returns {string}
 */
function toggleCase(text) {
    let output = "";

    for (let letter of text) {
        const upper = letter.toLocaleUpperCase();
        const lower = letter.toLocaleLowerCase();
        if (letter === lower && letter !== upper) {
            letter = upper;
        } else if (letter === upper && letter !== lower) {
            letter = lower;
        }
        output += letter;
    }

    return output;
}

/**
 * Change Case
 *
 * @private
 * @const
 * @type {Object.<string, function>}
 */
const changeCase = Object.freeze({
    [CASE.CAPITALIZE]: (text) => capitalizeEachWord(text.toLocaleLowerCase()),
    [CASE.LOWERCASE]: (text) => text.toLocaleLowerCase(),
    [CASE.TOGGLE]: (text) => toggleCase(text),
    [CASE.UPPERCASE]: (text) => text.toLocaleUpperCase(),
});

/**
 * Handle context menu selection.
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {void}
 */
function handleMenuSelect(info, tab) {
    let text = info.selectionText;

    // ignore, if no text is selected
    if (!text) {
        return;
    }

    text = text.normalize();
    let output = "";

    // convert string back to Symbol
    const caseId = caseByString[info.menuItemId];
    const fontId = fontByString[info.menuItemId];
    if (caseId) {
        output = changeCase[caseId](text);
    } else if (fontId) {
        output = changeFont(text, fontId);
    } else {
        throw new Error(`Unknown menu item selected. Expected FONT or CASE; but got ${info.menuItemId}`);
    }

    if (!output) {
        throw new Error(`Unknown conversion error occured for menu item ${info.menuItemId}`);
    }

    // finally inject if everything is all right
    browser.tabs.executeScript(tab.id, {
        code: `insertIntoPage("${output}");`,
        frameId: info.frameId
    });
}

/**
 * Apply new Unicode font settings.
 *
 * @param {Object} unicodeFont
 * @returns {void}
 */
function applySettings(unicodeFont) {
    const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird

    menus.removeAll();

    let menuItemsToShow = contextMenuList;
    if (!unicodeFont.changeCase) {
        const caseValues = Object.values(CASE);
        menuItemsToShow = contextMenuList.filter((id) => !caseValues.includes(id) );
    }
    if (!unicodeFont.changeFont) {
        const fontValues = Object.values(FONT);
        menuItemsToShow = contextMenuList.filter((id) => !fontValues.includes(id) );
    }
    menuItemsToShow
        .filter((id, index) => (index !== 0 || id !== SEPARATOR))
        .forEach((id) => {
            if (id === SEPARATOR) {
                menus.create({
                    type: "separator",
                    contexts: ["editable"]
                });
            } else {
                menus.create({
                    "id": id.toString(),
                    "title": browser.i18n.getMessage(menuTranslation[id]),
                    "contexts": ["editable"],
                });
            }
        });
}

/**
 * Init Unicode font module.
 *
 * @public
 * @returns {Promise}
 */
export async function init() {
    if (await isMobile()) {
        return;
    }

    const unicodeFont = await AddonSettings.get("unicodeFont");

    applySettings(unicodeFont);

    const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird

    menus.onClicked.addListener(handleMenuSelect);

    BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT, (request) => {
        // clear cache by reloading all options
        // await AddonSettings.loadOptions();

        return applySettings(request.optionValue);
    });
}
