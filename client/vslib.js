// Approved 03/20/2025
"use strict";

(() => {
    const internals = DefModule("VSLib");

    internals.ContainerElement = null;
    internals.ScrollElement = null;
    internals.ElementTemplateElement = null;
    // Enum: Pixels Percent ElementsPerScreen
    internals.ElementHeightUnits = "ElementsPerScreen";
    internals.UserElementHeight = 10;
    // Enum: Pixels Percent Elements
    internals.OverscrollHeightUnits = "Elements";
    internals.UserOverscrollHeight = 9;
    internals.RebindCallback = null; // (element, index, value, userdata) => userdata
    internals.UpdateCallback = null; // (elements, startIndex, dataset) => void
    internals.ElementRefrencesNull = true;
    internals.UpdateQueued = false;
    internals.OldStartIndex = -1;
    internals.Dataset = [];
    internals.VirtualElements = [];
    internals.Elements = [];

    SetConst(VSLib, "SetRebindCallback", (value) => {
        if (typeof value != "function" && value != null) {
            throw new Error("RebindCallback must be a valid function or null.");
        }
        internals.RebindCallback = value;
    });
    SetConst(VSLib, "SetUpdateCallback", (value) => {
        if (typeof value != "function" && value != null) {
            throw new Error("UpdateCallback must be a valid function.");
        }
        internals.UpdateCallback = value;
    });
    SetConst(VSLib, "SetDataset", (value) => {
        if (!Array.isArray(value)) {
            throw new Error("Dataset must be a valid array.");
        }
        internals.Dataset = value.slice();
        Object.freeze(internals.Dataset);
        internals.OldStartIndex = -1;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetElementHeightInPixels", (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("ElementHeight must be a finite real number.");
        }
        internals.ElementHeightUnits = "Pixels";
        internals.UserElementHeight = value;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetElementHeightInPercent", (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("ElementHeight must be a finite real number.");
        }
        internals.ElementHeightUnits = "Percent";
        internals.UserElementHeight = value;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetElementsPerScreen", (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("ElementHeight must be a finite real number.");
        }
        internals.ElementHeightUnits = "ElementsPerScreen";
        internals.UserElementHeight = value;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetOverscrollHeightInPixels", (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("OverscrollHeight must be a finite real number.");
        }
        internals.OverscrollHeightUnits = "Pixels";
        internals.UserOverscrollHeight = value;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetOverscrollHeightInPercent", (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("OverscrollHeight must be a finite real number.");
        }
        internals.OverscrollHeightUnits = "Percent";
        internals.UserOverscrollHeight = value;
        internals.QueueUpdate();
    });
    SetConst(VSLib, "SetOverscrollHeightInElements", (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("OverscrollHeight must be a finite real number.");
        }
        internals.OverscrollHeightUnits = "Elements";
        internals.UserOverscrollHeight = value;
        internals.QueueUpdate();
    });
    internals.QueueUpdate = () => {
        if (!internals.UpdateQueued) {
            requestAnimationFrame(internals.Update);
            internals.UpdateQueued = true;
        }
    };
    internals.Rebind = (virtualElement, binding) => {
        // Set css variable binding
        virtualElement.Element.style.setProperty("--binding", binding);

        // Unselect this element
        const selection = window.getSelection();
        for (let j = 0; j < selection.rangeCount; j++) {
            const range = selection.getRangeAt(j);
            if (range.intersectsNode(virtualElement.Element)) {
                selection.removeRange(range);
            }
        }

        // Invoke the rebind callback if it is not null
        if (internals.RebindCallback != null) {
            const value = binding >= 0 && binding < internals.Dataset.length ? internals.Dataset[binding] : null;
            try {
                virtualElement.UserData = internals.RebindCallback(virtualElement.Element, binding, value, virtualElement.UserData);
            } catch (error) {
                console.error(error);
            }
        }
    };
    internals.Update = () => {
        // Mark update as no longer queued
        internals.UpdateQueued = false;

        // If the page hasn't loaded yet queue and update for next frame and return
        if (document.readyState == "loading") {
            internals.QueueUpdate();
            return;
        }

        // If the element refrences are null then set them
        if (internals.ElementRefrencesNull) {
            internals.ContainerElement = document.querySelector(".vslib_container");
            internals.ScrollElement = document.querySelector(".vslib_scroll");
            internals.ElementTemplateElement = document.querySelector(".vslib_element_template");
            internals.ContainerElement.addEventListener("scroll", () => {
                internals.QueueUpdate();
            });
            new ResizeObserver(() => {
                internals.QueueUpdate();
            }).observe(internals.ContainerElement);
            internals.ElementRefrencesNull = false;
        }

        // Recompute the basic numbers
        const containerHeight = internals.ContainerElement.clientHeight;
        let elementHeight = 108;
        switch (internals.ElementHeightUnits) {
            case "Pixels":
                elementHeight = internals.UserElementHeight;
                break;
            case "Percent":
                elementHeight = (internals.UserElementHeight / 100) * containerHeight;
                break;
            case "ElementsPerScreen":
                elementHeight = containerHeight / internals.UserElementHeight;
                break;
        }
        document.documentElement.style.setProperty("--vslib-element-height", `${elementHeight}px`);
        let overscrollHeight = 972;
        switch (internals.OverscrollHeightUnits) {
            case "Pixels":
                overscrollHeight = internals.UserOverscrollHeight;
                break;
            case "Percent":
                overscrollHeight = (internals.UserOverscrollHeight / 100) * containerHeight;
                break;
            case "Elements":
                overscrollHeight = internals.UserOverscrollHeight * elementHeight;
                break;
        }
        const scrollElementHeight = Math.max((internals.Dataset.length * elementHeight) + overscrollHeight, containerHeight);
        document.documentElement.style.setProperty("--vslib-scroll-element-height", `${scrollElementHeight}px`);
        const targetElementCount = (containerHeight / elementHeight) + 1;
        if (internals.OldStartIndex == -1) {
            internals.ContainerElement.scrollTop = 0;
        }
        const startIndex = Math.floor(internals.ContainerElement.scrollTop / elementHeight);
        const startIndexChanged = startIndex != internals.OldStartIndex;
        const elementCountChanged = targetElementCount != internals.VirtualElements.length;

        // Rebind the minimal number of elements and reorder internals.VirtualElements
        if (startIndexChanged) {
            if (internals.OldStartIndex == -1 || Math.abs(startIndex - internals.OldStartIndex) > internals.VirtualElements.length) {
                for (let i = 0; i < internals.VirtualElements.length; i++) {
                    const virtualElement = internals.VirtualElements[i];
                    const binding = startIndex + i;
                    internals.Rebind(virtualElement, binding);
                }
            } else if (startIndex > internals.OldStartIndex) {
                const shiftCount = startIndex - internals.OldStartIndex;
                const shiftStartIndex = internals.OldStartIndex + internals.VirtualElements.length;
                for (let i = 0; i < shiftCount; i++) {
                    const virtualElement = internals.VirtualElements.shift();
                    internals.VirtualElements.push(virtualElement);
                    const binding = shiftStartIndex + i;
                    internals.Rebind(virtualElement, binding);
                }
            } else if (startIndex < internals.OldStartIndex) {
                const shiftCount = internals.OldStartIndex - startIndex;
                const shiftStartIndex = internals.OldStartIndex - 1;
                for (let i = 0; i < shiftCount; i++) {
                    const virtualElement = internals.VirtualElements.pop();
                    internals.VirtualElements.unshift(virtualElement);
                    const binding = shiftStartIndex - i;
                    internals.Rebind(virtualElement, binding);
                }
            }
            internals.OldStartIndex = startIndex;
        }

        // Create new virtual elements if needed
        if (elementCountChanged) {
            while (internals.VirtualElements.length < targetElementCount) {
                const element = internals.ElementTemplateElement.cloneNode(true);
                element.classList.remove("vslib_element_template");
                element.classList.add("vslib_element");
                internals.ScrollElement.appendChild(element);
                const virtualElement = { Element: element, UserData: null };
                internals.VirtualElements.push(virtualElement);
                const binding = startIndex + internals.VirtualElements.length - 1;
                internals.Rebind(virtualElement, binding);
            }
            internals.Elements = internals.VirtualElements.map(virtualElement => virtualElement.Element);
            Object.freeze(internals.Elements);
        }

        // Invoke the update callback if it is not null
        if (internals.UpdateCallback != null && (startIndexChanged || elementCountChanged)) {
            try {
                internals.UpdateCallback(internals.Elements, startIndex, internals.Dataset);
            } catch (error) {
                console.error(error);
            }
        }
    };
    DeepFreeze(VSLib);
    internals.QueueUpdate();
})();