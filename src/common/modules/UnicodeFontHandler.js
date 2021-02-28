"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";
import { isMobile } from "./MobileHelper.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import { menuStructure, fontLetters, SEPARATOR_ID, CASE_ID_PREFIX, FONT_ID_PREFIX, TRANSFORMATION_TYPE } from "/common/modules/data/Fonts.js";

/**
 * Changes the Unicode font of the given text.
 *
 * It replaces each ASCII character in the text with the corresponding character from the Unicode font.
 *
 * @param {string} text
 * @param {string} chosenFont
 * @returns {string}
 * @throws {Error}
 */
function changeFont(text, chosenFont) {
    const font = fontLetters[chosenFont];
    if (!font) {
        throw new Error(`Font ${chosenFont} could not be processed.`);
    }
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
 * @param {string} text
 * @returns {string}
 */
function capitalizeEachWord(text) {
    // Regular expression Unicode property escapes and lookbehind assertions require Firefox/Thunderbird 78
    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#bcd:javascript.builtins.RegExp
    return text.replace(/(?<=^|\P{Alpha})\p{Alpha}\S*/gu, ([h, ...t]) => h.toLocaleUpperCase() + t.join(''));
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
const changeCase = Object.freeze({
    "menuCaseLowercase": (str) => str.toLocaleLowerCase(),
    "menuCaseUppercase": (str) => str.toLocaleUpperCase(),
    "menuCaseCapitalizeEachWord": (str) => capitalizeEachWord(str.toLocaleLowerCase()),
    "menuCaseToggleCase": (str) => toggleCase(str)
});

/**
 * Handle context menu click.
 *
 * @param {string} text
 * @param {string} transformationId
 * @returns {string}
 * @throws {Error}
 */
function transformText(text, transformationId) {
    let output = null;
    const transformationType = getTransformationType(transformationId);
    if (transformationType == TRANSFORMATION_TYPE.CASING) {
        output = changeCase[transformationId](text);
    } else if (transformationType == TRANSFORMATION_TYPE.FONT) {
        output = changeFont(text, transformationId);
    } else {
        throw new Error(`Transformation with id=${transformationId} is unknown and could not be processed.`);
    }

    if (!output) {
        console.error(`Error while transforming text with id=${transformationId}. Skipping…`);
    }
    return output;
}

/**
 * Return the type of the transformation.
 *
 * @param {string} transformationId
 * @returns {Symbol} TRANSFORMATION_TYPE
 * @throws {Error}
 */
function getTransformationType(transformationId) {
    if (transformationId.startsWith(CASE_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.CASING;
    } else if (transformationId.startsWith(FONT_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.FONT;
    } else {
        throw new Error(`Error while getting transformation type. Transformation with id=${transformationId} is unknown.`);
    }
}

/**
 * Handle context menu click.
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {void}
 * @throws {Error}
 */
function handle(info, tab) {
    let text = info.selectionText;

    if (text) {
        text = text.normalize();
        const menuItem = info.menuItemId;
        const output = transformText(text, menuItem);

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

    menus.removeAll();

    for (const transformationId of menuStructure) {
        if (transformationId === SEPARATOR_ID) {
            menus.create({
                // id: id,
                type: "separator",
                contexts: ["editable"]
            });
            continue;
        }

        const transformationType = getTransformationType(transformationId);
        if (transformationType == TRANSFORMATION_TYPE.CASING &&
            !unicodeFont.changeCase) {
            continue;
        }
        if (transformationType == TRANSFORMATION_TYPE.FONT &&
            !unicodeFont.changeFont) {
            continue;
        }

        const translatedMenuText = browser.i18n.getMessage(transformationId);
        let translatedMenuTextTransformed = transformText(translatedMenuText, transformationId);

        menus.create({
            "id": transformationId,
            "title": translatedMenuTextTransformed,
            "contexts": ["editable"],
        });
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

    BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT, (request) => {
        // clear cache by reloading all options
        // await AddonSettings.loadOptions();

        return applySettings(request.optionValue);
    });
}
