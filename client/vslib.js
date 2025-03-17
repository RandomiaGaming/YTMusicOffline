// Approved 03/17/2025
"use strict";

(() => {
    const context = defModule("VSLib");
    const internals = context.Internals;

    // Things the user can set.
    internals.RelativeElementHeight = true;
    internals.ElementHeight = 0.1;
    internals.RelativeOverscrollHeight = true;
    internals.OverscrollHeight = 0.9;
    internals.Dataset = [];
    internals.VirtualElements = [];
    internals.RebindCallback = (element, binding, userdata) => { return null; };

    // Element refrences
    internals.ScaleContainerElement = null;
    internals.FixedContainerElement = null;
    internals.ScrollRectElement = null;
    internals.ElementTemplateElement = null;

    // Update flags
    internals.UpdateQueued = false;
    internals.ElementRefrencesNull = true;
    internals.DatasetChanged = false;
    internals.PreviousScrollRectHeightInPx = 0;
    internals.PreviousElementHeightInPx = 0;

    // Other
    internals.ResizeObserver = null;

    // Sets the height of a single element in pixels.
    // So val = 10 means 10 CSS pixels tall.
    setConst(context, "SetElementHeightInPixels", (val) => {
        internals.RelativeElementHeight = false;
        internals.ElementHeight = val;

        context.QueueUpdate();
    });

    // Sets the height of a single element in percent
    // of the parent container. So val = 10 means a
    // 10% of the parent element tall.
    setConst(context, "SetElementHeightInPercent", (val) => {
        internals.RelativeElementHeight = true;
        internals.ElementHeight = val / 100;

        context.QueueUpdate();
    });

    // Sets the height of the overscroll in pixels.
    // So val = 10 means 10 CSS pixels tall.
    setConst(context, "SetOverscrollHeightInPixels", (val) => {
        internals.RelativeOverscrollHeight = false;
        internals.OverscrollHeight = val;

        context.QueueUpdate();
    });

    // Sets the height of the overscroll as a percent
    // of the parent container. So val = 10 means a
    // 10% of the parent element tall.
    setConst(context, "SetOverscrollHeightInPercent", (val) => {
        internals.RelativeOverscrollHeight = true;
        internals.OverscrollHeight = val;

        context.QueueUpdate();
    });

    // Sets the height of a single element based
    // upon how many elements should fit onto a
    // single screen. So val = 5 means 5 elements
    // should take up one screen and therefore each
    // element should be 20% of the parent.
    setConst(context, "SetElementsPerScreen", (val) => {
        internals.RelativeElementHeight = true;
        internals.ElementHeight = 1.0 / val;

        context.QueueUpdate();
    });

    // Sets the dataset represented by this list.
    setConst(context, "SetDataset", (dataset) => {
        internals.Dataset = dataset;

        internals.DatasetChanged = true;
        context.QueueUpdate();
    });

    // Sets the callback function called when the
    // dataset element pointed to by a DOM element
    // changes.
    setConst(context, "SetRebindCallback", (callback) => {
        internals.RebindCallback = callback;
    });

    // Sets the user data for all virtual elements to null.
    setConst(context, "ClearAllUserData", () => {
        for (let i = 0; i < internals.VirtualElements.length; i++) {
            const virtualElement = internals.VirtualElements[i];
            virtualElement.UserData = null;
        }
    });

    // Queues an update which rebinds all elements.
    setConst(context, "QueueForcedUpdate", () => {
        internals.DatasetChanged = true;
        context.QueueUpdate();
    });

    // Queues the Update function to run this frame.
    setConst(context, "QueueUpdate", () => {
        if (!internals.UpdateQueued) {
            requestAnimationFrame(internals.Update);
            internals.UpdateQueued = true;
        }
    });

    // Initializes element refrences
    setConst(internals, "SetElementRefrences", () => {
        internals.ScaleContainerElement = document.querySelector(".vslib_scale_container");
        internals.FixedContainerElement = document.querySelector(".vslib_fixed_container");
        internals.ScrollRectElement = document.querySelector(".vslib_scroll_rect");
        internals.ElementTemplateElement = document.querySelector(".vslib_element_template");

        internals.FixedContainerElement.addEventListener("scroll", () => {
            context.QueueUpdate();
        });

        internals.ResizeObserver = new ResizeObserver(entries => {
            internals.FixedContainerElement.style.width = `${internals.ScaleContainerElement.clientWidth}px`;
            internals.FixedContainerElement.style.height = `${internals.ScaleContainerElement.clientHeight}px`;
            context.QueueUpdate();
        });
        internals.ResizeObserver.observe(internals.ScaleContainerElement);

        internals.FixedContainerElement.style.width = `${internals.ScaleContainerElement.clientWidth}px`;
        internals.FixedContainerElement.style.height = `${internals.ScaleContainerElement.clientHeight}px`;

        internals.ElementRefrencesNull = false;
    });

    // The heart of the rebinding algorithem.
    // Returns a list of transformations.
    // -1 means do not transform.
    setConst(internals, "MinRebindings", (startIndex) => {
        const todo = Array.from({ length: internals.VirtualElements.length }, (_, i) => startIndex + i);
        const output = Array.from({ length: internals.VirtualElements.length }, (_, i) => -1);
        const rebindList = [];
        for (let i = 0; i < internals.VirtualElements.length; i++) {
            const index = todo.indexOf(internals.VirtualElements[i].Binding);
            if (index == -1) {
                rebindList.push(i);
            } else {
                todo.splice(index, 1);
            }
        }
        while (todo.length > 0) {
            output[rebindList[0]] = todo[0];
            rebindList.shift();
            todo.shift();
        }
        return output;
    });

    // This function runs once per frame right
    // before the graphics are renderred.
    setConst(internals, "Update", () => {
        // Mark the Update has run and is no longer queued.
        internals.UpdateQueued = false;

        // In rare cases requestAnimationFrame will
        // run before the dom has finished loading.
        // This code accounts for that.
        if (document.readyState == "loading") {
            context.QueueUpdate();
            return;
        }

        // Initialize element refrences if not done already.
        if (internals.ElementRefrencesNull) {
            internals.SetElementRefrences();
        }

        // Basic computations
        const containerHeightInPx = internals.FixedContainerElement.clientHeight;
        let elementHeightInPx = internals.ElementHeight;
        if (internals.RelativeElementHeight) {
            elementHeightInPx = containerHeightInPx * internals.ElementHeight;
        }
        let overscrollHeightInPx = internals.OverscrollHeight;
        if (internals.RelativeOverscrollHeight) {
            overscrollHeightInPx = containerHeightInPx * internals.OverscrollHeight;
        }
        const scrollRectHeightInPx = Math.max((internals.Dataset.length * elementHeightInPx) + overscrollHeightInPx, containerHeightInPx);
        const targetElementCount = (containerHeightInPx / elementHeightInPx) + 1;
        const startIndex = Math.floor(internals.FixedContainerElement.scrollTop / elementHeightInPx);

        // Update the height of the scroll rect if it's wrong.
        if (internals.PreviousScrollRectHeightInPx != scrollRectHeightInPx) {
            internals.ScrollRectElement.style.height = `${scrollRectHeightInPx}px`;
            internals.PreviousScrollRectHeightInPx = scrollRectHeightInPx;
        }

        // Add elements if we don't have enough.
        while (internals.VirtualElements.length < targetElementCount) {
            const element = internals.ElementTemplateElement.cloneNode(true);
            element.classList.remove("vslib_element_template");
            element.classList.add("vslib_element");
            element.style.transform = "translateY(0px)";
            element.style.height = `${elementHeightInPx}px`;
            const virtualElement = { Element: element, Binding: -1, UserData: null };
            internals.ScrollRectElement.appendChild(virtualElement.Element);
            internals.VirtualElements.push(virtualElement);
        }

        // Ensure the each element is the correct height and top.
        if (internals.PreviousElementHeightInPx != elementHeightInPx) {
            for (let i = 0; i < internals.VirtualElements.length; i++) {
                const virtualElement = internals.VirtualElements[i];
                virtualElement.Element.style.height = `${elementHeightInPx}px`;
                virtualElement.Element.style.transform = `translateY(${virtualElement.Binding * elementHeightInPx}px)`;
            }
        }
        internals.PreviousElementHeightInPx = elementHeightInPx;

        // Rebind elements
        let rebindings = null;
        if (internals.DatasetChanged) {
            rebindings = Array.from({ length: internals.VirtualElements.length }, (_, i) => startIndex + i);
            internals.DatasetChanged = false;
        } else {
            rebindings = internals.MinRebindings(startIndex);
        }
        for (let i = 0; i < rebindings.length; i++) {
            const binding = rebindings[i];
            if (binding != -1) {
                const virtualElement = internals.VirtualElements[i];
                virtualElement.Binding = binding;
                virtualElement.Element.style.transform = `translateY(${binding * elementHeightInPx}px)`;
                virtualElement.UserData = internals.RebindCallback(virtualElement.Element, virtualElement.Binding, virtualElement.UserData);
            }
        }
    });

    context.QueueUpdate();
})();