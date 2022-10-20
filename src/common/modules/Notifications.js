/**
 * Show a notification.
 *
 * @module common/modules/Notifications
 * @see {@link https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/user_interface/Notifications}
 */

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";


const ICON = browser.runtime.getManifest().icons[32];

export let SEND = true;

/**
 * Show a notification.
 *
 * @public
 * @param {string} title the title
 * @param {string} content the message content
 * @param {string[] | string} [substitutions] the message parameters to pass for i18n.getMessage
 * @returns {void}
 * @see {@link https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/notifications/create}
 */
export function showNotification(title, content, substitutions) {
    console.info("Showing notification:", title, content);

    if (!SEND) {
        return;
    }

    title = browser.i18n.getMessage(title, substitutions) || title;
    content = browser.i18n.getMessage(content, substitutions) || content;

    browser.notifications.create({
        type: "basic",
        iconUrl: browser.runtime.getURL(ICON),
        title: title,
        message: content
    });
}

/**
 * Init Notifications module.
 *
 * @returns {Promise<void>}
 */
async function init() {
    const notifications = await AddonSettings.get("notifications");

    SEND = notifications.send;
}

init();

BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.NOTIFICATIONS, async (request) => {
    const notifications = request.optionValue;

    SEND = notifications.send;
});
