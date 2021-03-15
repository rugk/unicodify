import * as UnicodeTransformationHandler from "/common/modules/UnicodeTransformationHandler.js";
import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";
import { isMobile } from "/common/modules/MobileHelper.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import { menuStructure, SEPARATOR_ID, TRANSFORMATION_TYPE } from "/common/modules/data/Fonts.js";

const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird
const PREVIEW_STRING_CUT_LENGTH = 1000; // a setting that may improve performance by not calculating invisible parts of the context menu

let lastCachedUnicodeFontSettings = null;

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
    const menuItem = info.menuItemId;
    const output = UnicodeTransformationHandler.transformText(text, menuItem);

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
    let text = info.selectionText;

    // do not show menu entry when no text is selected
    if (!text) {
        await menus.removeAll();
        return menus.refresh();
    }
    // shorten preview text as it may not be shown anyway
    if (text.length > PREVIEW_STRING_CUT_LENGTH) {
        // to be sure, we append … anyway, in case some strange OS has a tooltip for context menus or so
        text = `${text.substr(0, PREVIEW_STRING_CUT_LENGTH)}…`;
    }
    text = text.normalize();

    const menuIsShown = info.menuIds.length > 0;
    if (!lastCachedUnicodeFontSettings.livePreview) {
        if (menuIsShown) {
            return Promise.resolve();
        }

        // continue re-creating deleted menu, but without any example text
        text = null;
    }

    buildMenu(lastCachedUnicodeFontSettings, text, menuIsShown);

    menus.refresh();
    return Promise.resolve();
}

/**
 * Apply (new) menu item settings by (re)creating or updating/refreshing the context menu.
 *
 * @param {Object} unicodeFontSettings
 * @param {string?} [exampleText=null]
 * @param {bool?} [refreshMenu=false]
 * @returns {void}
 */
function buildMenu(unicodeFontSettings, exampleText = null, refreshMenu = false) {
    if (unicodeFontSettings.changeFont) {
        addMenuItems(menuStructure[TRANSFORMATION_TYPE.FONT], unicodeFontSettings, exampleText, refreshMenu);
    }
    if (unicodeFontSettings.changeFont &&
        unicodeFontSettings.changeCase &&
        !refreshMenu) {
        menus.create({
            id: "seperator-case-font",
            type: "separator",
            contexts: ["editable"]
        });
    }
    if (unicodeFontSettings.changeCase) {
        addMenuItems(menuStructure[TRANSFORMATION_TYPE.CASING], unicodeFontSettings, exampleText, refreshMenu);
    }
}

/**
 * Add Unicode menu items.
 *
 * @param {string[]} menuItems
 * @param {Object} [unicodeFontSettings]
 * @param {string?} [exampleText=null]
 * @param {bool?} [refreshMenu=false]
 * @returns {void}
 */
function addMenuItems(menuItems, unicodeFontSettings = lastCachedUnicodeFontSettings, exampleText = null, refreshMenu = false) {
    for (const transformationId of menuItems) {
        if (transformationId === SEPARATOR_ID) {
            if (refreshMenu) {
                continue;
            }

            menus.create({
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

        if (refreshMenu) {
            menus.update(transformationId, {
                "title": menuText,
                "contexts": ["editable"],
            });
        } else {
            menus.create({
                "id": transformationId,
                "title": menuText,
                "contexts": ["editable"],
            });
        }
    }
}

/**
 * Init Unicode font module.
 *
 * @public
 * @returns {void}
 */
export async function init() {
    // Remove once https://bugzilla.mozilla.org/show_bug.cgi?id=1595822 is fixed
    if (await isMobile()) {
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

    BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT, async (request) => {
        lastCachedUnicodeFontSettings = request.optionValue;

        await menus.removeAll();
        return buildMenu(request.optionValue);
    });
}
