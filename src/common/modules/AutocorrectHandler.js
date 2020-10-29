"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import * as symbols from "/common/modules/data/Symbols.js";

const settings = {
    autocorrectEmojis:  null,
    quotes:  null,
    fracts:  null,
};

let autocorrections = {};

// Longest autocorrection
let longest = 0;

let symbolpatterns = [];
// Do not autocorrect for these patterns
let antipatterns = [];

// Chrome
// Adapted from: https://github.com/mozilla/webextension-polyfill/blob/master/src/browser-polyfill.js
const CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

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

    symbolpatterns = [];
    // Escape special characters
    const re = /[.*+?^${}()|[\]\\]/g;

    for (const symbol in autocorrections) {
        symbolpatterns.push(symbol.replace(re, "\\$&"));
    }

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

        if (length > 0) {
            length = x.length - (index + length);
            if (length > 1) {
                antipatterns.push(x.slice(0, -(length - 1)));
            }
        }
    }
    antipatterns = antipatterns.filter((item, pos) => antipatterns.indexOf(item) === pos);
    console.log("Do not autocorrect for these patterns", antipatterns);

    antipatterns.forEach((symbol, index) => {
        antipatterns[index] = symbol.replace(re, "\\$&");
    });

    symbolpatterns = new RegExp(`(${symbolpatterns.join("|")})$`);
    antipatterns = new RegExp(`(${antipatterns.join("|")})$`);
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
    settings.autocorrectSymbols = autocorrect.autocorrectSymbols;
    settings.quotes = autocorrect.autocorrectUnicodeQuotes;
    settings.fracts = autocorrect.autocorrectUnicodeFracts;

    applySettings();
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
            // This is currently not supported in Thunderbird: https://bugzilla.mozilla.org/show_bug.cgi?id=1641576
            browser.tabs.sendMessage(
                tab.id,
                {
                    "quotes": settings.quotes,
                    "fracts": settings.fracts,
                    "autocorrections": autocorrections,
                    "longest": longest,
                    "symbolpatterns": CHROME ? symbolpatterns.source : symbolpatterns,
                    "antipatterns": CHROME ? antipatterns.source : antipatterns,
                }
            ).catch(onError);
        }
    }).catch(onError);
}

/**
 * Init autocorrect module.
 *
 * @public
 * @returns {void}
 */
export async function init() {
    const autocorrect = await AddonSettings.get("autocorrect");

    setSettings(autocorrect);

    browser.runtime.onMessage.addListener((message, sender) => {
        // console.log(message);
        if (message.type === COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_CONTENT) {
            const response = {
                "type": COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_CONTENT,
                "quotes": settings.quotes,
                "fracts": settings.fracts,
                "autocorrections": autocorrections,
                "longest": longest,
                "symbolpatterns": CHROME ? symbolpatterns.source : symbolpatterns,
                "antipatterns": CHROME ? antipatterns.source : antipatterns,
            };
            // console.log(response);
            return Promise.resolve(response);
        }
    });

    /* browser.tabs.query({}).then((tabs) => {
        for (let tab of tabs) {
            browser.tabs.executeScript(tab.id, {file: "content_scripts/autocorrect.js"});
        }
    }).catch(onError); */

    // Thunderbird
    // Remove if part 3 of https://bugzilla.mozilla.org/show_bug.cgi?id=1630786#c4 is ever done
    if (typeof messenger !== "undefined") {
        browser.composeScripts.register({
            js: [
                { file: "/content_scripts/autocorrect.js" },
            ],
        });
    }
}

BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_BACKGROUND, (request) => {
    // clear cache by reloading all options
    // await AddonSettings.loadOptions();

    return sendSettings(request.optionValue);
});
