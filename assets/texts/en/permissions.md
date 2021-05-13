# Requested permissions

For a general explanation of add-on permission see [this support article](https://support.mozilla.org/kb/permission-request-messages-firefox-extensions).

## Installation permissions

The following permissions are requested at the installation or when updating:

| Internal Id  | Permission                        | Explanation                      |
|:-------------|:----------------------------------|:---------------------------------|
| `<all_urls>` | Access your data for all websites | Needed for input auto-correction |
| `tabs`       | Access browser tabs               | Needed for input auto-correction |

## Feature-specific (optional) permissions

Currently, no permissions are requested when doing some specific actions.

## Hidden permissions

Additionally, it requests these permissions, which are not requested in Firefox when the add-on is installed, as they are not a serious permission.

| Internal Id      | Permission                   | Explanation                                                 |
|:-----------------|:-----------------------------|:------------------------------------------------------------|
| `storage`        | Access settings storage      | Needed for saving options                                   |
| `[context]menus` | Modify browser context menus | Needed for adding the context menus for text transformation |
