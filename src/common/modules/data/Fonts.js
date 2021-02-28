
"use strict";

// Adapted from: https://entropymine.wordpress.com/2018/05/26/the-curious-case-of-small-caps-in-unicode/
const smallCaps = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘꞯʀꜱᴛᴜᴠᴡxʏᴢ";

/**
 * Separater symbol
 *
 * @public
 * @const
 * @type {Symbol}
 */
export const SEPARATOR = Symbol("separator");

/**
 * Case IDs
 *
 * @public
 * @const
 * @type {Object.<string, Symbol>}
 */
export const CASE = Object.freeze({
    CAPITALIZE:     Symbol("capitalize-each-word"),
    LOWERCASE:      Symbol("lowercase"),
    TOGGLE:         Symbol("toggle-case"),
    UPPERCASE:      Symbol("uppercase"),
});

/**
 * Contains the "inversed" array of the casing options.
 *
 * It helps you to access the {@see CASE} object with an Symbol.toString() value.
 *
 * @public
 * @const
 * @type {Object.<string, Symbol>}
 */
export const caseByString = Object.freeze(
    Object.fromEntries(Object.entries(CASE).map(([key, symbol]) => {
        return [symbol.toString(), symbol];
    }))
);

/**
 * Font IDs
 *
 * @public
 * @const
 * @type {Object.<string, Symbol>}
 */
export const FONT = Object.freeze({
    ALL_SMALL_CAPS:         Symbol("all-small-caps"),
    CIRCLED_BLACK:          Symbol("circledBlack"),
    CIRCLED:                Symbol("circled"),
    DOUBLE_STRUCK:          Symbol("double-struck"),
    FRAKTUR_BOLD:           Symbol("fraktur-bold"),
    FULLWIDTH:              Symbol("fullwidth"),
    MONOSPACE:              Symbol("monospace"),
    SANS_SERIF_BOLD_ITALIC: Symbol("sans-serif-bold-italic"),
    SANS_SERIF_BOLD:        Symbol("sans-serif-bold"),
    SANS_SERIF_ITALIC:      Symbol("sans-serif-italic"),
    SANS_SERIF:             Symbol("sans-serif"),
    SCRIPT_BOLD:            Symbol("script-bold"),
    SCRIPT_FRAKTUR:         Symbol("script-fraktur"),
    SCRIPT:                 Symbol("script"),
    SERIF_BOLD_ITALIC:      Symbol("serif-bold-italic"),
    SERIF_BOLD:             Symbol("serif-bold"),
    SERIF_ITALIC:           Symbol("serif-italic"),
    SMALL_CAPS:             Symbol("small-caps"),
    SQUARD_BLACK:           Symbol("squared-black"),
    SQUARD:                 Symbol("squared"),
    SUPERSCRIPT:            Symbol("superscript"),
    UNICASE:                Symbol("unicase"),
});

/**
 * Contains the "inversed" array of the font.
 *
 * It helps you to access ther {@see FONT} object with an Symbol.toString() value.
 *
 * @public
 * @const
 * @type {Object.<string, Symbol>}
 */
export const fontByString = Object.freeze(
    Object.fromEntries(Object.entries(FONT).map(([key, symbol]) => {
        return [symbol.toString(), symbol];
    }))
);

/**
 * The casing/font menu in it's order and it's translations.
 *
 * Includes {@link SEPARATOR} as a value for where separators are to be insterted.
 *
 * @public
 * @const
 * @type {Readonly<Array<Symbol>>}
 */
export const contextMenuList = Object.freeze([
    CASE.LOWERCASE,
    CASE.UPPERCASE,
    CASE.CAPITALIZE,
    CASE.TOGGLE,
    SEPARATOR,
    FONT.SUPERSCRIPT,
    FONT.SMALL_CAPS,
    FONT.ALL_SMALL_CAPS,
    FONT.UNICASE,
    SEPARATOR,
    FONT.SERIF_BOLD,
    FONT.SERIF_ITALIC,
    FONT.SERIF_BOLD_ITALIC,
    FONT.SANS_SERIF,
    FONT.SANS_SERIF_BOLD,
    FONT.SANS_SERIF_ITALIC,
    FONT.SANS_SERIF_BOLD_ITALIC,
    FONT.SCRIPT,
    FONT.SCRIPT_BOLD,
    FONT.SCRIPT_FRAKTUR,
    FONT.FRAKTUR_BOLD,
    FONT.MONOSPACE,
    FONT.DOUBLE_STRUCK,
    SEPARATOR,
    FONT.CIRCLED,
    FONT.CIRCLED_BLACK,
    FONT.SQUARD,
    FONT.SQUARD_BLACK,
    FONT.FULLWIDTH
]);

