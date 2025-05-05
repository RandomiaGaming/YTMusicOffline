// Approved 03/20/2025
"use strict";

(() => {
    const internals = DefModule("ImageLoader");

    // SetConst(internals, "BlankImageSrcAlt", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=");
    SetConst(internals, "BlankImageSrc", "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAP///yH5BAUAAAAALAAAAAABAAEAAAICRAEAOw==");
    SetConst(internals, "PreferMultiboundRequests", false);
    SetConst(internals, "PreloadConcurrencyLimit", 1);
    SetConst(internals, "FetchConcurrencyLimit", 5);

    SetConst(internals, "ValidateSrc", (src) => {
        if (src == null) {
            return null;
        }
        try {
            return new URL(src, window.location.href).href;
        }
        catch {
            throw new Error("src must be a valid relative or rooted url.");
        }
    });
    SetConst(internals, "ValidateElement", (element) => {
        if (element instanceof HTMLImageElement) {
            return element;
        }
        else {
            throw new Error("element must be a valid refrence to an img element.");
        }
    });

    // Request Class Prototype: { src: string, elements: img_element[], cacheSrc: string, state: enum(0=QueuedLoadRequest, 1=QueuedPreloadRequest, 2=InProgressRequest, 3=CompletedRequest) }
    internals.InProgressRequestCount = 0;
    internals.RequestsBySrc = new Map();
    internals.RequestsByElement = new Map();
    internals.PreloadRequestsBySrc = new Map();

    SetConst(ImageLoader, "ClearPreloads", () => {
        // Go through each request preload request and make it a load request
        internals.PreloadRequestsBySrc.forEach((preloadRequestBySrc, src) => {
            preloadRequestBySrc.state = 0;
            if (preloadRequestBySrc.elements.length == 0) {
                internals.RequestsBySrc.delete(preloadRequestBySrc.src);
            }
        });
        // Then clear the list of preload requests
        internals.PreloadRequestsBySrc.clear();
    });
    SetConst(ImageLoader, "Preload", (src) => {
        // Validate input
        src = internals.ValidateSrc(src);
        // Ignore attempts to preload null since that is silly
        if (src == null) {
            return;
        }
        // Check if there is already a request for this src
        const requestBySrc = internals.RequestsBySrc.get(src);
        if (requestBySrc === undefined) {
            // If there is not then create a new preload request
            const newRequest = { src: src, elements: [], cacheSrc: null, state: 1 };
            internals.RequestsBySrc.set(src, newRequest);
            internals.PreloadRequestsBySrc.set(src, newRequest);
            internals.Update();
        } else if (requestBySrc.state == 0) {
            // If there is and it is in the QueuedLoadRequest then transition it to the QueuedPreloadRequest state
            requestBySrc.state = 1;
            internals.PreloadRequestsBySrc.set(src, requestBySrc);
        }
    });
    SetConst(ImageLoader, "Bind", (element, src) => {
        // Validate input
        src = internals.ValidateSrc(src);
        element = internals.ValidateElement(element);
        // If src is null then simply double check that the element src is the blank image and return
        if (src == null) {
            if (element.src != internals.BlankImageSrc) {
                element.src = internals.BlankImageSrc;
            }
            return;
        }
        // Get request by src and by element if there are any
        const requestBySrc = internals.RequestsBySrc.get(src);
        const requestByElement = internals.RequestsByElement.get(element);
        // If there is a request with this element and this src then this request is a duplicate
        if (requestByElement !== undefined && requestByElement.src == src) {
            return;
        }
        // If there is a request with this element for another 
        // If there is a request with this src and it has completed already then use the cached result
        if (requestBySrc !== undefined && requestBySrc.state == 3) {
            if (element.src != requestBySrc.cacheSrc) {
                element.src = requestBySrc.cacheSrc;
            }
            return;
        }
        // Set this element to the blank image in the meantime while we await this request
        if (element.src != internals.BlankImageSrc) {
            element.src = internals.BlankImageSrc;
        }
        // If there is a request with this src then add this element to it
        if (requestBySrc !== undefined) {
            requestBySrc.elements.push(element);
            internals.RequestsByElement.set(element, requestBySrc);
        }
        // Otherwise start a new request for this src
        else {
            const newRequest = { src: src, elements: [element], cacheSrc: null, state: 0 };
            internals.RequestsBySrc.set(src, newRequest);
            internals.RequestsByElement.set(element, newRequest);
            internals.Update();
        }
        // Either way if we made it here then we need to update
        internals.Update();
    });
    SetConst(internals, "Update", () => {
        // Compute the next request based on a few factors
        let nextRequest = null;
        internals.RequestsBySrc.forEach((requestBySrc, src) => {
            // Requests which are in progress are not eligable to be started again
            if (requestBySrc.state != 0 && requestBySrc.state != 1) {
                return;
            }

            if (
                // Something is better than nothing
                nextRequest == null
                // A load is better than a preload
                || (nextRequest.elements.length == 0 && requestBySrc.elements.length != 0)
                // A multibound load is better than a regular load if PreferMultiboundRequests == true
                || (internals.PreferMultiboundRequests && nextRequest.elements.length < requestBySrc.elements.length)
            ) {
                nextRequest = requestBySrc;
            }
        });
        if (
            // If no requests were availible for next time then give up
            nextRequest == null
            // Next request is a preload and we have more than the PreloadConcurrencyLimit requests in progress already
            || (nextRequest.elements.length == 0 && internals.InProgressRequestCount >= internals.PreloadConcurrencyLimit)
            // Next request is a load and we have more than the FetchConcurrencyLimit requests in progress already
            || (nextRequest.elements.length != 0 && internals.InProgressRequestCount >= internals.FetchConcurrencyLimit)
        ) {
            return;
        }
        internals.InProgressRequestCount++;
        if (nextRequest.state == 1) {
            internals.PreloadRequestsBySrc.delete(nextRequest.src);
        }
        nextRequest.state = 2;
        fetch(nextRequest.src, {
            method: "GET",
            headers: { Priority: "high" }
        }).then((response) => {
            response.blob().then((image) => {
                nextRequest.cacheSrc = URL.createObjectURL(image);

                for (let i = 0; i < nextRequest.elements.length; i++) {
                    const element = nextRequest.elements[i];
                    element.src = nextRequest.cacheSrc;
                }

                nextRequest.state = 3;
                internals.InProgressRequestCount--;

                internals.Update();
            });
        });
    });
    DeepFreeze(ImageLoader);
})();