// Approved 3/12/2025
"use strict";
(() => {
    const context = defModule("DataLoader");
    const internals = context.Internals;

    internals.Callbacks = [];
    internals.IsLoaded = false;

    setConst(context, "IsLoaded", () => {
        return internals.IsLoaded;
    });

    setConst(context, "RunWhenDatabaseLoaded", (callback) => {
        if (internals.IsLoaded) {
            callback();
        } else {
            internals.Callbacks.push(callback);
        }
    });

    const fetchPromise = fetch("/database/database.json");
    fetchPromise.then((result) => {
        const jsonPromise = result.json();
        jsonPromise.then((result) => {
            console.time("postProcessing");
            for (let i = 0; i < result.length; i++) {
                const song = result[i];

                song.index = i;
                let text = song.title + " from " + song.album + " by ";
                switch (song.artists.length) {
                    case 1:
                        text += song.artists[0];
                        break;
                    case 2:
                        text += song.artists[0] + ", and " + song.artists[1];
                        break;
                    case 3:
                        text += song.artists[0] + ", " + song.artists[1] + ", and " + song.artists[2];
                        break;
                    default:
                        text += song.artists[0] + ", " + song.artists[1] + ", " + song.artists[2] + ", and others";
                        break;
                }
                text += " released on " + epochToString(song.releaseDate);
                song.text = text;
            }
            console.timeEnd("postProcessing");
            Object.freeze(result);
            setConst(null, "Database", result);
            internals.IsLoaded = true;
            for (let i = 0; i < internals.Callbacks.length; i++) {
                internals.Callbacks[i]();
            }
        });
    });
})();