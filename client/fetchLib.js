// Approved 03/17/2025
"use strict";

(() => {
    const internals = DefModule("FetchLib");

    SetConst(FetchLib, "BlankImageDataUrl", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=");

    internals.ImageCache = new Map();
    internals.RequestCallbacks = [];
    internals.RequestsInProgress = [];
    SetConst(FetchLib, "BindImage", (element, url) => {
        if (url == null) {
            element.src = FetchLib.BlankImageDataUrl;
            return;
        }

        url = new URL(url, window.location.href).href;

        if (internals.ImageCache.has(url)) {
            element.src = internals.ImageCache.get(url);
            return;
        }

        element.src = FetchLib.BlankImageDataUrl;

        let requestCallbackFound = false;
        for (let i = 0; i < internals.RequestCallbacks.length; i++) {
            const requestCallback = internals.RequestCallbacks[i];
            if (requestCallback.element == element) {
                requestCallback.url = url;
                requestCallbackFound = true;
                break;
            }
        }
        if (!requestCallbackFound) {
            internals.RequestCallbacks.push({ element: element, url: url });
        }

        if (internals.RequestsInProgress.includes(url)) {
            return;
        }

        fetch(url, {
            method: "GET",
            headers: { Priority: "high" }
        }).then((response) => {
            response.blob().then((blobObject) => {
                const blobUrl = URL.createObjectURL(blobObject);
                internals.ImageCache.set(url, blobUrl);

                for (let i = 0; i < internals.RequestCallbacks.length; i++) {
                    const requestCallback = internals.RequestCallbacks[i];
                    if (requestCallback.url == url) {
                        requestCallback.element.src = blobUrl;
                        internals.RequestCallbacks.splice(i, 1);
                        i--;
                    }
                }

                internals.RequestsInProgress.splice(internals.RequestsInProgress.indexOf(url), 1);
            });
        });
        internals.RequestsInProgress.push(url);
    });

    internals.
        SetConst(FetchLib, "DelayBindImage", (element, url, delay) => {
            setTimeout(() => {
                console.log("This runs after 500ms");
            }, delay);
        });
})();