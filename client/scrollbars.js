// This script creates global css variables called
// --scrollbar-width and --scrollbar-height
// which store the size of a device scroll bar in
// CSS pixels.

// Note this script has been depricated in favor of
// better solutions. This problem only occurs when
// using overflow: scroll on elements with sizes in
// units of vw or vh. To fix this simply make your
// parent tag whatever size you want in units of
// vw or vh and then create a child which has the
// following:
// width: 100%; height: 100%; overflow-y: scroll;

ScrollBarsJS = {}
ScrollBarsJS.ScrollBarWidthRaw = 0;
ScrollBarsJS.ScrollBarHeightRaw = 0;
ScrollBarsJS.ScrollBarWidth = 0;
ScrollBarsJS.ScrollBarHeight = 0;

ScrollBarsJS.Reset = (force = false) => {
    let scale = 1;
    if ("devicePixelRatio" in window) {
        scale = window.devicePixelRatio;
    }

    newScrollBarWidth = ScrollBarsJS.ScrollBarWidthRaw / scale;
    if (newScrollBarWidth != ScrollBarsJS.ScrollBarWidth || force) {
        ScrollBarsJS.ScrollBarWidth = newScrollBarWidth;
        document.documentElement.style.setProperty("--scrollbar-width", `${ScrollBarsJS.ScrollBarWidth}px`);
    }

    newScrollBarHeight = ScrollBarsJS.ScrollBarHeightRaw / scale;
    if (newScrollBarHeight != ScrollBarsJS.ScrollBarHeight || force) {
        ScrollBarsJS.ScrollBarHeight = newScrollBarHeight;
        document.documentElement.style.setProperty("--scrollbar-height", `${ScrollBarsJS.ScrollBarHeight}px`);
    }
}

(() => {
    let scale = 1
    if ("devicePixelRatio" in window) {
        scale = window.devicePixelRatio;
    }

    if (scale != 1) {
        console.warn(`Warning: Window zoom is ${scale * 100}%. Zoom levels other than 100% can cause rounding errors in scrollbar size computations.`);
    }

    const tempDiv = document.createElement("div");
    tempDiv.style.overflowX = "scroll";
    tempDiv.style.overflowY = "scroll";
    document.documentElement.appendChild(tempDiv);
    scrollBarWidthCssPixels = tempDiv.offsetWidth - tempDiv.clientWidth;
    scrollBarHeightCssPixels = tempDiv.offsetHeight - tempDiv.clientHeight;
    ScrollBarsJS.ScrollBarWidthRaw = scrollBarWidthCssPixels * scale;
    ScrollBarsJS.ScrollBarHeightRaw = scrollBarHeightCssPixels * scale;
    document.documentElement.removeChild(tempDiv);

    ScrollBarsJS.Reset(true);
})();

window.addEventListener("resize", () => { ScrollBarsJS.Reset(); });
window.addEventListener("zoom", () => { ScrollBarsJS.Reset(); });