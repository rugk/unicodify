import * as UnicodeTransformationHandler from "/common/modules/UnicodeTransformationHandler.js";
import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";
import { isMobile } from "/common/modules/MobileHelper.js";
import * as Notifications from "/common/modules/Notifications.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import { menuStructure, SEPARATOR_ID_PREFIX, TRANSFORMATION_TYPE } from "/common/modules/data/Fonts.js";

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
    const fieldName = fieldId.startsWith("compose") ? fieldId.slice("compose".length) : fieldId;
    Notifications.showNotification(
        "menuNotificationPressCtrlVTitle",
        "menuNotificationPressCtrlVContent",
        [
            pasteSymbol,
            fieldName
        ], true);
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

    browser.tabs.sendMessage(tab.id, {
        type: COMMUNICATION_MESSAGE_TYPE.INSERT,
        text: output
    }, { frameId: info.frameId });
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
 * @returns {Promise<void>}
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
        text = `${text.slice(0, PREVIEW_STRING_CUT_LENGTH)}…`;
    }
    text = text.normalize();

    if (!lastCachedUnicodeFontSettings.livePreview) {
        if (menuIsShown) {
            return;
        }

        // continue re-creating deleted menu, but without any example text
        text = null;
    }

    await buildMenu(lastCachedUnicodeFontSettings, text);

    menus.refresh();
}

/**
 * Apply (new) menu item settings by (re)creating or updating/refreshing the context menu.
 *
 * @param {Object} unicodeFontSettings
 * @param {string?} [exampleText=null]
 * @returns {Promise<void>}
 */
async function buildMenu(unicodeFontSettings, exampleText = null) {
    if (unicodeFontSettings.changeFont) {
        await addMenuItems(menuStructure[TRANSFORMATION_TYPE.FONT], unicodeFontSettings, exampleText);
    }
    if (!unicodeFontSettings.nested &&
        unicodeFontSettings.changeFont &&
        unicodeFontSettings.changeFormat &&
        !menuIsShown) {
        await menus.create({
            id: "seperator-format-font",
            type: "separator",
            contexts: ["editable"]
        });
    }
    if (unicodeFontSettings.changeFormat) {
        await addMenuItems(menuStructure[TRANSFORMATION_TYPE.FORMAT], unicodeFontSettings, exampleText);
    }
    if (!unicodeFontSettings.nested &&
        (unicodeFontSettings.changeFont || unicodeFontSettings.changeFormat) &&
        unicodeFontSettings.changeCase &&
        !menuIsShown) {
        await menus.create({
            id: "seperator-case-format",
            type: "separator",
            contexts: ["editable"]
        });
    }
    if (unicodeFontSettings.changeCase) {
        await addMenuItems(menuStructure[TRANSFORMATION_TYPE.CASING], unicodeFontSettings, exampleText);
    }
    if (!unicodeFontSettings.nested &&
        (unicodeFontSettings.changeFont || unicodeFontSettings.changeFormat || unicodeFontSettings.changeCase) &&
        unicodeFontSettings.changeCodeCase &&
        !menuIsShown) {
        await menus.create({
            id: "seperator-code-case",
            type: "separator",
            contexts: ["editable"]
        });
    }
    if (unicodeFontSettings.changeCodeCase) {
        await addMenuItems(menuStructure[TRANSFORMATION_TYPE.CODE_CASING], unicodeFontSettings, exampleText);
    }

    menuIsShown = true;
}

/**
 * Create Unicode menu items.
 *
 * @param {string|null} transformationId
 * @param {string[]} menuItems
 * @param {Object} unicodeFontSettings
 * @param {string?} exampleText
 * @returns {Promise<void>}
 */
async function createMenu(transformationId, menuItems, unicodeFontSettings, exampleText) {
    for (const currentTransformationId of menuItems) {
        const translatedMenuText = browser.i18n.getMessage(currentTransformationId);
        const textToBeTransformed = unicodeFontSettings.livePreview && exampleText ? exampleText : translatedMenuText;
        const transformedText = UnicodeTransformationHandler.transformText(textToBeTransformed, currentTransformationId);

        let menuText = unicodeFontSettings.showReadableText ? browser.i18n.getMessage("menuReadableTextWrapper", [translatedMenuText, transformedText]) : transformedText;
        menuText = menuText.replaceAll("&", "&&");
        if (menuIsShown) {
            menus.update(currentTransformationId, {
                title: menuText,
                enabled: !exampleText || exampleText !== transformedText
            });
        } else {
            await menus.create({
                id: currentTransformationId,
                parentId: transformationId,
                title: menuText,
                enabled: !exampleText || exampleText !== transformedText,
                contexts: ["editable"]
            });
        }
    }
}

/**
 * Add Unicode menu items.
 *
 * @param {Object.<string, string[]>} menuItems
 * @param {Object} [unicodeFontSettings]
 * @param {string?} [exampleText=null]
 * @returns {Promise<void>}
 */
async function addMenuItems(menuItems, unicodeFontSettings = lastCachedUnicodeFontSettings, exampleText = null) {
    for (const [transformationId, currentMenuItems] of Object.entries(menuItems)) {
        if (transformationId.startsWith(SEPARATOR_ID_PREFIX)) {
            if (unicodeFontSettings.nested || menuIsShown) {
                continue;
            }

            await menus.create({
                // id: id,
                type: "separator",
                contexts: ["editable"]
            });
            continue;
        }

        if (unicodeFontSettings.nested && currentMenuItems.length > 1) {
            const translatedMenuText = browser.i18n.getMessage(transformationId);
            if (menuIsShown) {
                menus.update(transformationId, {
                    title: translatedMenuText
                });
            } else {
                await menus.create({
                    id: transformationId,
                    title: translatedMenuText,
                    contexts: ["editable"]
                });
            }
            await createMenu(transformationId, currentMenuItems, unicodeFontSettings, exampleText);
        } else {
            await createMenu(null, currentMenuItems, unicodeFontSettings, exampleText);
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
        text = `${text.slice(0, PREVIEW_STRING_CUT_LENGTH)}…`;
    }
    text = text.normalize();

    if (!lastCachedUnicodeFontSettings.livePreview) {
        if (menuIsShown) {
            return;
        }

        // continue re-creating deleted menu, but without any example text
        text = null;
    }

    await buildMenu(lastCachedUnicodeFontSettings, text);
});

/**
 * Init Unicode font module.
 *
 * @public
 * @returns {Promise<void>}
 */
export async function init() {
    const platformInfo = await browser.runtime.getPlatformInfo();
    // Remove once https://bugzilla.mozilla.org/show_bug.cgi?id=1595822 is fixed
    if (await isMobile()) { // platformInfo.os === "android"
        return;
    }

    const unicodeFontSettings = await AddonSettings.get("unicodeFont");
    lastCachedUnicodeFontSettings = unicodeFontSettings;

    buildMenu(unicodeFontSettings);

    // feature detection for this feature, as it is not compatible with Chrome/ium.
    if (menus.onShown) {
        menus.onShown.addListener(handleMenuShown);
    }
    menus.onClicked.addListener(handleMenuChoosen);

    pasteSymbol = platformInfo.os === "mac" ? "\u2318" : browser.i18n.getMessage("menuCtrlKey");
}

BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT, async (request) => {
    lastCachedUnicodeFontSettings = request.optionValue;

    await menus.removeAll();
    menuIsShown = false;
    return buildMenu(request.optionValue);
});
