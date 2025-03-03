VSLib = {};
VSLib.Internals = {};
VSLib.Internals.RelativeElementHeight = false;
VSLib.Internals.ElementHeight = 20;
VSLib.Internals.Dataset = [];
VSLib.Internals.VirtualElements = [];
// userdata function(element, index, data, userdata);
VSLib.Internals.ElementDataUpdateCallback = null;
VSLib.Internals.ContainerElement = null;
VSLib.Internals.ScrollRectElement = null;
VSLib.Internals.ElementTemplateElement = null;
VSLib.Internals.ResizeObserver = null;
VSLib.Internals.HasInitialized = false;
VSLib.Internals.PreviousElementHeight = -1;
VSLib.Internals.PreviousScrollRectHeight = -1;

// Sets the height of a single element in pixels.
// So val = 10 means 10 CSS pixels tall.
VSLib.SetElementHeightInPixels = (val) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.RelativeElementHeight = false;
    private.ElementHeight = val;
}

// Sets the height of a single element in percent
// of the parent container. So val = 10 means a
// 10% of the parent element tall.
VSLib.SetElementHeightInPercent = (val) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.RelativeElementHeight = true;
    private.ElementHeight = val / 100;
}

// Sets the height of a single element based
// upon how many elements should fit onto a
// single screen. So val = 5 means 5 elements
// should take up one screen and therefore each
// element should be 20% of the parent.
VSLib.SetElementsPerScreen = (val) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.RelativeElementHeight = true;
    private.ElementHeight = 1.0 / val;
}

// Sets the dataset represented by this list.
VSLib.SetDataset = (dataset) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.Dataset = dataset;
    for (let i = 0; i < private.VirtualElements.length; i++) {
        const virtualElement = private.VirtualElements[i];
        if (virtualElement.Index >= 0) {
            virtualElement.Index = -1;
            virtualElement.Data = null;
        }
    }
}

// Sets the callback function called when the
// dataset element pointed to by a DOM element
// changes.
VSLib.SetElementDataUpdateCallback = (callback) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.ElementDataUpdateCallback = callback;
}

