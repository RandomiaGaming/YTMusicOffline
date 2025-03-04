VSLib = {};
VSLib.Internals = {};

// Things the user can set.
VSLib.Internals.RelativeElementHeight = true;
VSLib.Internals.ElementHeight = 0.1;
VSLib.Internals.Dataset = [];
VSLib.Internals.VirtualElements = [];
// userdata function(element, index, userdata);
VSLib.Internals.ElementDataUpdateCallback = null;

// Element refrences
VSLib.Internals.ScaleContainerElement = null;
VSLib.Internals.FixedContainerElement = null;
VSLib.Internals.ScrollRectElement = null;
VSLib.Internals.ElementTemplateElement = null;

// Update flags
VSLib.Internals.UpdateQueued = false;
VSLib.Internals.ElementRefrencesNull = true;
VSLib.Internals.DatasetChanged = false;
VSLib.Internals.PreviousScrollRectHeightInPx = 0;
VSLib.Internals.PreviousElementHeightInPx = 0;

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

// The heart of the rebinding algorithem.
// Returns a list of transformations.
// Integers mean change the original binding to this new int.
// Null means don't change it at all.
VSLib.Internals.MinTransformations = (currentBindings, startIndex, datasetLength) => {
    todoNulls = 0;
    todo = [];
    for (let i = 0; i < currentBindings.length; i++) {
        const index = startIndex + i;
        if (index < datasetLength) {
            todo.push(index);
        } else {
            todoNulls++;
        }
    }
    output = [];
    for (let i = 0; i < currentBindings.length; i++) {
        output.push(null);
    }
    rebindList = [];
    for (let i = 0; i < currentBindings.length; i++) {
        if (currentBindings[i] == -1) {
            if (todoNulls > 0) {
                todoNulls--;
            } else {
                rebindList.push(i);
            }
        } else {
            index = todo.indexOf(currentBindings[i]);
            if (index == -1) {
                rebindList.push(i);
            } else {
                todo.splice(index, 1);
            }
        }
    }
    while (todo.length > 0) {
        output[rebindList[0]] = todo[0];
        rebindList.shift();
        todo.shift();
    }
    while (todoNulls > 0) {
        output[rebindList[0]] = -1;
        rebindList.shift();
        todoNulls--;
    }
    return output;
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
        private.ScaleContainerElement = document.querySelector("#vslib_scale_container");
        private.FixedContainerElement = document.querySelector("#vslib_fixed_container");
        private.ScrollRectElement = private.FixedContainerElement.querySelector("#vslib_scroll_rect");
        private.ElementTemplateElement = private.ScrollRectElement.querySelector("#vslib_element_template");

        private.FixedContainerElement.addEventListener("scroll", () => {
            private.QueueUpdate();
        });

        private.ResizeObserver = new ResizeObserver(entries => {
            private.FixedContainerElement.style.width = `${private.ScaleContainerElement.clientWidth}px`;
            private.FixedContainerElement.style.height = `${private.ScaleContainerElement.clientHeight}px`;
            private.QueueUpdate();
        });
        private.ResizeObserver.observe(private.ScaleContainerElement);

        private.ElementRefrencesNull = false;
    }

    // Basic computations
    const containerHeightInPx = private.FixedContainerElement.clientHeight;
    let elementHeightInPx = private.ElementHeight;
    if (private.RelativeElementHeight) {
        elementHeightInPx = containerHeightInPx * private.ElementHeight;
    }
    const elementsPerScreen = containerHeightInPx / elementHeightInPx;
    const targetElementCount = elementsPerScreen + 1;
    const scrollAmount = private.FixedContainerElement.scrollTop;
    const startIndex = Math.floor(scrollAmount / elementHeightInPx);
    const endIndex = startIndex + (targetElementCount - 1);

    // Update the height of the scroll rect if it's wrong.
    const scrollRectHeightInPx = Math.max(private.Dataset.length * elementHeightInPx, containerHeightInPx);
    if (private.PreviousScrollRectHeightInPx != scrollRectHeightInPx) {
        private.ScrollRectElement.style.height = `${scrollRectHeightInPx}px`;
        private.PreviousScrollRectHeightInPx = scrollRectHeightInPx;
    }

    // Add or remove elements to ensure we have the correct number.
    while (private.VirtualElements.length > targetElementCount) {
        const virtualElement = private.VirtualElements[private.VirtualElements.length - 1];
        virtualElement.Element.remove();
        private.VirtualElements.pop();
    }
    while (private.VirtualElements.length < targetElementCount) {
        const element = private.ElementTemplateElement.cloneNode(true);
        element.removeAttribute("id");
        element.style.transform = "translateY(0px)";
        element.style.height = `${elementHeightInPx}px`;
        element.style.display = "none";
        const virtualElement = { Element: element, Index: -1, UserData: null };
        private.ScrollRectElement.appendChild(virtualElement.Element);
        private.VirtualElements.push(virtualElement);
    }

    // Ensure the each element is the correct height and top.
    if (private.PreviousElementHeightInPx != elementHeightInPx) {
        for (let i = 0; i < private.VirtualElements.length; i++) {
            const virtualElement = private.VirtualElements[i];
            virtualElement.Element.style.height = `${elementHeightInPx}px`;
            if (virtualElement.Index == -1) {
                virtualElement.Element.style.transform = "translateY(0px)";
            } else {
                virtualElement.Element.style.transform = `translateY(${virtualElement.Index * elementHeightInPx}px)`;
            }
        }
    }
    private.PreviousElementHeightInPx = elementHeightInPx;

    // Rebind elements
    currentBindings = [];
    for (let i = 0; i < private.VirtualElements.length; i++) {
        const virtualElement = private.VirtualElements[i];
        currentBindings.push(virtualElement.Index);
    }
    rebindings = private.MinTransformations(currentBindings, startIndex, private.Dataset.length);
    for (let i = 0; i < rebindings.length; i++) {
        const index = rebindings[i];
        if (index != null) {
            const virtualElement = private.VirtualElements[i];
            if (index == -1) {
                // Bind to null
                virtualElement.Index = -1;
                virtualElement.Element.style.display = "none";
                virtualElement.Element.style.transform = "translateY(0px)";
            } else {
                // Bind to index
                virtualElement.Index = index;
                virtualElement.Element.style.display = "inline";
                virtualElement.Element.style.transform = `translateY(${index * elementHeightInPx}px)`;
                virtualElement.UserData = private.ElementDataUpdateCallback(virtualElement.Element, virtualElement.Index, virtualElement.UserData);
            }
        }
    }
}

VSLib.Internals.QueueUpdate();