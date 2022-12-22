"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import * as symbols from "/common/modules/data/Symbols.js";

const settings = {
    enabled: null,
    autocorrectEmojis: null,
    quotes: null,
    fracts: null
};

let autocorrections = {};

// Longest autocorrection
let longest = 0;

let symbolpatterns = [];
// Exceptions, do not autocorrect for these patterns
let antipatterns = [];

// Chrome
// Adapted from: https://github.com/mozilla/webextension-polyfill/blob/master/src/browser-polyfill.js
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

/**
 * Traverse Trie tree of objects to create RegEx.
 *
 * @param {Object.<string, Object|boolean>} obj
 * @returns {string}
 */
function pattern(obj) {
    const alt = [];
    const cc = [];

    // Escape special characters
    const regExSpecialChars = /[.*+?^${}()|[\]\\]/gu;

    for (const char in obj) {
        if (char) {
            const achar = char.replace(regExSpecialChars, "\\$&");

            if (!("" in obj[char] && Object.keys(obj[char]).length === 1)) {
                const recurse = pattern(obj[char]);
                alt.push(recurse + achar);
            } else {
                cc.push(achar);
            }
        }
    }

    if (cc.length) {
        alt.push(cc.length === 1 ? cc[0] : `[${cc.join("")}]`);
    }

    let result = alt.length === 1 ? alt[0] : `(?:${alt.join("|")})`;

    if ("" in obj) {
        if (cc.length || alt.length > 1) {
            result += "?";
        } else {
            result = `(?:${result})?`;
        }
    }

    return result;
}

/**
 * Convert autocorrections into Trie tree of objects.
 *
 * @param {string[]} arr
 * @returns {string}
 */
function createRegEx(arr) {
    const tree = {};

    for (const s of arr.sort((a, b) => b.length - a.length)) {
        let temp = tree;

        for (const char of Array.from(s).reverse()) {
            if (!(char in temp)) {
                temp[char] = {};
            }
            temp = temp[char];
        }

        // Leaf node
        temp[""] = true;
    }

    Object.freeze(tree);
    return pattern(tree);
}

/**
 * Apply new autocorrect settings and create regular expressions.
 *
 * @returns {void}
 */
function applySettings() {
    autocorrections = {};

    // Add all symbols to our autocorrections map, we want to replace
    if (settings.autocorrectSymbols) {
        Object.assign(autocorrections, symbols.symbols);
    }

    // Longest autocorrection
    longest = 0;

    for (const symbol in autocorrections) {
        if (symbol.length > longest) {
            longest = symbol.length;
        }
    }
    console.log("Longest autocorrection", longest);

    symbolpatterns = createRegEx(Object.keys(autocorrections));

    // Do not autocorrect for these patterns
    antipatterns = [];
    for (const x in autocorrections) {
        let length = 0;
        let index = x.length;

        for (const y in autocorrections) {
            if (x === y) {
                continue;
            }
            const aindex = x.indexOf(y);
            if (aindex >= 0) {
                if (aindex < index) {
                    index = aindex;
                    length = y.length;
                } else if (aindex === index && y.length > length) {
                    length = y.length;
                }
            }
        }

        if (length) {
            length = x.length - (index + length);
            if (length > 1) {
                antipatterns.push(x.slice(0, -(length - 1)));
            }
        }
    }
    antipatterns = antipatterns.filter((item, pos) => antipatterns.indexOf(item) === pos);
    console.log("Do not autocorrect for these patterns", antipatterns);

    antipatterns = createRegEx(antipatterns);

    symbolpatterns = new RegExp(`(${symbolpatterns})$`, "u");
    antipatterns = new RegExp(`(${antipatterns})$`, "u");
}

/**
 * On error.
 *
 * @param {string} error
 * @returns {void}
 */
function onError(error) {
    console.error(`Error: ${error}`);
}

/**
 * Set autocorrect settings.
 *
 * @param {Object} autocorrect
 * @returns {void}
 */
function setSettings(autocorrect) {
    settings.enabled = autocorrect.enabled;
    settings.autocorrectSymbols = autocorrect.autocorrectSymbols;
    settings.quotes = autocorrect.autocorrectUnicodeQuotes;
    settings.fracts = autocorrect.autocorrectUnicodeFracts;

    if (settings.enabled) {
        applySettings();
    }
}

/**
 * Send autocorrect settings to content scripts.
 *
 * @param {Object} autocorrect
 * @returns {void}
 */
function sendSettings(autocorrect) {
    setSettings(autocorrect);

    browser.tabs.query({}).then((tabs) => {
        for (const tab of tabs) {
            // This requires Thunderbird 78.4: https://bugzilla.mozilla.org/show_bug.cgi?id=1641576
            browser.tabs.sendMessage(
                tab.id,
                {
                    type: COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_CONTENT,
                    enabled: settings.enabled,
                    quotes: settings.quotes,
                    fracts: settings.fracts,
                    autocorrections: autocorrections,
                    longest: longest,
                    symbolpatterns: IS_CHROME ? symbolpatterns.source : symbolpatterns,
                    antipatterns: IS_CHROME ? antipatterns.source : antipatterns
                }
            ).catch(onError);
        }
    }).catch(onError);
}

/**
 * Init autocorrect module.
 *
 * @public
 * @returns {Promise<void>}
 */
export async function init() {
    const autocorrect = await AddonSettings.get("autocorrect");

    setSettings(autocorrect);

    // Thunderbird
    // Remove if part 3 of https://bugzilla.mozilla.org/show_bug.cgi?id=1630786#c4 is ever done
    if (typeof messenger !== "undefined") {
        browser.composeScripts.register({
            js: [
                { file: "/content_scripts/autocorrect.js" }
            ]
        });
    }
}

BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_BACKGROUND, (request) => {
    // clear cache by reloading all options
    // await AddonSettings.loadOptions();

    return sendSettings(request.optionValue);
});

browser.runtime.onMessage.addListener((message) => {
    // console.log(message);
    if (message.type === COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_CONTENT) {
        const response = {
            type: COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_CONTENT,
            enabled: settings.enabled,
            quotes: settings.quotes,
            fracts: settings.fracts,
            autocorrections: autocorrections,
            longest: longest,
            symbolpatterns: IS_CHROME ? symbolpatterns.source : symbolpatterns,
            antipatterns: IS_CHROME ? antipatterns.source : antipatterns
        };
        return Promise.resolve(response);
    }
});
