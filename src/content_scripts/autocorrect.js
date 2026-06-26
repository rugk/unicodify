const afractions = Object.freeze({
    "¼": [1, 4],
    "½": [1, 2],
    "¾": [3, 4],
    "⅐": [1, 7],
    "⅑": [1, 9],
    "⅒": [1, 10],
    "⅓": [1, 3],
    "⅔": [2, 3],
    "⅕": [1, 5],
    "⅖": [2, 5],
    "⅗": [3, 5],
    "⅘": [4, 5],
    "⅙": [1, 6],
    "⅚": [5, 6],
    "⅛": [1, 8],
    "⅜": [3, 8],
    "⅝": [5, 8],
    "⅞": [7, 8]
});

const fractions = Object.freeze(Object.fromEntries(Object.entries(afractions).map(([fraction, [numerator, denominator]]) => [fraction, numerator / denominator])));

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
let numbers = true;

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
 * Get the root editable element for a contenteditable/designMode edit.
 *
 * @param {EventTarget} target
 * @returns {HTMLElement|null}
 */
function getEditingRoot(target) {
    if (document.designMode === "on") {
        return document.body || document.documentElement;
    }

    if (!target.isContentEditable) {
        return null;
    }

    let element = target;
    while (element.parentElement?.isContentEditable) {
        element = element.parentElement;
    }
    return element;
}

/**
 * Get a stable collapsed caret range without mutating the editing host.
 *
 * @param {InputEvent} event
 * @returns {Range|null}
 */
function getCaretRange(event) {
    if (event.inputType.startsWith("insert") && event.getTargetRanges) {
        const ranges = event.getTargetRanges();
        if (ranges.length === 1) {
            const [range] = ranges;
            const arange = document.createRange();
            arange.setStart(range.startContainer, range.startOffset);
            arange.setEnd(range.endContainer, range.endOffset);
            if (!arange.collapsed) {
                return null;
            }
            return arange;
        }
    }

    const selection = document.getSelection();
    if (!selection || selection.rangeCount !== 1) {
        return null;
    }

    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
        return null;
    }

    return range.cloneRange();
}

/**
 * Get the text before the caret without mutating the page DOM.
 *
 * @param {HTMLElement|HTMLInputElement|HTMLTextAreaElement} target
 * @param {InputEvent} event
 * @returns {string|null}
 */
function getTextBeforeCaret(target, event) {
    // ContentEditable elements
    const root = getEditingRoot(target);
    if (root) {
        const caretRange = getCaretRange(event);
        if (!caretRange) {
            return null;
        }

        const range = document.createRange();
        range.selectNodeContents(root);
        range.setEnd(caretRange.endContainer, caretRange.endOffset);
        return range.toString();
    }
    // input and textarea fields
    if (target.selectionStart !== target.selectionEnd) {
        return null;
    }
    return target.value.slice(0, target.selectionStart);
}

/**
 * Insert at the current selection/caret in the given element.
 * Adapted from: https://www.everythingfrontend.com/posts/insert-text-into-textarea-at-cursor-position.html
 *
 * @param {HTMLElement} target
 * @param {string} atext
 * @returns {boolean}
 */
function insertAtCaret(target, atext) {
    // document.execCommand is deprecated, although there is not yet an alternative: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
    // insertReplacementText
    if (document.execCommand("insertText", false, atext)) {
        return true;
    }

    // Firefox input and textarea fields: https://bugzilla.mozilla.org/show_bug.cgi?id=1220696
    if (target.setRangeText && target.selectionStart != null && target.selectionEnd != null) {
        target.setRangeText(atext, target.selectionStart, target.selectionEnd, "end");
        target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: atext }));
        return true;
    }

    return false;
}

/**
 * Insert into page.
 *
 * @param {string} atext
 * @returns {void}
 */
function insertIntoPage(atext) {
    if (!insertAtCaret(document.activeElement, atext)) {
        throw new Error("nothing selected");
    }
}

/**
 * Return a DOM range covering the given number of UTF-16 code units before the caret.
 *
 * @param {HTMLElement} root
 * @param {Range} caretRange
 * @param {number} length
 * @returns {Range|null}
 */
function getRangeBeforeCaret(root, caretRange, length) {
    const range = document.createRange();
    range.setEnd(caretRange.startContainer, caretRange.startOffset);

    if (!length) {
        range.collapse(false);
        return range;
    }

    let remaining = length;
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let endOffset;
        if (node === caretRange.startContainer) {
            endOffset = caretRange.startOffset;
        } else {
            const position = caretRange.comparePoint(node, node.length);
            if (position > 0) {
                break;
            }
            endOffset = node.length;
        }

        if (endOffset > 0) {
            textNodes.push([node, endOffset]);
        }
    }

    for (const [node, endOffset] of textNodes.reverse()) {
        const take = Math.min(remaining, endOffset);
        remaining -= take;
        if (!remaining) {
            range.setStart(node, endOffset - take);
            return range;
        }
    }

    return null;
}

/**
 * Apply a prepared text replacement.
 *
 * @param {HTMLElement|HTMLInputElement|HTMLTextAreaElement} target
 * @param {InputEvent} event
 * @param {string} deleteText
 * @param {string} insertText
 * @returns {boolean}
 */