// This function runs once per frame right
// before the graphics are renderred.
VSLib.Internals.Update = () => {
    const public = VSLib;
    const private = VSLib.Internals;

    // Initialize element refrences if not done already.
    if (!private.HasInitialized) {
        private.ContainerElement = document.querySelector("#vslib_container");
        private.ScrollRectElement = private.ContainerElement.querySelector("#vslib_scroll_rect");
        private.ElementTemplateElement = private.ScrollRectElement.querySelector("#vslib_element_template");
        private.HasInitialized = true;
    }

    // Update the height of each element if it's wrong.
    const containerHeightInPx = private.ContainerElement.clientHeight;
    let elementHeightInPx = private.ElementHeight;
    if (private.RelativeElementHeight) {
        elementHeightInPx = containerHeightInPx * private.ElementHeight;
    }
    if (private.PreviousElementHeight != elementHeightInPx) {
        for (let i = 0; i < private.VirtualElements.length; i++) {
            const virtualElement = private.VirtualElements[i];
            virtualElement.Element.style.height = `${elementHeightInPx}px`;
        }
        private.PreviousElementHeight = elementHeightInPx;
    }

    // Update the height of the scroll rect if it's wrong.
    const scrollRectHeightInPx = (private.Dataset.length * elementHeightInPx) + (containerHeightInPx - elementHeightInPx);
    if (private.PreviousScrollRectHeight != scrollRectHeightInPx) {
        private.ScrollRectElement.style.height = `${scrollRectHeightInPx}px`;
        private.PreviousScrollRectHeight = scrollRectHeightInPx;
    }

    // Add or remove elements to ensure we have the correct number.
    const elementsPerScreen = containerHeightInPx / elementHeightInPx;
    const targetElementCount = elementsPerScreen + 1;
    while (private.VirtualElements.length > targetElementCount) {
        const virtualElement = private.VirtualElements[private.VirtualElements.length - 1];
        virtualElement.Element.remove();
        private.VirtualElements.pop();
    }
    while (private.VirtualElements.length < targetElementCount) {
        const element = private.ElementTemplateElement.cloneNode(true);
        element.removeAttribute("id");
        element.style.display = "none";
        element.style.height = `${elementHeightInPx}px`;
        private.ScrollRectElement.appendChild(element);
        const virtualElement = { Element: element, Index: -1, Data: null, UserData: null };
        private.VirtualElements.push(virtualElement);
    }

    // Compute the start index within the dataset.
    const scrollAmount = private.ContainerElement.scrollTop;
    const startIndex = Math.floor(scrollAmount / elementHeightInPx);
    const endIndex = Math.min((startIndex + private.VirtualElements.length) - 1, private.Dataset.length - 1);

    // Unbind all elements out of range.
    for (let i = 0; i < private.VirtualElements.length; i++) {
        const virtualElement = private.VirtualElements[i];
        if (virtualElement.Index < startIndex || virtualElement.Index > endIndex) {
            virtualElement.Index = -1;
        }
    }

    // Bind each of the new elements.
    for (let index = startIndex; index <= endIndex; index++) {
        let alreadyBound = false;
        let freeVirtualElement = null;
        for (let i = 0; i < private.VirtualElements.length; i++) {
            const virtualElement = private.VirtualElements[i];
            if (virtualElement.Index == index) {
                alreadyBound = true;
                break;
            }
            if (virtualElement.Index == -1) {
                freeVirtualElement = virtualElement;
            }
        }
        if (alreadyBound) {
            continue;
        }

        // Bind freeVirtualElement to index
        freeVirtualElement.Element.style.display = "block";
        freeVirtualElement.Element.style.top = `${index * elementHeightInPx}px`;
        freeVirtualElement.Index = index;
        freeVirtualElement.Data = private.Dataset[index];
        if (private.ElementDataUpdateCallback != null) {
            freeVirtualElement.UserData = private.ElementDataUpdateCallback(freeVirtualElement.Element, freeVirtualElement.Index, freeVirtualElement.Data, freeVirtualElement.UserData);
        }
    }

    // Bind all the remaining unbound elements to null.
    for (let i = 0; i < private.VirtualElements.length; i++) {
        const virtualElement = private.VirtualElements[i];
        if (virtualElement.Index == -1) {
            virtualElement.Element.style.display = "none";
        }
    }

    // Queue this event to run again next frame
    requestAnimationFrame(VSLib.Internals.Update);
}
requestAnimationFrame(VSLib.Internals.Update);



















/*
// Get the basics
document.documentElement.style.setProperty("--list-item-count", `${dataset.length}`);
const listItemHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--list-item-height"));
const body = document.querySelector("body");
const listContainer = document.querySelector("#list_container");
const listScroll = listContainer.querySelector("#list_scroll");
const listItemTemplate = listScroll.querySelector(".list_item");
const itemsPerScreen = 1.0 / listItemHeight;

// Clone the item template
const listItems = [];
listItems.push(listItemTemplate);
for (let i = 1; i < Math.ceil(itemsPerScreen) + 1; i++) {
    const listItem = listItemTemplate.cloneNode(true);
    listScroll.appendChild(listItem);
    listItems.push(listItem);
}

// Update the layout on scroll
function scrollUpdate() {
    const startIndex = Math.floor((listContainer.scrollTop * itemsPerScreen) / listContainer.scrollHeight);
    console.log(startIndex);
    for (let i = 0; i < listItems.length; i++) {
        const index = startIndex + i;
        const listItem = listItems[i];
        if (index < dataset.length) {
            listItem.style.top = `${index * (listItemHeight * listContainer.offsetHeight)}px`;
            listItem.textContent = dataset[index];
            listItem.style.removeProperty("display");
        } else {
            listItem.style.display = "none";
        }
    }
}
    */