/**
 * The casing/font menu in it's order and it's translations.
 *
 * @public
 * @const
 * @type {Object.<Symbol, string>}
 */
export const menuTranslation = Object.freeze({
    [CASE.LOWERCASE]: "menuCaseLowercase",
    [CASE.UPPERCASE]: "menuCaseUppercase",
    [CASE.CAPITALIZE]: "menuCaseCapitalizeEachWord",
    [CASE.TOGGLE]: "menuCaseToggleCase",
    [FONT.SUPERSCRIPT]: "menuFontSuperscript",
    [FONT.SMALL_CAPS]: "menuFontSmallCaps",
    [FONT.ALL_SMALL_CAPS]: "menuFontAllSmallCaps",
    [FONT.UNICASE]: "menuFontUnicase",
    [FONT.SERIF_BOLD]: "menuFontSerifBold",
    [FONT.SERIF_ITALIC]: "menuFontSerifItalic",
    [FONT.SERIF_BOLD_ITALIC]: "menuFontSerifBoldItalic",
    [FONT.SANS_SERIF]: "menuFontSansSerif",
    [FONT.SANS_SERIF_BOLD]: "menuFontSansSerifBold",
    [FONT.SANS_SERIF_ITALIC]: "menuFontSansSerifItalic",
    [FONT.SANS_SERIF_BOLD_ITALIC]: "menuFontSansSerifBoldItalic",
    [FONT.SCRIPT]: "menuFontScript",
    [FONT.SCRIPT_BOLD]: "menuFontScriptBold",
    [FONT.SCRIPT_FRAKTUR]: "menuFontScriptFraktur",
    [FONT.FRAKTUR_BOLD]: "menuFontFrakturBold",
    [FONT.MONOSPACE]: "menuFontMonospace",
    [FONT.DOUBLE_STRUCK]: "menuFontDoubleStruck",
    [FONT.CIRCLED]: "menuFontCircled",
    [FONT.CIRCLED_BLACK]: "menuFontCircledBlack",
    [FONT.SQUARD]: "menuFontSquared",
    [FONT.SQUARD_BLACK]: "menuFontSquaredBlack",
    [FONT.FULLWIDTH]: "menuFontFullwidth"
});

/**
 * Unicode fonts
 * Some of the fonts have characters that are not yet implemented.
 *
 * @private
 * @const
 * @type {Object.<string, string>}
 */
export const fonts = Object.freeze({
    "serif-bold": "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗",
    "serif-italic": "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧",
    "serif-bold-italic": "𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛",
    "sans-serif": "𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫",
    "sans-serif-bold": "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵",
    "sans-serif-italic": "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻",
    "sans-serif-bold-italic": "𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯",
    "script": "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏",
    "script-bold": "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃",
    "fraktur": "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷",
    "fraktur-bold": "𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟",
    "monospace": "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
    "double-struck": "𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡",
    "circled": "!\"#$%&'()⊛⊕,⊖⊙⊘⓪①②③④⑤⑥⑦⑧⑨:;⧀⊜⧁?@ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ[⦸]^_`ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ{⦶}~",
    "circled-(black)": "🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩⓿❶❷❸❹❺❻❼❽❾",
    "squared": "!\"#$%&'()⧆⊞,⊟⊡⧄0123456789:;<=>?@🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉[⧅]^_`🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉{|}~",
    "squared-(black)": "🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉",
    "fullwidth": "！＂＃＄％＆＇（）＊＋，－．／０１２３４５６７８９：；＜＝＞？＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ［＼］＾＿｀ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ｛｜｝～",
    // Adapted from: https://rupertshepherd.info/resource_pages/superscript-letters-in-unicode
    "superscript": "ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹",
    "small-caps": `ABCDEFGHIJKLMNOPQRSTUVWXYZ${smallCaps}`,
    "all-small-caps": smallCaps,
    "unicase": `${smallCaps}abcdefghijklmnopqrstuvwxyz`
});

/**
 * All letters for each Unicode font
 *
 * Some of the fonts have characters that are not yet implemented.
 * The most similar looking are choosen in such a case.
 *
 * @public
 * @const
 * @type {Object.<Symbol, string[]>}
 */
export const fontMap = Object.freeze(
    Object.fromEntries(Object.getOwnPropertySymbols(fonts).map((font) => {
        // split-up the letter string an array with each character
        return [font, Array.from(fonts[font])];
    }))
);
