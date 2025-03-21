// Approved 03/20/2025
"use strict";

(() => {
    const internals = DefModule("FetchLib");

    // Returns a constant used as a url for a blank image
    SetConst(FetchLib, "BlankImageDataUrl", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=");

    // Takes a relative or rooted url and returns a rooted url
    // Throws a descriptive error if url is invalid.
    SetConst(FetchLib, "RootUrl", (url) => {
        try {
            return new URL(url, window.location.href).href;
        } catch {
            throw new Error("url must be a valid relative or rooted url.");
        }
    });

    // Fetches an image and respects the FetchConcurrencyLimit
    // Requests will be queued if more than 5 requests are already in motion
    // Does not implament any caching
    internals.FetchQueue = [];
    internals.FetchConcurrencyLimit = 5;
    internals.FetchRequestCount = 0;
    SetConst(FetchLib, "FetchImage", (url, callback) => {
        const rootedUrl = FetchLib.RootUrl(url);
        if (typeof callback !== "function") {
            throw new Error("callback must be a valid function.");
        }

        if (internals.FetchRequestCount >= internals.FetchConcurrencyLimit) {
            internals.FetchQueue.push({ url: url, callback: callback });
            return;
        }

        internals.FetchRequestCount++;
        fetch(rootedUrl, {
            method: "GET",
            headers: { Priority: "high" }
        }).then((response) => {
            response.blob().then((blobObject) => {
                internals.FetchRequestCount--;
                if (internals.FetchQueue.length > 0) {
                    const nextInQueue = internals.FetchQueue[0];
                    internals.FetchQueue.shift();
                    FetchLib.FetchImage(nextInQueue.url, nextInQueue.callback);
                }

                const blobUrl = URL.createObjectURL(blobObject);
                callback(blobUrl);
            });
        });
    });

    // Fetches an image or returns the cached version if there is one
    // If a request for the image is already in progress it will simply
    // wait for the request to finish and use the cached result instead
    // of starting a new request.
    internals.ImageCache = new Map();
    internals.RequestCallbacks = new Map();
    SetConst(FetchLib, "FetchImageWithCache", (url, callback) => {
        const rootedUrl = FetchLib.RootUrl(url);
        if (typeof callback !== "function") {
            throw new Error("callback must be a valid function.");
        }

        if (internals.ImageCache.has(rootedUrl)) {
            callback(internals.ImageCache.get(rootedUrl));
            return;
        }

        if (internals.RequestCallbacks.has(rootedUrl)) {
            const requestCallbacks = internals.RequestCallbacks.get(rootedUrl);
            requestCallbacks.push(callback);
            return;
        }

        internals.RequestCallbacks.set(rootedUrl, [callback]);
        FetchLib.FetchImage(rootedUrl, (image) => {
            internals.ImageCache.set(rootedUrl, image);
            const requestCallbacks = internals.RequestCallbacks.get(rootedUrl);
            for (let i = 0; i < requestCallbacks.length; i++) {
                requestCallbacks[i](image);
            }
            internals.RequestCallbacks.delete(rootedUrl);
        });
    });

    // Fetches an image and sets the src of an img to that image
    // Uses the cache to save network bandwidth
    // If an img is rebound before the image downloads the original
    // image will still be downloaded and cached but the src will
    // not be changed since the img is not longer bound to that image.
    // Img src's will be set to a blank image if the requested image
    // is not yet availibe.
    internals.ImageBindings = new Map();
    SetConst(FetchLib, "BindImage", (element, url) => {
        if (!(element instanceof HTMLImageElement)) {
            throw new Error("element must be a valid refrence to an img element.");
        }
        const rootedUrl = url == null ? null : FetchLib.RootUrl(url);

        internals.ImageBindings.set(element, rootedUrl);
        element.src = FetchLib.BlankImageDataUrl;

        if (rootedUrl == null) {
            return;
        }
        FetchLib.FetchImageWithCache(rootedUrl, (image) => {
            const binding = internals.ImageBindings.get(element);
            if (binding == rootedUrl) {
                element.src = image;
            }
        });
    });

    // Waits for delay miliseconds and if the element has not been
    // rebound to a new image then it downloads and sets the src.
    // Img src will be set to a blank image during the waiting period.
    internals.DelayedImageBindings = new Map();
    SetConst(FetchLib, "DelayBindImage", (element, url, delay) => {
        if (!(element instanceof HTMLImageElement)) {
            throw new Error("element must be a valid refrence to an img element.");
        }
        const rootedUrl = url == null ? null : FetchLib.RootUrl(url);

        if (internals.DelayedImageBindings.has(element)) {
            const delayedBinding = internals.DelayedImageBindings.get(element);
            if (delayedBinding.url == rootedUrl) {
                return;
            }

            if (delayedBinding.timeoutId != null) {
                clearTimeout(delayedBinding.timeoutId);
            }
        }

        element.src = FetchLib.BlankImageDataUrl;
        const timeoutId = setTimeout(() => {
            const delayedBinding = internals.DelayedImageBindings.get(element);
            delayedBinding.timeoutId = null;

            FetchLib.BindImage(element, url);
        }, delay);
        internals.DelayedImageBindings.set(element, { url: rootedUrl, timeoutId: timeoutId });
    });
})();