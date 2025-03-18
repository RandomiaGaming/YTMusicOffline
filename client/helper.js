// Approved 03/17/2025
"use strict";

(() => {
    // Create global helper functions
    const setConstFunctionBody = (obj, prop, val) => {
        if (obj === null || obj === undefined) {
            obj = globalThis;
        }
        Object.defineProperty(obj, prop, {
            value: val,
            writable: false,
            configurable: false,
            enumerable: true,
        });
    }
    setConstFunctionBody(null, "SetConst", setConstFunctionBody);

    SetConst(null, "DefModule", (moduleName) => {
        const moduleContext = {};
        SetConst(null, moduleName, moduleContext);
        const moduleInternals = {};
        SetConst(moduleContext, "Internals", moduleInternals);
        return moduleInternals;
    });

    // Create helper module functions
    const internals = DefModule("Helper");

    SetConst(Helper, "EpochToString", (timestamp) => {
        const date = new Date(timestamp * 1000);
        const day = ("0" + date.getUTCDate().toString()).slice(-2);
        const month = ("0" + (date.getUTCMonth() + 1).toString()).slice(-2);
        const year = ("000" + date.getUTCFullYear().toString()).slice(-4);
        return month + "/" + day + "/" + year;
    });

    SetConst(Helper, "OnDomLoad", (callback) => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback);
        } else {
            callback();
        }
    });

    SetConst(Helper, "RandomRange", (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    });
})();