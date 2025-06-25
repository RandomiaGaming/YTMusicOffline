// Approved 03/20/2025
"use strict";

(() => {
    const ThumbLib = {};

    let GeneralConcurrencyLimit = 5;
    let PreloadConcurrencyLimit = 1; // 0 = no preload
    ThumbLib.SetConcurrencyLimits = (generalConcurrencyLimit, preloadConcurrencyLimit) => {
        if (!Number.isInteger(generalConcurrencyLimit) || generalConcurrencyLimit <= 0) {
            throw new Error("GeneralConcurrencyLimit must an integer greater than 0.");
        }
        if (!Number.isInteger(preloadConcurrencyLimit) || preloadConcurrencyLimit <= 0 || preloadConcurrencyLimit > generalConcurrencyLimit) {
            throw new Error("PreloadConcurrencyLimit must an integer greater than 0 and less than or equal to GeneralConcurrencyLimit.");
        }
        GeneralConcurrencyLimit = generalConcurrencyLimit;
        PreloadConcurrencyLimit = preloadConcurrencyLimit;
        Update();
    };

    let PreloadLimit = 15; // 0 = unlimitted
    ThumbLib.SetPreloadLimit = (value) => {
        if (!Number.isInteger(value) || value < 0) {
            throw new Error("PreloadLimit must a positive integer or 0.");
        }
        PreloadLimit = value;
        Update();
    };

    let Elements = [];
    let Dataset = [];
    let StartIndex = [];
    ThumbLib.Rebind = (elements, dataset, startIndex) => {
        if (!Array.isArray(elements)) {
            throw new Error("Elements must be a valid array.");
        }
        for (let element of elements) {
            if (!(element instanceof HTMLImageElement)) {
                throw new Error("Elements must contain only HTMLImageElements.");
            }
        }
        if (!Array.isArray(dataset)) {
            throw new Error("Dataset must be a valid array.");
        }
        for (let imageUrl of dataset) {
            if (typeof imageUrl != "string") {
                throw new Error("Dataset must contain only string urls.");
            }
        }
        if (!Number.isInteger(startIndex) || startIndex < 0) {
            throw new Error("StartIndex must a positive integer or 0.");
        }
        Elements = elements.slice();
        Dataset = dataset.slice();
        StartIndex = startIndex;
        Update();
    };

    ThumbLib.BlankImageSrc = "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAP///yH5BAUAAAAALAAAAAABAAEAAAICRAEAOw==";
    
    let ImageCache = new Map();
    let InProgressRequests = new Set();
    const Update = () => {
        // TODO handle index out of bounds gracefully
        // Handle duplicates gracefully

        // Process loads
        for (let i = 0; i < Elements.length; i++) {
            const element = Elements[i];
            const url = Dataset[StartIndex + i];
            if (ImageCache.has(url)) {
                const cacheUrl = ImageCache.get(url);
                if (element.url != cacheUrl) {
                    // Update url to cached image
                    element.url = cacheUrl;
                } else {
                    // Do nothing: Url already correct
                }
            } else if (InProgressRequests.size < GeneralConcurrencyLimit) {
                // Send off request for url
                InProgressRequests.add(url);
                fetch(url, {
                    method: "GET",
                    headers: { Priority: "high" }
                }).then((response) => {
                    response.blob().then((image) => {
                        ImageCache.set(url, URL.createObjectURL(image));
                        InProgressRequests.delete(url);
                        Update();
                    });
                });
            } else {
                // Do nothing: Image needed but no free space
            }
        }

        // Process preloads
        for (let i = 0; i < PreloadLimit || PreloadLimit == 0; i++) {
            let url = Dataset[StartIndex + Elements.length + i];
            if (InProgressRequests.size < PreloadConcurrencyLimit) {
                // Send off preload request for url
                InProgressRequests.add(url);
                fetch(url, {
                    method: "GET",
                    headers: { Priority: "high" }
                }).then((response) => {
                    response.blob().then((image) => {
                        ImageCache.set(url, URL.createObjectURL(image));
                        InProgressRequests.delete(url);
                        Update();
                    });
                });
            } else {
                // Break out of loop because there is no more free space for preloads.
                break;
            }

            url = Dataset[StartIndex - i];
            if (InProgressRequests.size < PreloadConcurrencyLimit) {
                // Send off preload request for url
                InProgressRequests.add(url);
                fetch(url, {
                    method: "GET",
                    headers: { Priority: "high" }
                }).then((response) => {
                    response.blob().then((image) => {
                        ImageCache.set(url, URL.createObjectURL(image));
                        InProgressRequests.delete(url);
                        Update();
                    });
                });
            } else {
                // Break out of loop because there is no more free space for preloads.
                break;
            }
        }
    };

    globalThis.ThumbLib = ThumbLib;
})();