/**
 * Show a notification.
 *
 * @module common/modules/Notifications
 * @see {@link https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/user_interface/Notifications}
 */

/**
 * Show a notification.
 *
 * @public
 * @param {string} title the title
 * @param {string} content the message content
 * @returns {Promise}
 * @see {@link https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/notifications/create}
 */
export function showNotification(title, content) {
    title = browser.i18n.getMessage(title) || title;
    content = browser.i18n.getMessage(content) || content;

    console.info("Showing notification:", title, content);
    browser.notifications.create({
        "type": "basic",
        "iconUrl": browser.runtime.getURL("icons/icon.svg"),
        "title": title,
        "message": content
    });
}
