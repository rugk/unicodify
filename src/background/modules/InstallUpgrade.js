/**
 * Upgrades user data on installation of new updates.
 *
 * @module InstallUpgrade
 */

import * as Notifications from "/common/modules/Notifications.js";
import { getBrowserValue } from "/common/modules/BrowserCompat.js";


const notifications = new Map();


browser.notifications.onClicked.addListener((notificationId) => {
    const url = notifications.get(notificationId);

    if (url) {
        browser.tabs.create({ url });
    }
});

browser.notifications.onClosed.addListener((notificationId) => {
    notifications.delete(notificationId);
});

/**
 * Checks whether an upgrade is needed.
 *
 * @see {@link https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled}
 * @private
 * @param {Object} details
 * @returns {void}
 */
function handleInstalled(details) {
    console.log(details);

    const manifest = browser.runtime.getManifest();
    switch (details.reason) {
    case "install":
        // TODO(to: 'rugk'): This will need to be localized
        Notifications.showNotification(`🎉 ${manifest.name} installed`, `Thank you for installing the “${manifest.name}” add-on!\nVersion: ${manifest.version}\n\nOpen the options/preferences page to configure this extension.`);
        break;
    case "update":
        if (Notifications.SEND) {
            const [major, minor, patch = 0] = details.previousVersion.split(".").map((x) => Number.parseInt(x, 10));
            // The autocorrection feature was disabled by default in version 0.5.1
            const disabled = major === 0 && (minor < 5 || minor === 5 && patch === 0);
            // TODO(to: 'rugk'): This will need to be localized
            browser.notifications.create({
                type: "basic",
                iconUrl: browser.runtime.getURL("icons/icon.svg"),
                title: `✨ ${manifest.name} updated`,
                message: `The “${manifest.name}” add-on has been updated to version ${manifest.version}. Click to see the release notes.\n\nThe experimental Unicode autocorrection feature ${disabled ? "has been disabled by default" : "was disabled by default in version 0.5.1"}. Open the options/preferences page to reenable.`
            }).then(async (notificationId) => {
                const url = await getBrowserValue({
                    firefox: `https://addons.mozilla.org/firefox/addon/unicodify-text-transformer/versions/${manifest.version}`,
                    thunderbird: `https://addons.thunderbird.net/thunderbird/addon/unicodify-text-transformer/versions/${manifest.version}`,
                    chrome: "" // The Chrome Web Store does not show release notes
                }) || `https://github.com/rugk/unicodify/releases/v${manifest.version}`;
                notifications.set(notificationId, url);
            });
        }
        break;
    }
}

browser.runtime.onInstalled.addListener(handleInstalled);

// Previous exit survey: https://forms.gle/P8ThPXAvbGEkshYDA
browser.runtime.setUninstallURL("https://cryptpad.fr/form/#/2/form/view/TyXGnnNjCOo+iC2qrvPzfO8NMK4jMg3pRKxL0mrYNs8/");
