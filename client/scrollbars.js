ScrollBarsJS = {}
ScrollBarsJS.ScrollBarWidthRaw = 7
ScrollBarsJS.ScrollBarWidth = 7

ScrollBarsJS.HardReset = function () {
    const tempDiv = document.createElement("div");
    tempDiv.style.width = "100px";
    tempDiv.style.height = "100px";
    tempDiv.style.overflow = "scroll";
    document.documentElement.appendChild(tempDiv);
    ScrollBarsJS.ScrollBarWidthRaw = tempDiv.offsetWidth - tempDiv.clientWidth;
    document.documentElement.removeChild(tempDiv);
    ScrollBarsJS.Reset(true);
}

ScrollBarsJS.Reset = function (force = false) {
    let scale = 1;
    if ("devicePixelRatio" in window) {
        scale = window.devicePixelRatio;
    }
    newScrollBarWidth = ScrollBarsJS.ScrollBarWidthRaw / scale;
    if (newScrollBarWidth != ScrollBarsJS.ScrollBarWidth || force) {
        ScrollBarsJS.ScrollBarWidth = newScrollBarWidth;
        document.documentElement.style.setProperty("--scrollbar-width", `${ScrollBarsJS.ScrollBarWidth}px`);
    }
}

window.addEventListener("resize", () => { ScrollBarsJS.Reset(); });
window.addEventListener("zoom", () => { ScrollBarsJS.Reset(); });
ScrollBarsJS.HardReset();