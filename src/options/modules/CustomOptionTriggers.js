/**
 * This modules contains the custom triggers for some options that are added.
 *
 * @module modules/CustomOptionTriggers
 */

import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";
import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";

/**
 * Apply the new autocorrect settings.
 *
 * @private
 * @param  {Object} optionValue
 * @param  {string} [option]
 * @param  {Object} [event]
 * @returns {Promise<void>|void}
 */
function applyAutocorrectPermissions(optionValue, _option, _event) {
    if (optionValue.enabled) {
        document.getElementById("autocorrectSymbols").disabled = false;
        document.getElementById("autocorrectUnicodeQuotes").disabled = false;
        document.getElementById("autocorrectUnicodeFracts").disabled = false;
        document.getElementById("autocorrectUnicodeNumbers").disabled = false;
    } else {
        document.getElementById("autocorrectSymbols").disabled = true;
        document.getElementById("autocorrectUnicodeQuotes").disabled = true;
        document.getElementById("autocorrectUnicodeFracts").disabled = true;
        document.getElementById("autocorrectUnicodeNumbers").disabled = true;
    }

    // trigger update for current session
    browser.runtime.sendMessage({
        type: COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_BACKGROUND,
        optionValue
    });
}

/**
 * Apply the new Unicode font settings.
 *
 * @private
 * @param  {Object} optionValue
 * @param  {string} [option]
 * @param  {Object} [event]
 * @returns {void}
 */
function applyUnicodeFontSettings(optionValue) {
    // trigger update for current session
    browser.runtime.sendMessage({
        type: COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT,
        optionValue
    });
}

/**
 * Apply the new Notification settings.
 *
 * @private
 * @param  {Object} optionValue
 * @param  {string} [option]
 * @param  {Object} [event]
 * @returns {void}
 */
function applyNotificationSettings(optionValue) {
    // trigger update for current session
    browser.runtime.sendMessage({
        type: COMMUNICATION_MESSAGE_TYPE.NOTIFICATIONS,
        optionValue
    });
}

/**
 * Binds the triggers.
 *
 * This is basically the "init" method.
 *
 * @returns {void}
 */
export function registerTrigger() {
    // update slider status
    AutomaticSettings.Trigger.registerSave("autocorrect", applyAutocorrectPermissions);
    AutomaticSettings.Trigger.registerSave("unicodeFont", applyUnicodeFontSettings);
    AutomaticSettings.Trigger.registerSave("notifications", applyNotificationSettings);

    // handle loading of options correctly
    AutomaticSettings.Trigger.registerAfterLoad(AutomaticSettings.Trigger.RUN_ALL_SAVE_TRIGGER);
}
