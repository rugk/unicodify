/**
 * Starter module for addon settings site.
 *
 * @requires modules/OptionHandler
 */

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";
import * as RandomTips from "/common/modules/RandomTips/RandomTips.js";

import * as CustomOptionTriggers from "./modules/CustomOptionTriggers.js";

// init modules
CustomOptionTriggers.registerTrigger();
AutomaticSettings.setDefaultOptionProvider(AddonSettings.getDefaultValue);
AutomaticSettings.init();

RandomTips.init("/common/modules/data/Tips.js").then(() => {
    RandomTips.setContext("options");
    RandomTips.showRandomTipIfWanted();
});
