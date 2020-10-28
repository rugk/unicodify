/**
 * This modules contains the custom triggers for some options that are added.
 *
 * @module modules/CustomOptionTriggers
 */

import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";


/**
 * Requests the permission for autocorrect settings.
 *
 * @private
 * @param  {Object} optionValue
 * @param  {string} [option]
 * @param  {Object} [event]
 * @returns {Promise}
 */
function applyAutocorrectPermissions(optionValue, option, event) {
    // trigger update for current session
    browser.runtime.sendMessage({
        "type": COMMUNICATION_MESSAGE_TYPE.AUTOCORRECT_BACKGROUND,
        "optionValue": optionValue
    });
}


/**
 * Binds the triggers.
 *
 * This is basically the "init" method.
 *
 * @function
 * @returns {Promise}
 */
export function registerTrigger() {
    // update slider status
    AutomaticSettings.Trigger.registerSave("autocorrect", applyAutocorrectPermissions);
}
