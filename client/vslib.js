VSLib = {};
VSLib.Internals = {};

// Things the user can set.
VSLib.Internals.RelativeElementHeight = true;
VSLib.Internals.ElementHeight = 0.1;
VSLib.Internals.Dataset = [];
VSLib.Internals.VirtualElements = [];
// userdata function(element, index, data, userdata);
VSLib.Internals.ElementDataUpdateCallback = null;

// Element refrences
VSLib.Internals.ContainerElement = null;
VSLib.Internals.ScrollRectElement = null;
VSLib.Internals.ElementTemplateElement = null;

// Update flags
VSLib.Internals.UpdateQueued = false;
VSLib.Internals.ElementRefrencesNull = true;
VSLib.Internals.DatasetChanged = false;

// Other
VSLib.Internals.ResizeObserver = null;

// Sets the height of a single element in pixels.
// So val = 10 means 10 CSS pixels tall.
VSLib.SetElementHeightInPixels = (val) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.RelativeElementHeight = false;
    private.ElementHeight = val;

    private.QueueUpdate();
}

// Sets the height of a single element in percent
// of the parent container. So val = 10 means a
// 10% of the parent element tall.
VSLib.SetElementHeightInPercent = (val) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.RelativeElementHeight = true;
    private.ElementHeight = val / 100;

    private.QueueUpdate();
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

    private.QueueUpdate();
}

// Sets the dataset represented by this list.
VSLib.SetDataset = (dataset) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.Dataset = dataset;

    private.DatasetChanged = true;
    private.QueueUpdate();
}

// Sets the callback function called when the
// dataset element pointed to by a DOM element
// changes.
VSLib.SetElementDataUpdateCallback = (callback) => {
    const public = VSLib;
    const private = VSLib.Internals;

    private.ElementDataUpdateCallback = callback;
}

// Sets the user data for all virtual elements to null.
VSLib.ClearAllUserData = () => {
    const public = VSLib;
    const private = VSLib.Internals;

    for (let i = 0; i < private.VirtualElements.length; i++) {
        const virtualElement = private.VirtualElements[i];
        virtualElement.UserData = null;
    }
}

// Queues the Update function to run this frame.
VSLib.Internals.QueueUpdate = () => {
    const public = VSLib;
    const private = VSLib.Internals;

    if (!private.UpdateQueued) {
        requestAnimationFrame(private.Update);
        private.UpdateQueued = true;
    }
}

// This function runs once per frame right
// before the graphics are renderred.
VSLib.Internals.Update = () => {
    const public = VSLib;
    const private = VSLib.Internals;

    // Mark the Update has run and is no longer queued.
    private.UpdateQueued = false;

    // Initialize element refrences if not done already.
    if (private.ElementRefrencesNull) {
        private.ContainerElement = document.querySelector("#vslib_container");
        private.ScrollRectElement = private.ContainerElement.querySelector("#vslib_scroll_rect");
        private.ElementTemplateElement = private.ScrollRectElement.querySelector("#vslib_element_template");

        private.ContainerElement.addEventListener("scroll", () => {
            private.QueueUpdate();
        });

        private.ResizeObserver = new ResizeObserver(entries => {
            private.QueueUpdate();
        });
        private.ResizeObserver.observe(private.ContainerElement);

        private.ElementRefrencesNull = false;
    }

    // Basic computations
    const containerHeightInPx = private.ContainerElement.clientHeight;
    let elementHeightInPx = private.ElementHeight;
    if (private.RelativeElementHeight) {
        elementHeightInPx = containerHeightInPx * private.ElementHeight;
    }
    const elementsPerScreen = containerHeightInPx / elementHeightInPx;
    const targetElementCount = elementsPerScreen + 1;
    const scrollAmount = private.ContainerElement.scrollTop;
    const startIndex = Math.min(Math.floor(scrollAmount / elementHeightInPx), private.Dataset.length - private.VirtualElements.length);
    const endIndex = startIndex + (private.VirtualElements.length - 1);

    // Update the height of the scroll rect if it's wrong.
    const scrollRectHeightInPx = private.Dataset.length * elementHeightInPx;
    if (private.PreviousScrollRectHeight != scrollRectHeightInPx) {
        private.ScrollRectElement.style.height = `${scrollRectHeightInPx}px`;
        private.PreviousScrollRectHeight = scrollRectHeightInPx;
    }

    // Add or remove elements to ensure we have the correct number.
    if (private.VirtualElements.length > targetElementCount + 2 || private.VirtualElements.length < targetElementCount - 2) {
        while (private.VirtualElements.length > targetElementCount) {
            const virtualElement = private.VirtualElements[private.VirtualElements.length - 1];
            virtualElement.Element.remove();
            private.VirtualElements.pop();
        }
        while (private.VirtualElements.length < targetElementCount) {
            const element = private.ElementTemplateElement.cloneNode(true);
            element.removeAttribute("id");
            element.style.transform = `translateY(0px)`;
            element.style.height = `${elementHeightInPx}px`;
            const virtualElement = { Element: element, Index: -1, Data: null, UserData: null, Top: 0, Height: elementHeightInPx };
            private.ScrollRectElement.appendChild(virtualElement.Element);
            private.VirtualElements.push(virtualElement);
        }
    }

    // Bind each virtual element to a dataset element
    for (let index = startIndex; index <= endIndex; index++) {
        let alreadyBound = false;
        let freeVirtualElement = null;
        for (let i = 0; i < private.VirtualElements.length; i++) {
            const virtualElement = private.VirtualElements[i];
            if (virtualElement.Index == index) {
                alreadyBound = true;
                break;
            }
            if (virtualElement.Index < startIndex || virtualElement.Index > endIndex) {
                freeVirtualElement = virtualElement;
            }
        }
        if (alreadyBound) {
            continue;
        }

        // Bind freeVirtualElement to index
        freeVirtualElement.Index = index;
        freeVirtualElement.Data = private.Dataset[index];
        if (private.ElementDataUpdateCallback != null) {
            freeVirtualElement.UserData = private.ElementDataUpdateCallback(freeVirtualElement.Element, freeVirtualElement.Index, freeVirtualElement.Data, freeVirtualElement.UserData);
        }
    }

    // Ensure the top and height of each virtual element is correct.
    for (let i = 0; i < private.VirtualElements.length; i++) {
        const virtualElement = private.VirtualElements[i];
        const targetTop = virtualElement.Index * elementHeightInPx;
        if (virtualElement.Top != targetTop) {
            virtualElement.Element.style.transform = `translateY(${targetTop}px)`;
            virtualElement.Top = targetTop;
        }
        if (virtualElement.Height != elementHeightInPx) {
            virtualElement.Height = elementHeightInPx;
            virtualElement.Element.style.height = `${elementHeightInPx}px`;
        }
    }
}

VSLib.Internals.QueueUpdate();