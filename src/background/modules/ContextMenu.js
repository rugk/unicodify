import * as UnicodeTransformationHandler from "/common/modules/UnicodeTransformationHandler.js";
import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";
import * as Notifications from "/common/modules/Notifications.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import { menuStructure, SEPARATOR_ID, TRANSFORMATION_TYPE } from "/common/modules/data/Fonts.js";

const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird
const PREVIEW_STRING_CUT_LENGTH = 100; // a setting that may improve performance by not calculating invisible parts of the context menu

let lastCachedUnicodeFontSettings = null;
let menuIsShown = false;

let pasteSymbol = null;

/**
 * Copy text to clipboard and show notification when unable to do transformation directly.
 * Thunderbird workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1641575
 *
 * @param {string} text
 * @param {string} fieldId
 * @returns {void}
 */
function fallback(text, fieldId) {
    navigator.clipboard.writeText(text);
    // This will need to be localized
    Notifications.showNotification(`📋 Press ${pasteSymbol}-V`, `Add-ons in Thunderbird are currently unable to access the “${fieldId.startsWith("compose") ? fieldId.slice("compose".length) : fieldId}” field directly, so the transformed text has been copied to your clipboard.\nPlease press ${pasteSymbol}-V to do the transformation.`);
}

/**
 * Handle selection of a context menu item.
 *
 * This will trigger the actual action of transforming the selected text.
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {void}
 * @throws {Error}
 */
function handleMenuChoosen(info, tab) {
    let text = info.selectionText;

    if (!text) {
        return;
    }

    text = text.normalize();
    const output = UnicodeTransformationHandler.transformText(text, info.menuItemId);

    // Thunderbird workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1641575
    if (info.fieldId) {
        fallback(output, info.fieldId);
        return;
    }

    browser.tabs.executeScript(tab.id, {
        code: `insertIntoPage("${output}");`,
        frameId: info.frameId
    });
}

/**
 * Potentially adjust context menu display if it is shown.
 *
 * This does not always change some things, but it e.g.
 * * hides the menu when no text is selected
 * * and shows the result of the text transformation if the live preview feature is enabled
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {void}
 * @throws {Error}
 */
async function handleMenuShown(info) {
    if (!info.editable) {
        return;
    }

    let text = info.selectionText;

    // do not show menu entry when no text is selected
    if (!text) {
        await menus.removeAll();
        menuIsShown = false;
        return menus.refresh();
    }
    // shorten preview text as it may not be shown anyway
    if (text.length > PREVIEW_STRING_CUT_LENGTH) {
        // to be sure, we append … anyway, in case some strange OS has a tooltip for context menus or so
        text = `${text.substring(0, PREVIEW_STRING_CUT_LENGTH)}…`;
    }
    text = text.normalize();

    if (!lastCachedUnicodeFontSettings.livePreview) {
        if (menuIsShown) {
            return;
        }

        // continue re-creating deleted menu, but without any example text
        text = null;
    }

    await buildMenu(lastCachedUnicodeFontSettings, text, menuIsShown);

    menus.refresh();
}

/**
 * Apply (new) menu item settings by (re)creating or updating/refreshing the context menu.
 *
 * @param {Object} unicodeFontSettings
 * @param {string?} [exampleText=null]
 * @returns {void}
 */
async function buildMenu(unicodeFontSettings, exampleText = null) {
    if (unicodeFontSettings.changeFont) {
        await addMenuItems(menuStructure[TRANSFORMATION_TYPE.FONT], unicodeFontSettings, exampleText);
    }
    if (unicodeFontSettings.changeFont &&
        unicodeFontSettings.changeCase &&
        !menuIsShown) {
        await menus.create({
            id: "seperator-case-font",
            type: "separator",
            contexts: ["editable"]
        });
    }
    if (unicodeFontSettings.changeCase) {
        await addMenuItems(menuStructure[TRANSFORMATION_TYPE.CASING], unicodeFontSettings, exampleText);
    }

    menuIsShown = true;
}

/**
 * Add Unicode menu items.
 *
 * @param {string[]} menuItems
 * @param {Object} [unicodeFontSettings]
 * @param {string?} [exampleText=null]
 * @returns {void}
 */
async function addMenuItems(menuItems, unicodeFontSettings = lastCachedUnicodeFontSettings, exampleText = null) {
    for (const transformationId of menuItems) {
        if (transformationId === SEPARATOR_ID) {
            if (menuIsShown) {
                continue;
            }

            await menus.create({
                // id: id,
                type: "separator",
                contexts: ["editable"]
            });
            continue;
        }

        const translatedMenuText = browser.i18n.getMessage(transformationId);
        let textToBeTransformed = translatedMenuText;
        if (unicodeFontSettings.livePreview && exampleText) {
            textToBeTransformed = exampleText;
        }
        const transformedText = UnicodeTransformationHandler.transformText(textToBeTransformed, transformationId);

        let menuText = transformedText;
        if (unicodeFontSettings.showReadableText) {
            menuText = browser.i18n.getMessage("menuReadableTextWrapper", [translatedMenuText, transformedText]);
        }
        menuText = menuText.replaceAll("&", "&&");

        if (menuIsShown) {
            menus.update(transformationId, {
                "title": menuText,
            });
        } else {
            await menus.create({
                "id": transformationId,
                "title": menuText,
                "contexts": ["editable"],
            });
        }
    }
}

BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UPDATE_CONTEXT_MENU, async (message) => {
    // console.log(message);
    let text = message.selection;

    // do not show menu entry when no text is selected
    if (!text) {
        await menus.removeAll();
        menuIsShown = false;
        return;
    }
    // shorten preview text as it may not be shown anyway
    if (text.length > PREVIEW_STRING_CUT_LENGTH) {
        // to be sure, we append … anyway, in case some strange OS has a tooltip for context menus or so
        text = `${text.substring(0, PREVIEW_STRING_CUT_LENGTH)}…`;
    }
    text = text.normalize();

    if (!lastCachedUnicodeFontSettings.livePreview) {
        if (menuIsShown) {
            return;
        }

        // continue re-creating deleted menu, but without any example text
        text = null;
    }

    await buildMenu(lastCachedUnicodeFontSettings, text, true);
});

/**
 * Init Unicode font module.
 *
 * @public
 * @returns {void}
 */
export async function init() {
    const platformInfo = await browser.runtime.getPlatformInfo();
    // Remove once https://bugzilla.mozilla.org/show_bug.cgi?id=1595822 is fixed
    if (platformInfo.os === "android") {
        return;
    }

    const unicodeFontSettings = await AddonSettings.get("unicodeFont");
    lastCachedUnicodeFontSettings = unicodeFontSettings;

    buildMenu(unicodeFontSettings);

    // feature detection for this feature, as it is not compatible with CHrome/ium.
    if (menus.onShown) {
        menus.onShown.addListener(handleMenuShown);
    }
    menus.onClicked.addListener(handleMenuChoosen);

    pasteSymbol = platformInfo.os === "mac" ? "\u2318" : "Ctrl";
}

BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT, async (request) => {
    lastCachedUnicodeFontSettings = request.optionValue;

    await menus.removeAll();
    menuIsShown = false;
    return buildMenu(request.optionValue);
});
