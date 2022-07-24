/**
 * This modules contains the custom triggers for some options that are added.
 *
 * @module modules/CustomOptionTriggers
 */

import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";
import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";

// Thunderbird
// https://bugzilla.mozilla.org/show_bug.cgi?id=1641573
const IS_THUNDERBIRD = typeof messenger !== "undefined";

// Chrome
// Adapted from: https://github.com/mozilla/webextension-polyfill/blob/master/src/browser-polyfill.js
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;


/**
 * Apply the new autocorrect settings.
 *
 * @private
 * @param  {Object} optionValue
 * @param  {string} [option]
 * @param  {Object} [event]
 * @returns {Promise}
 */
function applyAutocorrectPermissions(optionValue, option, event) {
    if (optionValue.enabled) {
        if (option && event?.target?.name === "enabled") {
            // Remove IS_THUNDERBIRD once https://bugzilla.mozilla.org/show_bug.cgi?id=1780977 is fixed
            if (!IS_THUNDERBIRD && !IS_CHROME && !confirm("Are you sure you want to enable this experimental feature?")) {
                // Remove once https://github.com/TinyWebEx/AutomaticSettings/issues/21 is fixed
                event.target.checked = !optionValue.enabled;
                return Promise.reject();
            }
        }
        document.getElementById("autocorrectSymbols").disabled = false;
        document.getElementById("autocorrectUnicodeQuotes").disabled = false;
        document.getElementById("autocorrectUnicodeFracts").disabled = false;
    } else {
        document.getElementById("autocorrectSymbols").disabled = true;
        document.getElementById("autocorrectUnicodeQuotes").disabled = true;
        document.getElementById("autocorrectUnicodeFracts").disabled = true;
    }

    // trigger update for current session
    browser.runtime.sendMessage({
        "type": COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_BACKGROUND,
        "optionValue": optionValue
    });
}

/**
 * Apply the new Unicode font settings.
 *
 * @private
 * @param  {Object} optionValue
 * @param  {string} [option]
 * @param  {Object} [event]
 * @returns {Promise}
 */
function applyUnicodeFontSettings(optionValue) {
    // trigger update for current session
    browser.runtime.sendMessage({
        "type": COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT,
        "optionValue": optionValue
    });
}

/**
 * Binds the triggers.
 *
 * This is basically the "init" method.
 *
 * @returns {Promise}
 */
export function registerTrigger() {
    // update slider status
    AutomaticSettings.Trigger.registerSave("autocorrect", applyAutocorrectPermissions);
    AutomaticSettings.Trigger.registerSave("unicodeFont", applyUnicodeFontSettings);

    // handle loading of options correctly
    AutomaticSettings.Trigger.registerAfterLoad(AutomaticSettings.Trigger.RUN_ALL_SAVE_TRIGGER);
}
