"use strict";

const fractions = Object.freeze({
    "¼": 1.0 / 4.0,
    "½": 1.0 / 2.0,
    "¾": 3.0 / 4.0,
    "⅐": 1.0 / 7.0,
    "⅑": 1.0 / 9.0,
    "⅒": 1.0 / 10.0,
    "⅓": 1.0 / 3.0,
    "⅔": 2.0 / 3.0,
    "⅕": 1.0 / 5.0,
    "⅖": 2.0 / 5.0,
    "⅗": 3.0 / 5.0,
    "⅘": 4.0 / 5.0,
    "⅙": 1.0 / 6.0,
    "⅚": 5.0 / 6.0,
    "⅛": 1.0 / 8.0,
    "⅜": 3.0 / 8.0,
    "⅝": 5.0 / 8.0,
    "⅞": 7.0 / 8.0
});

const constants = Object.freeze({
    "π": Math.PI,
    "e": Math.E
});

// communication type
// directly include magic constant as a workaround as we cannot import modules in content scripts due to https://bugzilla.mozilla.org/show_bug.cgi?id=1451545
const AUTOCORRECT_CONTENT = "autocorrectContent";

let insertedText; // Last insert text
let deletedText; // Last deleted text
let lastTarget; // Last target
let lastCaretPosition; // Last caret position

let quotes = true;
let fracts = true;

let autocorrections = {};

let longest = 0;

// Regular expressions
let symbolpatterns = null;
// Exceptions, do not autocorrect for these patterns
let antipatterns = null;

// Chrome
// Adapted from: https://github.com/mozilla/webextension-polyfill/blob/master/src/browser-polyfill.js
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

/**
 * Get caret position.
 *
 * @param {Object} target
 * @returns {number}
 */
function getCaretPosition(target) {
    // ContentEditable elements
    if (target.isContentEditable || document.designMode === "on") {
        target.focus();
        const _range = document.getSelection().getRangeAt(0);
        if (!_range.collapsed) {
            return null;
        }
        const range = _range.cloneRange();
        const temp = document.createTextNode("\0");
        range.insertNode(temp);
        const caretposition = target.innerText.indexOf("\0");
        temp.parentNode.removeChild(temp);
        return caretposition;
    }
    // input and textarea fields
    else {
        if (target.selectionStart !== target.selectionEnd) {
            return null;
        }
        return target.selectionStart;
    }
}

/**
 * Insert at caret in the given element.
 * Adapted from: https://www.everythingfrontend.com/posts/insert-text-into-textarea-at-cursor-position.html
 *
 * @param {Object} target
 * @param {string} atext
 * @throws {Error} if nothing is selected
 * @returns {void}
 */
function insertAtCaret(target, atext) {
    // document.execCommand is deprecated, although there is not yet an alternative: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
    // insertReplacementText
    if(document.execCommand("insertText", false, atext)) {
        return;
    }

    // Firefox input and textarea fields: https://bugzilla.mozilla.org/show_bug.cgi?id=1220696
    if (typeof target.setRangeText === "function") {
        const start = target.selectionStart;
        const end = target.selectionEnd;

        if (start !== undefined && end !== undefined) {
            target.setRangeText(atext);

            target.selectionStart = target.selectionEnd = start + atext.length;

            // Notify any possible listeners of the change
            const event = document.createEvent("UIEvent");
            event.initEvent("input", true, false);
            target.dispatchEvent(event);

            return;
        }
    }

    throw new Error("nothing selected");
}

/**
 * Insert into page.
 *
 * @param {string} atext
 * @returns {void}
 */
function insertIntoPage(atext) {
    return insertAtCaret(document.activeElement, atext);
}

/**
 * Count Unicode characters.
 * Adapted from: https://blog.jonnew.com/posts/poo-dot-length-equals-two
 *
 * @param {string} str
 * @returns {number}
 */
