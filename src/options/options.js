/**
 * Starter module for addon settings site.
 *
 * @requires modules/OptionHandler
 */

import { tips } from "/common/modules/data/Tips.js";
import { getBrowserValue } from "/common/modules/BrowserCompat.js";
import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";
import * as RandomTips from "/common/modules/RandomTips/RandomTips.js";

import * as CustomOptionTriggers from "./modules/CustomOptionTriggers.js";

// init modules
CustomOptionTriggers.registerTrigger();
AutomaticSettings.setDefaultOptionProvider(AddonSettings.getDefaultValue);
AutomaticSettings.init();

RandomTips.init(tips).then(() => {
    RandomTips.setContext("options");
    RandomTips.showRandomTipIfWanted();
});

getBrowserValue({
    firefox: "https://addons.mozilla.org/firefox/addon/awesome-emoji-picker/?utm_source=unicodify-addon&utm_medium=addon&utm_content=unicodify-addon-settings-inline&utm_campaign=unicodify-addon-settings-inline",
    thunderbird: "https://addons.thunderbird.net/thunderbird/addon/awesome-emoji-picker/reviews/?utm_source=unicodify-addon&utm_medium=addon&utm_content=unicodify-addon-settings-inline&utm_campaign=unicodify-addon-settings-inline",
    chrome: "https://chrome.google.com/webstore/detail/awesome-emoji-picker/",
}).then((browserUrl) => {
    document.getElementById("link-awesome-emoji").href = browserUrl;
});
