Nice to see you want to contribute! :+1:

As I do not want to duplicate the instructions all over, please **find the common contributors docs here**: https://github.com/TinyWebEx/common/blob/master/CONTRIBUTING.md

Some links and potential special rules for this repo only are listed below.

## Translations

* Direct link to online translator: [Web-Ext-Translator for this add-on](https://lusito.github.io/web-ext-translator/?gh=https://github.com/rugk/unicodify).
* English locales dir: [`src/_locales/en`](src/_locales/en)
* Text assets to translate: [`assets/texts`](assets/texts)
* Screenshots: [`assets/screenshots`](assets/screenshots)
* Wiki to translate: [wiki](../../wiki)
* Sidebar file for adding language: [`_Sidebar` file](../../wiki/_Sidebar/_edit)

## Coding guidelines

* [editorconfig file](.editorconfig)

### Adding symbol replacements

If you want to add symbols to be replaced, do it like this:

Add the item to the `symbols` object in the `src/common/modules/data/Symbols.js` file.
The syntax is a simple `”key”: "value”` replacement.

**Note:** Make sure the key does not conflict with any of the existing symbols. The value must be an Unicode symbol.
**Note:** Emoji autocorrectionsshould instead be added to the [Awesome Emoji Picker](https://github.com/rugk/awesome-emoji-picker).

### Adding Unicode font conversions

If you want to add a transformation for an Unicode font with a context menu entry, do it like this:

1. Add the item to the `fonts` object in the `src/common/modules/data/Fonts.js` file. The syntax is again a `[”key”]: "value”` JavaScript object.
    * The key should start with the `FONT_ID_PREFIX`.
    * The value of the item lists all replacement chracaters and needs to include either
      1. all uppercase letters (A-Z) in alphabetical order
      2. all upper and lowercase letters (A-Z, a-z) in alphabetical order (all upper case letters first)
      3. all uppercase letters and numbers (A-Z, 0-9) with letters first, 
      4. all upper and lowercase letters and numbers (A-Z, a-z, 0-9) in this order or
      5. all [printable ASCII characters](https://en.wikipedia.org/wiki/ASCII#Printable_characters) (!-~).
2. Add the name to the `menuStructure[TRANSFORMATION_TYPE.FONT]` array in the same file at the position, where the context menu entry should appear.

**Note:** Casing transformations do have a different prefix and are seperately handling in the source code (`src/common/modules/UnicodeTransformationHandler.js`), so to change soemthing there, you have to do some “real” code changes.

### Tests

* Test dir: [`src/tests/`](src/tests/)
* EsLint config for tests: [`src/tests/.eslintrc`](src/tests/.eslintrc)