function countChars(str) {
    // removing the joiners
    const split = str.split("\u{200D}");
    let count = 0;

    for (const s of split) {
        // removing the variation selectors
        count += Array.from(s.split(/[\ufe00-\ufe0f]/).join("")).length;
    }

    return count;
}

/**
 * Delete at caret.
 *
 * @param {Object} target
 * @param {string} atext
 * @returns {void}
 */
function deleteCaret(target, atext) {
    const count = countChars(atext);
    if (count > 0) {
        // document.execCommand is deprecated, although there is not yet an alternative: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
        if (document.execCommand("delete", false)) {
            for (let i = 0; i < count - 1; ++i) {
                document.execCommand("delete", false);
            }
        }
        // Firefox input and textarea fields: https://bugzilla.mozilla.org/show_bug.cgi?id=1220696
        else if (typeof target.setRangeText === "function") {
            const start = target.selectionStart;

            target.selectionStart = start - atext.length;
            target.selectionEnd = start;
            target.setRangeText("");

            // Notify any possible listeners of the change
            const e = document.createEvent("UIEvent");
            e.initEvent("input", true, false);
            target.dispatchEvent(e);
        }
    }
}

/**
 * Convert fractions and constants to Unicode characters.
 * Adapted from: https://github.com/tdulcet/Tables-and-Graphs/blob/master/graphs.hpp
 *
 * @param {number} anumber
 * @param {number} afraction
 * @returns {string}
 */
function outputLabel(anumber, afraction) {
    let output = false;

    const number = parseFloat(anumber);
    let intpart = Math.trunc(number);
    const fractionpart = afraction ? parseFloat(afraction) : Math.abs(number % 1);

    let str = "";

    for (const fraction in fractions) {
        if (Math.abs(fractionpart - fractions[fraction]) < Number.EPSILON) {
            if (intpart !== 0) {
                str += intpart;
            }

            str += fraction;

            output = true;
            break;
        }
    }

    if (Math.abs(number) >= Number.EPSILON && !output) {
        for (const constant in constants) {
            if (!output && number % constants[constant] === 0) {
                intpart = number / constants[constant];

                if (intpart === -1) {
                    str += "-";
                } else if (intpart !== 1) {
                    str += intpart;
                }

                str += constant;

                output = true;
                break;
            }
        }
    }

    if (!output) {
        str += anumber;
    }

    return str;
}

/**
 * Get first difference index.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function firstDifferenceIndex(a, b) {
    if (a === b) {
        return -1;
    }
    let i = 0;
    while (a[i] === b[i]) {
        ++i;
    }
    return i;
}

/**
 * Autocorrect on text input even by evaluating the keys and replacing the characters/string.
 *
 * @param {Object} event
 * @returns {void}
 */
