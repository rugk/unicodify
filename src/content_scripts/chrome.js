// communication type
const UPDATE_CONTEXT_MENU = "updateContextMenu";

document.addEventListener("selectionchange", () => {
    const aselection = document.getSelection().toString();
    browser.runtime.sendMessage({
        type: UPDATE_CONTEXT_MENU,
        selection: aselection
    });
});
