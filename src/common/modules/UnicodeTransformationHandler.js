import { fontLetters, formats, CASE_ID_PREFIX, CODE_CASE_ID_PREFIX, FONT_ID_PREFIX, FORMAT_ID_PREFIX, TRANSFORMATION_TYPE } from "/common/modules/data/Fonts.js";

const segmenter = new Intl.Segmenter();
const segmenterWord = new Intl.Segmenter([], { granularity: "word" });
const segmenterSentence = new Intl.Segmenter([], { granularity: "sentence" });

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
    switch (transformationType) {
    case TRANSFORMATION_TYPE.CASING:
        output = changeCase[transformationId.slice(CASE_ID_PREFIX.length)](text);
        break;
    case TRANSFORMATION_TYPE.CODE_CASING:
        output = changeCodeCase[transformationId.slice(CODE_CASE_ID_PREFIX.length)](text);
        break;
    case TRANSFORMATION_TYPE.FONT:
        output = changeFont(text, transformationId);
        break;
    case TRANSFORMATION_TYPE.FORMAT:
        output = changeFormat(text, transformationId);
        break;
    default:
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
 * @returns {symbol} TRANSFORMATION_TYPE
 * @throws {Error}
 */
export function getTransformationType(transformationId) {
    if (transformationId.startsWith(CASE_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.CASING;
    }
    if (transformationId.startsWith(CODE_CASE_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.CODE_CASING;
    }
    if (transformationId.startsWith(FONT_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.FONT;
    }
    if (transformationId.startsWith(FORMAT_ID_PREFIX)) {
        return TRANSFORMATION_TYPE.FORMAT;
    }
    throw new Error(`Error while getting transformation type. Transformation with id=${transformationId} is unknown.`);

}

/**
 * Capitalize Each Word.
 *
 * @param {string} text
 * @returns {string}
 */
function capitalizeEachWord(text) {
    return Array.from(segmenterWord.segment(text), ({ segment, isWordLike }) => {
        if (isWordLike) {
            const [head, ...tail] = segment;
            return head.toLocaleUpperCase() + tail.join("");
        }
        return segment;
    }).join("");
}

/**
 * Sentence Case.
 *
 * @param {string} text
 * @returns {string}
 */
function sentenceCase(text) {
    return Array.from(segmenterSentence.segment(text), ({ segment: [head, ...tail] }) => head.toLocaleUpperCase() + tail.join("")).join("");
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
    const font = fontLetters[chosenFont.slice(FONT_ID_PREFIX.length)];
    if (!font) {
        throw new Error(`Font ${chosenFont} could not be processed.`);
    }
    let output = "";

    for (let letter of text) {
        const code = letter.codePointAt(0);
        if (code >= 32 && code <= 127) {
            if (font.length === 95) {
                letter = font[code - " ".codePointAt(0)];
            } else if (letter >= "A" && letter <= "Z") {
                letter = font[code - "A".codePointAt(0)];
            } else if (letter >= "a" && letter <= "z") {
                if (font.length === 26 || font.length === 26 + 10) {
                    letter = font[code - "a".codePointAt(0)];
                } else if (font.length === 26 + 26 || font.length === 26 + 26 + 10) {
                    letter = font[code - "a".codePointAt(0) + 26];
                }
            } else if (letter >= "0" && letter <= "9") {
                if (font.length === 26 + 10) {
                    letter = font[code - "0".codePointAt(0) + 26];
                } else if (font.length === 26 + 26 + 10) {
                    letter = font[code - "0".codePointAt(0) + 26 + 26];
                }
            }
        }
        output += letter;
    }

    return output;
}

/**
 * Changes the Unicode format of the given text.
 *
 * @param {string} text
 * @param {string} chosenFormat
 * @returns {string}
 * @throws {Error}
 */
function changeFormat(text, chosenFormat) {
    const format = formats[chosenFormat.slice(FORMAT_ID_PREFIX.length)];
    if (!format) {
        throw new Error(`Format ${chosenFormat} could not be processed.`);
    }

    return Array.from(segmenter.segment(text), ({ segment }) => segment + format).join("");
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
 * @type {Object.<string, function(string): string>}
 */
const changeCase = Object.freeze({
    SentenceCase: (str) => sentenceCase(str.toLocaleLowerCase()),
    Lowercase: (str) => str.toLocaleLowerCase(),
    Uppercase: (str) => str.toLocaleUpperCase(),
    CapitalizeEachWord: (str) => capitalizeEachWord(str.toLocaleLowerCase()),
    ToggleCase: (str) => toggleCase(str)
});

/**
 * Split string to change coding case.
 *
 * @param {string} str
 * @returns {string[]}
 */
function split(str) {
    // \p{Alphabetic} \p{Mark} \p{Decimal_Number} \p{Join_Control}
    const re = /[^\p{Alpha}\p{M}\p{digit}\p{Join_C}]+/gu;
    let arr = str.split(/\s+/u).map((x) => x.replaceAll(re, "")).filter(Boolean);
    if (!arr.length || arr.length > 1) {
        return arr;
    }

    arr = str.split(re).filter(Boolean);
    // \p{Uppercase}
    return !arr.length || arr.length > 1 ? arr : arr[0].match(/\p{Upper}\P{Upper}*|\P{Upper}+/gu);
}

/**
 * Lower camel case.
 *
 * @param {string} atext
 * @returns {string}
 */
function camelCase(atext) {
    const [head, ...tail] = split(atext);
    return head.toLowerCase() + tail.map(([h, ...t]) => h.toUpperCase() + t.join("").toLowerCase()).join("");
}

/**
 * Upper camel case.
 *
 * @param {string} atext
 * @returns {string}
 */
function upperCamelCase(atext) {
    return split(atext).map(([head, ...tail]) => head.toUpperCase() + tail.join("").toLowerCase()).join("");
}

/**
 * Snake case.
 *
 * @param {string} atext
 * @returns {string}
 */
function snakeCase(atext) {
    return split(atext).map((x) => x.toLowerCase()).join("_");
}

/**
 * Constant case.
 *
 * @param {string} atext
 * @returns {string}
 */
function constantCase(atext) {
    return split(atext).map((x) => x.toUpperCase()).join("_");
}

/**
 * Ada case.
 *
 * @param {string} atext
 * @returns {string}
 */
function adaCase(atext) {
    return split(atext).map(([head, ...tail]) => head.toUpperCase() + tail.join("").toLowerCase()).join("_");
}

/**
 * Kebab case.
 *
 * @param {string} atext
 * @returns {string}
 */
function kebabCase(atext) {
    return split(atext).map((x) => x.toLowerCase()).join("-");
}

/**
 * Train case.
 *
 * @param {string} atext
 * @returns {string}
 */
function trainCase(atext) {
    return split(atext).map((x) => x.toUpperCase()).join("-");
}

/**
 * Change Coding Case
 *
 * @const
 * @type {Object.<string, function(string): string>}
 */
const changeCodeCase = Object.freeze({
    CamelCase: camelCase,
    UpperCamelCase: upperCamelCase,
    SnakeCase: snakeCase,
    ConstantCase: constantCase,
    AdaCase: adaCase,
    KebabCase: kebabCase,
    TrainCase: trainCase
});
