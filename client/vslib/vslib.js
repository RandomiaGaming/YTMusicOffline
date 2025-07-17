// Approved 06/24/2025
"use strict";

(() => {
    const VSLib = {};

    let ContainerElement = null;
    let ScrollElement = null;
    let ElementTemplateElement = null;
    let ElementHeightUnits = "ElementsPerScreen"; // Enum: Pixels Percent ElementsPerScreen
    let UserElementHeight = 10;
    let OverscrollHeightUnits = "Elements"; // Enum: Pixels Percent Elements
    let UserOverscrollHeight = 9;
    let RebindCallback = null; // (element, index, value, userdata) => userdata
    let UpdateCallback = null; // (elements, startIndex, dataset) => void
    let ElementRefrencesNull = true;
    let UpdateQueued = false;
    let OldStartIndex = -1;
    let Dataset = [];
    let VirtualElements = [];

    VSLib.SetRebindCallback = (value) => {
        if (typeof value != "function" && value !== null) {
            throw new Error("RebindCallback must be a valid function or null.");
        }
        RebindCallback = value;
    };
    VSLib.SetUpdateCallback = (value) => {
        if (typeof value != "function" && value !== null) {
            throw new Error("UpdateCallback must be a valid function.");
        }
        UpdateCallback = value;
    };
    VSLib.SetDataset = (value) => {
        if (!Array.isArray(value)) {
            throw new Error("Dataset must be a valid array.");
        }
        Dataset = value.slice();
        Object.freeze(Dataset);
        OldStartIndex = -1;
        QueueUpdate();
    };

    VSLib.SetElementHeightInPixels = (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("ElementHeight must be a finite real number.");
        }
        ElementHeightUnits = "Pixels";
        UserElementHeight = value;
        QueueUpdate();
    };
    VSLib.SetElementHeightInPercent = (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("ElementHeight must be a finite real number.");
        }
        ElementHeightUnits = "Percent";
        UserElementHeight = value;
        QueueUpdate();
    };
    VSLib.SetElementsPerScreen = (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("ElementHeight must be a finite real number.");
        }
        ElementHeightUnits = "ElementsPerScreen";
        UserElementHeight = value;
        QueueUpdate();
    };

    VSLib.SetOverscrollHeightInPixels = (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("OverscrollHeight must be a finite real number.");
        }
        OverscrollHeightUnits = "Pixels";
        UserOverscrollHeight = value;
        QueueUpdate();
    };
    VSLib.SetOverscrollHeightInPercent = (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("OverscrollHeight must be a finite real number.");
        }
        OverscrollHeightUnits = "Percent";
        UserOverscrollHeight = value;
        QueueUpdate();
    };
    VSLib.SetOverscrollHeightInElements = (value) => {
        if (!Number.isFinite(value)) {
            throw new Error("OverscrollHeight must be a finite real number.");
        }
        OverscrollHeightUnits = "Elements";
        UserOverscrollHeight = value;
        QueueUpdate();
    };

    const QueueUpdate = () => {
        if (!UpdateQueued) {
            requestAnimationFrame(Update);
            UpdateQueued = true;
        }
    };
    const Rebind = (virtualElement, binding) => {
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
        if (RebindCallback !== null) {
            const value = binding >= 0 && binding < Dataset.length ? Dataset[binding] : null;
            try {
                virtualElement.UserData = RebindCallback(virtualElement.Element, binding, value, virtualElement.UserData);
            } catch (error) {
                console.error(error);
            }
        }
    };
    const Update = () => {
        // Mark update as no longer queued
        UpdateQueued = false;

        // If the page hasn't loaded yet queue and update for next frame and return
        if (document.readyState == "loading") {
            QueueUpdate();
            return;
        }

        // If the element refrences are null then set them
        if (ElementRefrencesNull) {
            ContainerElement = document.querySelector(".vslib_container");
            ScrollElement = document.querySelector(".vslib_scroll");
            ElementTemplateElement = document.querySelector(".vslib_element_template");
            ContainerElement.addEventListener("scroll", () => {
                QueueUpdate();
            });
            new ResizeObserver(() => {
                QueueUpdate();
            }).observe(ContainerElement);
            ElementRefrencesNull = false;
        }

        // Recompute the basic numbers
        const containerHeight = ContainerElement.clientHeight;
        let elementHeight = 108;
        switch (ElementHeightUnits) {
            case "Pixels":
                elementHeight = UserElementHeight;
                break;
            case "Percent":
                elementHeight = (UserElementHeight / 100) * containerHeight;
                break;
            case "ElementsPerScreen":
                elementHeight = containerHeight / UserElementHeight;
                break;
        }
        document.documentElement.style.setProperty("--vslib-element-height", `${elementHeight}px`);
        let overscrollHeight = 972;
        switch (OverscrollHeightUnits) {
            case "Pixels":
                overscrollHeight = UserOverscrollHeight;
                break;
            case "Percent":
                overscrollHeight = (UserOverscrollHeight / 100) * containerHeight;
                break;
            case "Elements":
                overscrollHeight = UserOverscrollHeight * elementHeight;
                break;
        }
        const scrollElementHeight = Math.max((Dataset.length * elementHeight) + overscrollHeight, containerHeight);
        document.documentElement.style.setProperty("--vslib-scroll-element-height", `${scrollElementHeight}px`);
        const targetElementCount = (containerHeight / elementHeight) + 1;
        if (OldStartIndex == -1) {
            ContainerElement.scrollTop = 0;
        }
        const startIndex = Math.floor(ContainerElement.scrollTop / elementHeight);
        const startIndexChanged = startIndex != OldStartIndex;
        const elementCountChanged = targetElementCount != VirtualElements.length;

        // Rebind the minimal number of elements and reorder VirtualElements
        if (startIndexChanged) {
            if (OldStartIndex == -1 || Math.abs(startIndex - OldStartIndex) > VirtualElements.length) {
                for (let i = 0; i < VirtualElements.length; i++) {
                    const virtualElement = VirtualElements[i];
                    const binding = startIndex + i;
                    Rebind(virtualElement, binding);
                }
            } else if (startIndex > OldStartIndex) {
                const shiftCount = startIndex - OldStartIndex;
                const shiftStartIndex = OldStartIndex + VirtualElements.length;
                for (let i = 0; i < shiftCount; i++) {
                    const virtualElement = VirtualElements.shift();
                    VirtualElements.push(virtualElement);
                    const binding = shiftStartIndex + i;
                    Rebind(virtualElement, binding);
                }
            } else if (startIndex < OldStartIndex) {
                const shiftCount = OldStartIndex - startIndex;
                const shiftStartIndex = OldStartIndex - 1;
                for (let i = 0; i < shiftCount; i++) {
                    const virtualElement = VirtualElements.pop();
                    VirtualElements.unshift(virtualElement);
                    const binding = shiftStartIndex - i;
                    Rebind(virtualElement, binding);
                }
            }
            OldStartIndex = startIndex;
        }

        // Create new virtual elements if needed
        if (elementCountChanged) {
            while (VirtualElements.length < targetElementCount) {
                const element = ElementTemplateElement.cloneNode(true);
                element.classList.remove("vslib_element_template");
                element.classList.add("vslib_element");
                ScrollElement.appendChild(element);
                const virtualElement = { Element: element, UserData: null };
                VirtualElements.push(virtualElement);
                const binding = startIndex + VirtualElements.length - 1;
                Rebind(virtualElement, binding);
            }
        }

        // Invoke the update callback if it is not null
        if (UpdateCallback !== null && (startIndexChanged || elementCountChanged)) {
            // No point caching Elements as the order changes with each rebind and since this array is passed to the user its untrusted anyways.
            const Elements = VirtualElements.map(virtualElement => virtualElement.Element);
            try {
                UpdateCallback(Elements, startIndex, Dataset);
            } catch (error) {
                console.error(error);
            }
        }
    };
    QueueUpdate();

    globalThis.VSLib = VSLib;
})();