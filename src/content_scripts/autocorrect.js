"use strict";

const fractions = Object.freeze({
    "¼": 1 / 4,
    "½": 1 / 2,
    "¾": 3 / 4,
    "⅐": 1 / 7,
    "⅑": 1 / 9,
    "⅒": 1 / 10,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅕": 1 / 5,
    "⅖": 2 / 5,
    "⅗": 3 / 5,
    "⅘": 4 / 5,
    "⅙": 1 / 6,
    "⅚": 5 / 6,
    "⅛": 1 / 8,
    "⅜": 3 / 8,
    "⅝": 5 / 8,
    "⅞": 7 / 8
});

const constants = Object.freeze({
    π: Math.PI,
    e: Math.E
});

// communication type
// directly include magic constant as a workaround as we cannot import modules in content scripts due to https://bugzilla.mozilla.org/show_bug.cgi?id=1451545
const AUTOCORRECT_CONTENT = "autocorrectContent";
const INSERT = "insert";

let insertedText; // Last insert text
let deletedText; // Last deleted text
let lastTarget; // Last target
let lastCaretPosition; // Last caret position

let enabled = false;
let quotes = true;
let fracts = true;

let autocorrections = {};

let longest = 0;

// Regular expressions
let symbolpatterns = null;
// Exceptions, do not autocorrect for these patterns
let antipatterns = null;

let running = false;

// Chrome
// Adapted from: https://github.com/mozilla/webextension-polyfill/blob/master/src/browser-polyfill.js
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

/**
 * Get caret position.
 *
 * @param {HTMLElement} target
 * @returns {number|null}
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
        temp.remove();
        return caretposition;
    }
    // input and textarea fields

    if (target.selectionStart !== target.selectionEnd) {
        return null;
    }
    return target.selectionStart;
}

/**
 * Insert at caret in the given element.
 * Adapted from: https://www.everythingfrontend.com/posts/insert-text-into-textarea-at-cursor-position.html
 *
 * @param {HTMLElement} target
 * @param {string} atext
 * @throws {Error} if nothing is selected
 * @returns {void}
 */
