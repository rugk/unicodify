import { fontLetters, CASE_ID_PREFIX, FONT_ID_PREFIX, TRANSFORMATION_TYPE } from "/common/modules/data/Fonts.js";

/**
 * Transforms the given text according to the given transformation.
 *
 * @public
 * @param {string} text
 * @param {string} transformationId
 * @returns {string}
 * @throws {Error}
 */
export function transformText(text, transformationId) {
    let output = null;
    const transformationType = getTransformationType(transformationId);
    if (transformationType === TRANSFORMATION_TYPE.CASING) {
        output = changeCase[transformationId](text);
    } else if (transformationType === TRANSFORMATION_TYPE.FONT) {
        output = changeFont(text, transformationId);
    } else {
        throw new Error(`Transformation with id=${transformationId} is unknown and could not be processed.`);
    }

    if (!output) {
        console.error(`Error while transforming text with id=${transformationId}. Skipping…`);
    }
    return output;
}

/**
 * Return the type of the transformation.
 *
 * @public
 * @param {string} transformationId
 * @returns {Symbol} TRANSFORMATION_TYPE
 * @throws {Error}
 */
export function getTransformationType(transformationId) {
    if (transformationId.startsWith(CASE_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.CASING;
    } else if (transformationId.startsWith(FONT_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.FONT;
    } else {
        throw new Error(`Error while getting transformation type. Transformation with id=${transformationId} is unknown.`);
    }
}

/**
 * Capitalize Each Word.
 *
 * @param {string} text
 * @returns {string}
 */
function capitalizeEachWord(text) {
    // Regular expression Unicode property escapes and lookbehind assertions require Firefox/Thunderbird 78
    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#bcd:javascript.builtins.RegExp
    // \p{Alphabetic}
    return text.replace(/(?<=^|\P{Alpha})\p{Alpha}\S*/gu, ([h, ...t]) => h.toLocaleUpperCase() + t.join(""));
}

/**
 * Changes the Unicode font of the given text.
 *
 * It replaces each ASCII character in the text with the corresponding character from the Unicode font.
 *
 * @param {string} text
 * @param {string} chosenFont
 * @returns {string}
 * @throws {Error}
 */
function changeFont(text, chosenFont) {
    const font = fontLetters[chosenFont];
    if (!font) {
        throw new Error(`Font ${chosenFont} could not be processed.`);
    }
    let output = "";

    for (let letter of text) {
        const code = letter.charCodeAt(0);
        if (code >= 33 && code <= 127) {
            if (font.length === 94) {
                letter = font[code - "!".charCodeAt(0)];
            } else if (letter >= "A" && letter <= "Z") {
                letter = font[code - "A".charCodeAt(0)];
            } else if (letter >= "a" && letter <= "z") {
                if (font.length === 26 || font.length === 26 + 10) {
                    letter = font[code - "a".charCodeAt(0)];
                } else if (font.length === 26 + 26 || font.length === 26 + 26 + 10) {
                    letter = font[code - "a".charCodeAt(0) + 26];
                }
            } else if (letter >= "0" && letter <= "9") {
                if (font.length === 26 + 10) {
                    letter = font[code - "0".charCodeAt(0) + 26];
                } else if (font.length === 26 + 26 + 10) {
                    letter = font[code - "0".charCodeAt(0) + 26 + 26];
                }
            }
        }
        output += letter;
    }

    return output;
}

/**
 * Toggle Case.
 *
 * @param {string} atext
 * @returns {string}
 */
function toggleCase(atext) {
    let output = "";

    for (let letter of atext) {
        // \p{Changes_When_Uppercased}
        if (/\p{CWU}/u.test(letter)) {
            letter = letter.toLocaleUpperCase();
        }
        // \p{Changes_When_Lowercased}
        else if (/\p{CWL}/u.test(letter)) {
            letter = letter.toLocaleLowerCase();
        }
        output += letter;
    }

    return output;
}

/**
 * Change Case
 *
 * @const
 * @type {Object.<string, function>}
 */
const changeCase = Object.freeze({
    [`${CASE_ID_PREFIX}Lowercase`]: (str) => str.toLocaleLowerCase(),
    [`${CASE_ID_PREFIX}Uppercase`]: (str) => str.toLocaleUpperCase(),
    [`${CASE_ID_PREFIX}CapitalizeEachWord`]: (str) => capitalizeEachWord(str.toLocaleLowerCase()),
    [`${CASE_ID_PREFIX}ToggleCase`]: (str) => toggleCase(str)
});