function applyReplacement(target, event, deleteText, insertText) {
    const root = getEditingRoot(target);
    if (root) {
        const caretRange = getCaretRange(event);
        if (!caretRange) {
            return false;
        }

        const range = getRangeBeforeCaret(root, caretRange, deleteText.length);
        if (!range || range.toString() !== deleteText) {
            return false;
        }

        const selection = document.getSelection();
        if (!selection) {
            return false;
        }

        event.preventDefault();

        selection.removeAllRanges();
        selection.addRange(range);
        return insertAtCaret(root, insertText);
    }

    if (target.selectionStart !== target.selectionEnd) {
        return false;
    }

    const start = target.selectionStart - deleteText.length;
    if (start < 0 || target.value.slice(start, target.selectionStart) !== deleteText) {
        return false;
    }

    event.preventDefault();

    const end = target.selectionStart;
    target.selectionStart = start;
    target.selectionEnd = end;

    // "insertReplacementText"
    return insertAtCaret(target, insertText);
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
    if (event.isComposing || event.cancelable === false || !["insertText", "insertParagraph", "insertLineBreak"].includes(event.inputType)) {
        return;
    }
    if (!symbolpatterns) {
        throw new Error("Emoji autocorrect settings have not been received. Do not autocorrect.");
    }
    if (running) {
        return;
    }
    running = true;
    try {
        const { target } = event;
        const value = getTextBeforeCaret(target, event);
        if (value == null) {
            return;
        }
        const caretposition = value.length;
        let deletecount = 0;
        let insert = ["insertLineBreak", "insertParagraph"].includes(event.inputType) ? "\n" : event.data;
        const inserted = insert;
        let output = false;
        // Use Unicode smart quotes
        if (quotes && (insert === "'" || insert === '"')) {
            const previouschar = value.slice(-1);
            // White space
            const re = /^\s*$/u;
            if (insert === "'") {
                insert = re.test(previouschar) ? "‘" : "’";
            } else if (insert === '"') {
                insert = re.test(previouschar) ? "“" : "”";
            }
            output = true;
        }
        const previousText = value.slice(-longest);
        const regexResult = symbolpatterns.exec(previousText);
        // Autocorrect Unicode Symbols
        if (regexResult) {
            const length = longest - 1;
            const text = value.slice(-length) + inserted;
            const aregexResult = symbolpatterns.exec(text);
            if (!antipatterns.test(text) && (!aregexResult || (caretposition <= longest ? regexResult.index < aregexResult.index : regexResult.index <= aregexResult.index))) {
                const [autocorrection] = regexResult;
                insert = autocorrections[autocorrection] + inserted;
                deletecount = autocorrection.length;
                output = true;
            }
        } else {
            // Convert fractions to Unicode characters
            if (!output && fracts) {
                // Fractions regular expression: https://regex101.com/r/RtUMrA/1
                const fractionRegex = /(?<!\/\d*)(?<numerator>\d+)\/(?<denominator>\d+)$/u;
                const previousText = value;
                const regexResult = fractionRegex.exec(previousText);
                if (regexResult && insert !== "/") {
                    const text = value + inserted;
                    if (!fractionRegex.test(text)) {
                        const [fraction] = regexResult;
                        const numerator = Number.parseInt(regexResult.groups.numerator, 10);
                        const denominator = Number.parseInt(regexResult.groups.denominator, 10);
                        const result = Object.entries(afractions).find(([, [n, d]]) => n === numerator && d === denominator);
                        let label;
                        if (result) {
                            [label] = result;
                        } else {
                            // Fraction slash character: https://en.wikipedia.org/wiki/Numerals_in_Unicode#Fractions
                            label = `${numerator}\u{2044}${denominator}`;
                        }
                        const index = firstDifferenceIndex(label, fraction);
                        if (index >= 0) {
                            insert = label.slice(index) + inserted;
                            deletecount = fraction.length - index;
                            output = true;
                        }
                    }
                }
            }
            // Convert numbers with fractions and mathematical constants to Unicode characters
            if (!output && numbers) {
                // Numbers regular expression: https://regex101.com/r/7jUaSP/11
                // Do not match version numbers: https://github.com/rugk/unicodify/issues/40
                const numberRegex = /(?<!\.\d*)\d+(?<fractionpart>\.\d+)?$/u;
                const previousText = value;
                const regexResult = numberRegex.exec(previousText);
                if (regexResult && insert !== ".") {
                    const text = value + inserted;
                    if (!numberRegex.test(text)) {
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
            const text = deletecount ? value.slice(caretposition - deletecount) : "";
            if (!applyReplacement(target, event, text, insert)) {
                return;
            }

            insertedText = insert;
            deletedText = text + inserted;
            console.debug("Autocorrect: “%s” was replaced with “%s”.", deletedText, insertedText);

            lastTarget = target;
            lastCaretPosition = caretposition - deletecount + insert.length;
        }
    } finally {
        running = false;
    }
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
    if (event.isComposing || event.cancelable === false || event.inputType !== "deleteContentBackward") {
        return;
    }
    if (running) {
        return;
    }
    running = true;
    try {
        const { target } = event;
        const value = getTextBeforeCaret(target, event);
        if (value == null) {
            return;
        }
        const caretposition = value.length;
        if (target === lastTarget && caretposition === lastCaretPosition && (!insertedText || value.endsWith(insertedText))) {
            if (applyReplacement(target, event, insertedText, deletedText)) {
                console.debug("Undo autocorrect: “%s” was replaced with “%s”.", insertedText, deletedText);
            }
        }

        lastTarget = null;
    } finally {
        running = false;
    }
}

/**
 * Handle response from the autocorrect module.
 *
 * @param {object} message
 * @param {object} sender
 * @returns {void}
 */
function handleResponse(message, _sender) {
    if (message.type === AUTOCORRECT_CONTENT) {
        ({
            enabled,
            quotes,
            fracts,
            numbers,
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

browser.runtime.sendMessage({ type: AUTOCORRECT_CONTENT }).then(handleResponse, (error) => {
    console.error(`Error: ${error}`);
});
browser.runtime.onMessage.addListener(handleResponse);