function insertAtCaret(target, atext) {
    // document.execCommand is deprecated, although there is not yet an alternative: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
    // insertReplacementText
    if (document.execCommand("insertText", false, atext)) {
        return;
    }

    // Firefox input and textarea fields: https://bugzilla.mozilla.org/show_bug.cgi?id=1220696
    if (target.setRangeText) {
        const start = target.selectionStart;
        const end = target.selectionEnd;

        if (start != null && end != null) {
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
 * Intl.Segmenter is not yet supported by Firefox/Thunderbird: https://bugzilla.mozilla.org/show_bug.cgi?id=1423593
 *
 * @param {string} str
 * @returns {number}
 */
function countChars(str) {
    // removing the joiners
    const split = str.split("\u200D");
    let count = 0;

    for (const s of split) {
        // removing the variation selectors
        count += Array.from(s.replaceAll(/[\uFE00-\uFE0F]/gu, "")).length;
    }

    return count;
}

/**
 * Delete at caret.
 *
 * @param {HTMLElement} target
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
        else if (target.setRangeText) {
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
 * Adapted from: https://github.com/tdulcet/Table-and-Graph-Libs/blob/master/graphs.hpp
 *
 * @param {string} anumber
 * @param {string} afraction
 * @returns {string}
 */
function outputLabel(anumber, afraction) {
    let output = false;

    const number = Number.parseFloat(anumber);
    const n = Math.abs(number);

    let str = "";

    if (n <= Number.MAX_SAFE_INTEGER) {
        let intpart = Math.trunc(number);
        const fractionpart = afraction ? Number.parseFloat(afraction) : Math.abs(number % 1);

        for (const [fraction, value] of Object.entries(fractions)) {
            if (Math.abs(fractionpart - value) <= Number.EPSILON * n) {
                if (intpart === 0 && number < 0) {
                    str += "-";
                } else if (intpart !== 0) {
                    str += intpart;
                }

                str += fraction;

                output = true;
                break;
            }
        }

        if (n > Number.EPSILON && !output) {
            for (const [constant, value] of Object.entries(constants)) {
                if (!output && number % value <= Number.EPSILON * n) {
                    intpart = number / value;

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
 * @param {InputEvent} event
 * @returns {void}
 */
function autocorrect(event) {
    // console.log('beforeinput', event.inputType, event.data);
    if (!["insertText", "insertCompositionText", "insertParagraph", "insertLineBreak"].includes(event.inputType)) {
        return;
    }
    if (!symbolpatterns) {
        throw new Error("Emoji autocorrect settings have not been received. Do not autocorrect.");
    }
    if (running) {
        return;
    }
    running = true;
    const { target } = event;
    const caretposition = getCaretPosition(target);
    if (caretposition) {
        const value = target.value || target.innerText;
        let deletecount = 0;
        let insert = ["insertLineBreak", "insertParagraph"].includes(event.inputType) ? "\n" : event.data;
        const inserted = insert;
        let output = false;
        // Use Unicode smart quotes
        if (quotes && (insert === "'" || insert === '"')) {
            const previouschar = value.slice(caretposition < 1 ? 0 : caretposition - 1, caretposition);
            // White space
            const re = /^\s*$/u;
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
                const [autocorrection] = regexResult;
                insert = autocorrections[autocorrection] + inserted;
                deletecount = autocorrection.length;
                output = true;
            }
        } else {
            // Convert fractions and mathematical constants to Unicode characters
            if (!output && fracts) {
                // Numbers regular expression: https://regex101.com/r/7jUaSP/10
                // Do not match version numbers: https://github.com/rugk/unicodify/issues/40
                const numberRegex = /(?<!\.)\d+(?<fractionpart>\.\d+)?$/u;
                const previousText = value.slice(0, caretposition);
                const regexResult = numberRegex.exec(previousText);
                if (regexResult && insert !== ".") {
                    const text = value.slice(0, caretposition) + inserted;
                    const aregexResult = numberRegex.exec(text);
                    if (!aregexResult) {
                        const [number] = regexResult;
                        const label = outputLabel(number, regexResult.groups.fractionpart);
                        const index = firstDifferenceIndex(label, number);
                        if (index >= 0) {
                            insert = label.slice(index) + inserted;
                            deletecount = number.length - index;
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
                lastTarget = null;
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
    running = false;
}

/**
 * Undo autocorrect in case the backspace has been pressed.
 *
 * @param {InputEvent} event
 * @returns {void}
 */
function undoAutocorrect(event) {
    // console.log('beforeinput', event.inputType, event.data);
    // Backspace
    if (event.inputType !== "deleteContentBackward") {
        return;
    }
    if (running) {
        return;
    }
    running = true;
    const { target } = event;
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
    running = false;
}

/**
 * Handle response from the autocorrect module.
 *
 * @param {Object} message
 * @param {Object} sender
 * @returns {void}
 */
function handleResponse(message, _sender) {
    if (message.type === AUTOCORRECT_CONTENT) {
        ({
            enabled,
            quotes,
            fracts,
            autocorrections,
            longest,
            symbolpatterns,
            antipatterns
        } = message);
        symbolpatterns = IS_CHROME ? new RegExp(symbolpatterns, "u") : symbolpatterns;
        antipatterns = IS_CHROME ? new RegExp(antipatterns, "u") : antipatterns;
        // console.log(message);

        if (enabled) {
            addEventListener("beforeinput", undoAutocorrect, true);
            addEventListener("beforeinput", autocorrect, true);
        } else {
            removeEventListener("beforeinput", undoAutocorrect, true);
            removeEventListener("beforeinput", autocorrect, true);
        }
    } else if (message.type === INSERT) {
        insertIntoPage(message.text);
    }
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

browser.runtime.sendMessage({ type: AUTOCORRECT_CONTENT }).then(handleResponse, handleError);
browser.runtime.onMessage.addListener(handleResponse);
console.log("Unicodify autocorrect module loaded.");
