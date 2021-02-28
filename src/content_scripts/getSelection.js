"use strict";

/**
 * Returns the current selection.
 *
 * @function
 * @returns {string}
 */
function getSelection() { // eslint-disable-line no-unused-vars
    // does not work in Firefox currently
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=85686
    let text = window.getSelection().toString();

    if (text) {
        return text;
    }

    const elFocused = document.activeElement;
    const start = elFocused.selectionStart;
    const end = elFocused.selectionEnd;
    text = elFocused.value.substring(start, finish);
    if (text) {
        return text;
    }

    throw new Error("nothing selected");
}

getSelection();
