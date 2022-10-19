"use strict";

// Adapted from: https://entropymine.wordpress.com/2018/05/26/the-curious-case-of-small-caps-in-unicode/
// https://en.wikipedia.org/wiki/Small_caps#Unicode
const smallCaps = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘꞯʀꜱᴛᴜᴠᴡxʏᴢ";

/**
 * Types of transformations
 *
 * @public
 * @const
 * @type {Symbol}
 */
export const TRANSFORMATION_TYPE = Object.freeze({
    CASING: Symbol("casing transformation"),
    FONT: Symbol("font transformation")
});

/**
 * Separater symbol
 *
 * @public
 * @const
 * @type {Symbol}
 */
export const SEPARATOR_ID = Symbol("separator");

/**
 * Unique prefix for all IDs related to casing.
 *
 * @public
 * @const
 * @type {Symbol}
 */
export const CASE_ID_PREFIX = "menuCase";

/**
 * Unique prefix for all IDs related to fonts.
 *
 * @public
 * @const
 * @type {string}
 */
export const FONT_ID_PREFIX = "menuFont";

/**
 * The structure of the context menu.
 *
 * @public
 * @const
 * @type {Object.<Symbol, string[]>}
 */
export const menuStructure = Object.freeze({
    [TRANSFORMATION_TYPE.FONT]: [
        `${FONT_ID_PREFIX}Superscript`,
        `${FONT_ID_PREFIX}SmallCaps`,
        `${FONT_ID_PREFIX}AllSmallCaps`,
        `${FONT_ID_PREFIX}Unicase`,
        SEPARATOR_ID,
        `${FONT_ID_PREFIX}SerifBold`,
        `${FONT_ID_PREFIX}SerifItalic`,
        `${FONT_ID_PREFIX}SerifBoldItalic`,
        `${FONT_ID_PREFIX}SansSerif`,
        `${FONT_ID_PREFIX}SansSerifBold`,
        `${FONT_ID_PREFIX}SansSerifItalic`,
        `${FONT_ID_PREFIX}SansSerifBoldItalic`,
        `${FONT_ID_PREFIX}Script`,
        `${FONT_ID_PREFIX}ScriptBold`,
        `${FONT_ID_PREFIX}ScriptFraktur`,
        `${FONT_ID_PREFIX}FrakturBold`,
        `${FONT_ID_PREFIX}Monospace`,
        `${FONT_ID_PREFIX}DoubleStruck`,
        SEPARATOR_ID,
        `${FONT_ID_PREFIX}Circled`,
        `${FONT_ID_PREFIX}CircledBlack`,
        `${FONT_ID_PREFIX}Squared`,
        `${FONT_ID_PREFIX}SquaredBlack`,
        `${FONT_ID_PREFIX}Fullwidth`
    ],
    [TRANSFORMATION_TYPE.CASING]: [
        `${CASE_ID_PREFIX}Lowercase`,
        `${CASE_ID_PREFIX}Uppercase`,
        `${CASE_ID_PREFIX}CapitalizeEachWord`,
        `${CASE_ID_PREFIX}ToggleCase`
    ]
});

/**
 * Unicode fonts
 * Some of the fonts have characters that are not yet implemented.
 * https://en.wikipedia.org/wiki/Mathematical_Alphanumeric_Symbols
 * https://en.wikipedia.org/wiki/Enclosed_Alphanumerics
 * https://en.wikipedia.org/wiki/Enclosed_Alphanumeric_Supplement
 *
 * @private
 * @const
 * @type {Object.<string, string>}
 */
const fonts = Object.freeze({
    [`${FONT_ID_PREFIX}SerifBold`]: "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗",
    [`${FONT_ID_PREFIX}SerifItalic`]: "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧",
    [`${FONT_ID_PREFIX}SerifBoldItalic`]: "𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛",
    [`${FONT_ID_PREFIX}SansSerif`]: "𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫",
    [`${FONT_ID_PREFIX}SansSerifBold`]: "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵",
    [`${FONT_ID_PREFIX}SansSerifItalic`]: "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻",
    [`${FONT_ID_PREFIX}SansSerifBoldItalic`]: "𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯",
    [`${FONT_ID_PREFIX}Script`]: "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏",
    [`${FONT_ID_PREFIX}ScriptBold`]: "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃",
    [`${FONT_ID_PREFIX}ScriptFraktur`]: "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷",
    [`${FONT_ID_PREFIX}FrakturBold`]: "𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟",
    [`${FONT_ID_PREFIX}Monospace`]: "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
    [`${FONT_ID_PREFIX}DoubleStruck`]: "𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡",
    [`${FONT_ID_PREFIX}Circled`]: " !\"#$%&'()⊛⊕,⊖⊙⊘⓪①②③④⑤⑥⑦⑧⑨:;⧀⊜⧁?@ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ[⦸]^_`ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ{⦶}~",
    [`${FONT_ID_PREFIX}CircledBlack`]: "🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩⓿❶❷❸❹❺❻❼❽❾",
    [`${FONT_ID_PREFIX}Squared`]: " !\"#$%&'()⧆⊞,⊟⊡⧄0123456789:;<=>?@🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉[⧅]^_`🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉{|}~",
    [`${FONT_ID_PREFIX}SquaredBlack`]: "🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉",
    // https://en.wikipedia.org/wiki/Halfwidth_and_Fullwidth_Forms_(Unicode_block)
    [`${FONT_ID_PREFIX}Fullwidth`]: "　！＂＃＄％＆＇（）＊＋，－．／０１２３４５６７８９：；＜＝＞？＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ［＼］＾＿｀ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ｛｜｝～",
    // Adapted from: https://rupertshepherd.info/resource_pages/superscript-letters-in-unicode
    // https://en.wikipedia.org/wiki/Unicode_subscripts_and_superscripts
    [`${FONT_ID_PREFIX}Superscript`]: " !\"#$%&'⁽⁾*⁺,⁻./⁰¹²³⁴⁵⁶⁷⁸⁹:;<⁼>?@ᴬᴮꟲᴰᴱꟳᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾꟴᴿˢᵀᵁⱽᵂˣʸᶻ[\\]^_`ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ𐞥ʳˢᵗᵘᵛʷˣʸᶻ{|}~",
    [`${FONT_ID_PREFIX}Subscript`]: " !\"#$%&'₍₎*₊,₋./₀₁₂₃₄₅₆₇₈₉:;<₌>?@ₐBCDₑFGₕᵢⱼₖₗₘₙₒₚQᵣₛₜᵤᵥWₓYZ[\\]^_`ₐbcdₑfgₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓyz{|}~",
    [`${FONT_ID_PREFIX}SmallCaps`]: `ABCDEFGHIJKLMNOPQRSTUVWXYZ${smallCaps}`,
    [`${FONT_ID_PREFIX}AllSmallCaps`]: smallCaps,
    [`${FONT_ID_PREFIX}Unicase`]: `${smallCaps}abcdefghijklmnopqrstuvwxyz`
});

/**
 * All letters for each Unicode font
 *
 * Some of the fonts have characters that are not yet implemented.
 * The most similar looking are choosen in such a case.
 *
 * @public
 * @const
 * @type {Object.<string, string[]>}
 */
export const fontLetters = Object.freeze(
    Object.fromEntries(Object.entries(fonts).map(([font, charString]) => {
        // split-up the letter string an array with each character
        return [font, Array.from(charString)];
    }))
);
