// Approved 03/17/2025
"use strict";

(() => {
    const internals = DefModule("Player");

    Player.Database = [];
    Player.Playlist = [];
    Player.NowPlaying = null;

    internals.AudioElement = null;
    internals.ElementRefrencesNull = true;

    SetConst(internals, "LoadDatabase", () => {
        fetch("/database/database.json").then((result) => {
            result.json().then((result) => {
                Player.Database = Object.values(result);
                Player.Playlist = Player.Database;

                VSLib.SetDataset(Player.Playlist);

                Gui.ComputeSongExtraData();

                console.timeEnd("PageLoad");
            });
        });
    });
    internals.LoadDatabase();

    SetConst(internals, "SetElementRefrences", () => {
        internals.AudioElement = document.querySelector(".player_audio");
        internals.ElementRefrencesNull = false;
    });
    document.addEventListener("DOMContentLoaded", internals.SetElementRefrences);

    SetConst(Player, "PlaySong", (song) => {
        if (internals.ElementRefrencesNull) {
            return;
        }

        internals.AudioElement.pause();
        internals.AudioElement.currentTime = 0;
        if (song == null) {
            internals.AudioElement.src = "";
        } else {
            internals.AudioElement.src = song.src;
            internals.AudioElement.play();
        }

        Player.NowPlaying = song;
        Gui.RefreshPlayer();
    });

    SetConst(Player, "Search", (query) => {
        query = query.toLowerCase();

        const newPlaylist = [];
        for (let i = 0; i < Player.Database.length; i++) {
            const song = Player.Database[i];
            if (song.text.toLowerCase().includes(query)) {
                newPlaylist.push(song);
            }
        }

        Player.Playlist = newPlaylist;
        VSLib.SetDataset(Player.Playlist);
    });

    Player.Loop = false;
    SetConst(Player, "ToggleLoop", () => {
        if (internals.ElementRefrencesNull) {
            return;
        }
        Player.Loop = !Player.Loop;
        internals.AudioElement.loop = Player.Loop;
        Gui.RefreshPlayer();
    });

    Player.Shuffle = false;
    SetConst(Player, "ToggleShuffle", () => {
        if (internals.ElementRefrencesNull) {
            return;
        }
        Player.Shuffle = !Player.Shuffle;
        Gui.RefreshPlayer();
    });
})();