// Approved 03/20/2025
"use strict";

(() => {
    const internals = DefModule("ThumbnailLoader");

    SetConst(internals, "BlankThumbUrl", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");
    SetConst(internals, "FetchConcurrencyLimit", 5);

    // FetchConcurrencyLimit = 5
    // PreloadConcurrencyLimit = 1
    // Bind
    // SetOnScreenRange

    internals.NextRequestId = 0;
    internals.ImageCache = new Map();
    internals.RequestCount = 0;
    internals.Requests = new Map();
    SetConst(ThumbnailLoader, "Bind", (thumbnailElement, song) => {
        // Validate input
        if (typeof callback !== "function") {
            throw new Error("callback must be a valid function.");
        }
        let rootedUrl = null;
        try {
            if (url != null) {
                rootedUrl = new URL(url, window.location.href).href;
            }
        } catch {
            throw new Error("url must be a valid relative or rooted url.");
        }

        // If url is null return instantly
        if (rootedUrl == null) {
            callback(ThumbnailLoader.BlankImageDataUrl);
            return null;
        }

        // If url is in cache return cached image
        const cachedImage = internals.ImageCache.get(rootedUrl);
        if (cachedImage != undefined) {
            callback(cachedImage);
            return null;
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
                    ThumbnailLoader.FetchImage(nextInQueue.url, nextInQueue.callback);
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

    SetConst(ThumbnailLoader, "FetchImageWithCache", (url, callback) => {
        if (typeof callback !== "function") {
            throw new Error("callback must be a valid function.");
        }
        const rootedUrl = url == null ? null : ThumbnailLoader.RootUrl(url);



        if (internals.RequestCallbacks.has(rootedUrl)) {
            const requestCallbacks = internals.RequestCallbacks.get(rootedUrl);
            requestCallbacks.push(callback);
            return;
        }

        internals.RequestCallbacks.set(rootedUrl, [callback]);
        ThumbnailLoader.FetchImage(rootedUrl, (imageBlobUrl) => {
            internals.ImageCache.set(rootedUrl, imageBlobUrl);
            const requestCallbacks = internals.RequestCallbacks.get(rootedUrl);
            for (let i = 0; i < requestCallbacks.length; i++) {
                requestCallbacks[i](imageBlobUrl);
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
    SetConst(ThumbnailLoader, "BindImage", (element, url) => {
        if (!(element instanceof HTMLImageElement)) {
            throw new Error("element must be a valid refrence to an img element.");
        }
        const rootedUrl = url == null ? null : ThumbnailLoader.RootUrl(url);

        if (rootedUrl == internals.ImageBindings.get(element)) {
            return;
        }
        internals.ImageBindings.set(element, rootedUrl);

        if (element.src != ThumbnailLoader.BlankImageDataUrl) {
            element.src = ThumbnailLoader.BlankImageDataUrl;
        }

        ThumbnailLoader.FetchImageWithCache(rootedUrl, (imageBlobUrl) => {
            const binding = internals.ImageBindings.get(element);
            if (binding == rootedUrl) {
                if (element.src != imageBlobUrl) {
                    element.src = imageBlobUrl;
                }
            }
        });
    });

    internals.ImageBindingsDebounced = new Map();
    SetConst(ThumbnailLoader, "BindImageDebounced", (element, url) => {
        if (!(element instanceof HTMLImageElement)) {
            throw new Error("element must be a valid refrence to an img element.");
        }
        const rootedUrl = url == null ? null : ThumbnailLoader.RootUrl(url);

        if (!internals.ImageBindingsDebounced.has(element)) {
            internals.ImageBindingsDebounced.set(element, { url: undefined, inProgress: false });
        }
        const binding = internals.ImageBindingsDebounced.get(element);
        if (binding.url == rootedUrl) {
            return;
        }
        binding.url = rootedUrl;
        if (binding.inProgress) {
            return;
        }
        binding.inProgress = true;
        if (element.src != ThumbnailLoader.BlankImageDataUrl) {
            element.src = ThumbnailLoader.BlankImageDataUrl;
        }
        const callback = (imageBlobUrl) => {
            if (binding == rootedUrl) {
                if (element.src != imageBlobUrl) {
                    element.src = imageBlobUrl;
                }
                binding.inProgress = false;
            } else {
                ThumbnailLoader.FetchImageWithCache(binding, callback);
            }
        };
        ThumbnailLoader.FetchImageWithCache(rootedUrl, callback);
    });
})();