function autocorrect(event) {
    // console.log('beforeinput', event.inputType, event.data);
    if (!(event.inputType === "insertText" || event.inputType === "insertCompositionText" || event.inputType === "insertParagraph" || event.inputType === "insertLineBreak")) {
        return;
    }
    if (!symbolpatterns) {
        throw new Error("Emoji autocorrect settings have not been received. Do not autocorrect.");
    }
    const target = event.target;
    const caretposition = getCaretPosition(target);
    if (caretposition) {
        const value = target.value || target.innerText;
        let deletecount = 0;
        let insert = event.inputType === "insertLineBreak" || event.inputType === "insertParagraph" ? "\n" : event.data;
        const inserted = insert;
        let output = false;
        // Use Unicode smart quotes
        if (quotes && (insert === "'" || insert === '"')) {
            const previouschar = value.slice(caretposition < 1 ? 0 : caretposition - 1, caretposition);
            // White space
            const re = /^\s*$/;
            if (insert === "'") {
                insert = re.test(previouschar) ? "‘" : "’";
            } else if (insert === '"') {
                insert = re.test(previouschar) ? "“" : "”";
            }
            output = true;
        }
        const previousText = value.slice(caretposition < longest ? 0 : caretposition - longest, caretposition);
        const regexResult = symbolpatterns.exec(previousText);
        // Autocorrect Unicode Symbols
        if (regexResult) {
            const length = longest - 1;
            const text = value.slice(caretposition < length ? 0 : caretposition - length, caretposition) + inserted;
            const aregexResult = symbolpatterns.exec(text);
            const aaregexResult = antipatterns.exec(text);
            if (!aaregexResult && (!aregexResult || (caretposition <= longest ? regexResult.index < aregexResult.index : regexResult.index <= aregexResult.index))) {
                insert = autocorrections[regexResult[0]] + inserted;
                deletecount = regexResult[0].length;
                output = true;
            }
        } else {
            // Convert fractions and mathematical constants to Unicode characters
            if (!output && fracts) {
                // Numbers regular expression: https://regex101.com/r/7jUaSP/10
                // Do not match version numbers: https://github.com/rugk/unicodify/issues/40
                const numberRegex = /(?<!\.)\d+(?<fractionpart>\.\d+)?$/;
                const previousText = value.slice(0, caretposition);
                const regexResult = numberRegex.exec(previousText);
                if (regexResult && insert !== ".") {
                    const text = value.slice(0, caretposition) + inserted;
                    const aregexResult = numberRegex.exec(text);
                    if (!aregexResult) {
                        const label = outputLabel(regexResult[0], regexResult.groups.fractionpart);
                        const index = firstDifferenceIndex(label, regexResult[0]);
                        if (index >= 0) {
                            insert = label.slice(index) + inserted;
                            deletecount = regexResult[0].length - index;
                            output = true;
                        }
                    }
                }
            }
        }
        if (output) {
            event.preventDefault();

            const text = deletecount ? value.slice(caretposition - deletecount, caretposition) : "";
            if (text) {
                deleteCaret(target, text);
            }
            insertAtCaret(target, insert);

            insertedText = insert;
            deletedText = text + inserted;
            console.debug("Autocorrect: “%s” was replaced with “%s”.", deletedText, insertedText);

            lastTarget = target;
            lastCaretPosition = caretposition - deletecount + insert.length;
        }
    }
}

/**
 * Undo autocorrect in case the backspace has been pressed.
 *
 * @param {Object} event
 * @returns {void}
 */
function undoAutocorrect(event) {
    // console.log('beforeinput', event.inputType, event.data);
    // Backspace
    if (event.inputType !== "deleteContentBackward") {
        return;
    }
    const target = event.target;
    const caretposition = getCaretPosition(target);
    if (caretposition) {
        if (target === lastTarget && caretposition === lastCaretPosition) {
            event.preventDefault();

            if (insertedText) {
                lastTarget = null;
                deleteCaret(target, insertedText);
            }
            if (deletedText) {
                insertAtCaret(target, deletedText);
            }
            console.debug("Undo autocorrect: “%s” was replaced with “%s”.", insertedText, deletedText);
        }

        lastTarget = null;
    }
}

/**
 * Handle response from the autocorrect module.
 *
 * @param {Object} message
 * @param {Object} sender
 * @returns {void}
 */
function handleResponse(message, sender) {
    if (message.type !== AUTOCORRECT_CONTENT) {
        return;
    }
    quotes = message.quotes;
    fracts = message.fracts;
    autocorrections = message.autocorrections;
    longest = message.longest;
    symbolpatterns = IS_CHROME ? new RegExp(message.symbolpatterns) : message.symbolpatterns;
    antipatterns = IS_CHROME ? new RegExp(message.antipatterns) : message.antipatterns;
    // console.log(message);
}

/**
 * Handle errors from messages and responses.
 *
 * @param {string} error
 * @returns {void}
 */
function handleError(error) {
    console.error(`Error: ${error}`);
}

browser.runtime.sendMessage({ "type": AUTOCORRECT_CONTENT }).then(handleResponse, handleError);
browser.runtime.onMessage.addListener(handleResponse);
window.addEventListener("beforeinput", undoAutocorrect, true);
window.addEventListener("beforeinput", autocorrect, true);
console.log("Unicodify autocorrect module loaded.");
