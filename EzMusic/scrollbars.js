(() => {
    const tempDiv = document.createElement("div");
    tempDiv.style.width = "100px";
    tempDiv.style.height = "100px";
    tempDiv.style.overflow = "scroll";
    document.documentElement.appendChild(tempDiv);
    const scrollbarWidth = tempDiv.offsetWidth - tempDiv.clientWidth;
    document.documentElement.removeChild(tempDiv);
    document.documentElement.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
})();