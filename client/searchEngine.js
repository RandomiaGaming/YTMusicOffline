// Approved 03/17/2025
"use strict";

(() => {
    const context = defModule("SearchEngine");
    const internals = context.Internals;

    setConst(context, "Search", (query) => {
        if (query === null || query === undefined) {
            query = document.querySelector(".search_bar").value;
        }
        query = query.toLowerCase();

        const newPlaylist = [];
        for (let i = 0; i < Database.length; i++) {
            const song = Database[i];
            if (song.text.toLowerCase().includes(query)) {
                newPlaylist.push(song);
            }
        }

        Player.Playlist = newPlaylist;
        VSLib.SetDataset(Player.Playlist);
    });
})();