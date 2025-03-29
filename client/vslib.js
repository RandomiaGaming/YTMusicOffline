// Approved 03/20/2025
"use strict";

(() => {
    const internals = DefModule("VSLib");

    function unselectElementIfSelected(element) {
        const selection = window.getSelection();

        // Check if there's any selection and it includes the target element
        if (!selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            if (range.intersectsNode(element)) {
                // If the element is selected, clear the selection
                selection.removeAllRanges();
            }
        }
    }

    internals.ContainerElement = null;
    internals.ScrollElement = null;
    internals.ElementTemplateElement = null;
    internals.ElementRefrencesNull = true;
    internals.ResizeObserver = null;

    internals.RelativeElementHeight = true;
    internals.ElementHeight = 0.1;
    internals.RelativeOverscrollHeight = true;
    internals.OverscrollHeight = 0.9;
    //internals.ElementHeightUnits = "percent";
    //internals.UserElementHeight = 10;
    //internals.ElementHeight = 100;
    //internals.OverscrollHeightUnits = "elements";
    //internals.UserOverscrollHeight = 9;
    //internals.OverscrollHeight = 900;
    //internals.SizingUpdateQueued = true;

    internals.Dataset = [];
    internals.DatasetChanged = false;
    internals.VirtualElements = [];
    internals.RebindCallback = (element, binding, userdata) => { return null; };

    SetConst(VSLib, "SetElementHeightInPixels", (val) => {
        internals.RelativeElementHeight = false;
        internals.ElementHeight = val;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetElementHeightInPercent", (val) => {
        internals.RelativeElementHeight = true;
        internals.ElementHeight = val / 100;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetElementsPerScreen", (val) => {
        internals.RelativeElementHeight = true;
        internals.ElementHeight = 1.0 / val;
        internals.QueueUpdate();
    });

    SetConst(VSLib, "SetOverscrollHeightInPixels", (val) => {
        internals.RelativeOverscrollHeight = false;
        internals.OverscrollHeight = val;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetOverscrollHeightInPercent", (val) => {
        internals.RelativeOverscrollHeight = true;
        internals.OverscrollHeight = val;
        internals.QueueUpdate();
    });

    SetConst(VSLib, "SetDataset", (dataset) => {
        if (!Array.isArray(dataset)) {
            throw new Error("dataset must be a valid array.");
        }
        internals.Dataset = dataset;
        internals.DatasetChanged = true;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetRebindCallback", (callback) => {
        if (typeof callback !== "function") {
            throw new Error("callback must be a valid function.");
        }
        internals.RebindCallback = callback;
    });
    SetConst(VSLib, "ClearAllUserData", () => {
        for (let i = 0; i < internals.VirtualElements.length; i++) {
            const virtualElement = internals.VirtualElements[i];
            virtualElement.UserData = null;
        }
    });

    SetConst(internals, "QueueUpdate", () => {
        if (!internals.UpdateQueued) {
            requestAnimationFrame(internals.Update);
            internals.UpdateQueued = true;
        }
    });
    SetConst(internals, "Update", () => {
        internals.UpdateQueued = false;

        if (document.readyState == "loading") {
            internals.QueueUpdate();
            return;
        }

        if (internals.ElementRefrencesNull) {
            internals.ContainerElement = document.querySelector(".vslib_container");
            internals.ScrollElement = document.querySelector(".vslib_scroll");
            internals.ElementTemplateElement = document.querySelector(".vslib_element_template");
            internals.ContainerElement.addEventListener("scroll", () => {
                internals.QueueUpdate();
            });
            internals.ResizeObserver = new ResizeObserver(entries => {
                internals.QueueUpdate();
            });
            internals.ResizeObserver.observe(internals.ContainerElement);
            internals.ElementRefrencesNull = false;
        }

        const containerHeightInPx = internals.ContainerElement.clientHeight;
        const elementHeightInPx = internals.RelativeElementHeight ? containerHeightInPx * internals.ElementHeight : internals.ElementHeight;
        const overscrollHeightInPx = internals.RelativeOverscrollHeight ? containerHeightInPx * internals.OverscrollHeight : internals.OverscrollHeight;
        const scrollElementHeightInPx = Math.max((internals.Dataset.length * elementHeightInPx) + overscrollHeightInPx, containerHeightInPx);
        const targetElementCount = (containerHeightInPx / elementHeightInPx) + 1;
        const startIndex = Math.floor(internals.ContainerElement.scrollTop / elementHeightInPx);

        document.documentElement.style.setProperty("--vslib-scroll-element-height", `${scrollElementHeightInPx}px`);
        document.documentElement.style.setProperty("--vslib-element-height", `${elementHeightInPx}px`);

        if (internals.DatasetChanged) {
            internals.ContainerElement.scrollTop = 0;
            for (let i = 0; i < internals.VirtualElements.length; i++) {
                const virtualElement = internals.VirtualElements[i];
                virtualElement.Binding = -1;
            }
            internals.DatasetChanged = false;
        }

        while (internals.VirtualElements.length < targetElementCount) {
            const element = internals.ElementTemplateElement.cloneNode(true);
            element.classList.remove("vslib_element_template");
            element.classList.add("vslib_element");
            internals.ScrollElement.appendChild(element);
            const virtualElement = { Element: element, Binding: -1, UserData: null };
            internals.VirtualElements.push(virtualElement);
        }

        const indexesCurrentlyUnbound = Array.from({ length: internals.VirtualElements.length }, (_, i) => startIndex + i);
        const elementsAvailibleToRebind = [];
        for (let i = 0; i < internals.VirtualElements.length; i++) {
            const virtualElement = internals.VirtualElements[i];
            const index = indexesCurrentlyUnbound.indexOf(virtualElement.Binding);
            if (index != -1) {
                indexesCurrentlyUnbound.splice(index, 1);
            } else {
                elementsAvailibleToRebind.push(i);
            }
        }
        while (indexesCurrentlyUnbound.length > 0) {
            const virtualElement = internals.VirtualElements[elementsAvailibleToRebind[0]];
            const newBinding = indexesCurrentlyUnbound[0];
            elementsAvailibleToRebind.shift();
            indexesCurrentlyUnbound.shift();

            virtualElement.Binding = newBinding;
            virtualElement.Element.style.setProperty("--binding", virtualElement.Binding.toString());
            const newUserData = internals.RebindCallback(virtualElement.Element, virtualElement.Binding, virtualElement.UserData);
            if (newUserData !== undefined) {
                virtualElement.UserData = newUserData;
            }
        }
    });
    LockModule("VSLib");
    internals.QueueUpdate();
})();