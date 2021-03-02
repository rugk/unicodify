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
 * Handle context menu click.
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
 * Handle context menu click.
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
    let addedEntries = false;
    for (const transformationId of menuStructure) {
        if (transformationId === SEPARATOR_ID) {
            if (!addedEntries || refreshMenu) {
                continue;
            }

            menus.create({
                // id: id,
                type: "separator",
                contexts: ["editable"]
            });
            continue;
        }

        const transformationType = UnicodeTransformationHandler.getTransformationType(transformationId);
        if (transformationType === TRANSFORMATION_TYPE.CASING &&
            !unicodeFontSettings.changeCase) {
            continue;
        }
        if (transformationType === TRANSFORMATION_TYPE.FONT &&
            !unicodeFontSettings.changeFont) {
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
        addedEntries = true;
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

    // TODO: check Chrome/ium comaptibility here (this workaround should make it work for now)
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
