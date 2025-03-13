"use strict";
(() => {
    Object.defineProperty(globalThis, "setConst", {
        value: (obj, prop, val) => {
            if (obj === null || obj === undefined) {
                obj = globalThis;
            }
            Object.defineProperty(obj, prop, {
                value: val,
                writable: false,
                configurable: false,
                enumerable: true,
            });
        },
        writable: false,
        configurable: false,
        enumerable: true,
    });

    setConst(null, "defModule", (moduleName) => {
        const context = {};
        setConst(null, moduleName, context);
        const internals = {};
        setConst(context, "Internals", internals);
        return context;
    });

    setConst(null, "epochToString", (timestamp) => {
        const date = new Date(timestamp * 1000);
        const day = ("0" + date.getUTCDate().toString()).slice(-2);
        const month = ("0" + (date.getUTCMonth() + 1).toString()).slice(-2);
        const year = ("000" + date.getUTCFullYear().toString()).slice(-4);
        return month + "/" + day + "/" + year;
    });

    setConst(null, "runOnDomLoad", (callback) => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback);
        } else {
            callback();
        }
    });
})();