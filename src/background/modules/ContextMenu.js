import * as UnicodeTransformationHandler from "/common/modules/UnicodeTransformationHandler.js"
import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as BrowserCommunication from "/common/modules/BrowserCommunication/BrowserCommunication.js";
import { isMobile } from "/common/modules/MobileHelper.js";

import { COMMUNICATION_MESSAGE_TYPE } from "/common/modules/data/BrowserCommunicationTypes.js";
import { menuStructure, SEPARATOR_ID, TRANSFORMATION_TYPE } from "/common/modules/data/Fonts.js";

const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird

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

    if (text) {
        text = text.normalize();
        const menuItem = info.menuItemId;
        const output = UnicodeTransformationHandler.transformText(text, menuItem);

        browser.tabs.executeScript(tab.id, {
            code: `insertIntoPage("${output}");`,
            frameId: info.frameId
        });
    }
}

/**
 * Apply (new) menu item settings by (re)creating the context menu.
 *
 * @param {Object} unicodeFontSettings
 * @returns {void}
 */
function buildMenu(unicodeFontSettings) {
    menus.removeAll();

    var addedEntries = false;
    for (const transformationId of menuStructure) {
        if (transformationId === SEPARATOR_ID) {
            if (!addedEntries) {
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
        if (transformationType == TRANSFORMATION_TYPE.CASING &&
            !unicodeFontSettings.changeCase) {
            continue;
        }
        if (transformationType == TRANSFORMATION_TYPE.FONT &&
            !unicodeFontSettings.changeFont) {
            continue;
        }

        const translatedMenuText = browser.i18n.getMessage(transformationId);
        let translatedMenuTextTransformed = UnicodeTransformationHandler.transformText(translatedMenuText, transformationId);

        menus.create({
            "id": transformationId,
            "title": translatedMenuTextTransformed,
            "contexts": ["editable"],
        });
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
    if (await isMobile()) {
        return;
    }

    const unicodeFontSettings = await AddonSettings.get("unicodeFont");

    buildMenu(unicodeFontSettings);

    menus.onClicked.addListener(handleMenuChoosen);

    BrowserCommunication.addListener(COMMUNICATION_MESSAGE_TYPE.UNICODE_FONT, (request) => {
        // clear cache by reloading all options
        // await AddonSettings.loadOptions();

        return buildMenu(request.optionValue);
    });
}
