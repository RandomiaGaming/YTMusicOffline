// Approved 03/17/2025
"use strict";

(() => {
    const context = defModule("Player");
    const internals = context.Internals;

    context.Database = [];
    context.Playlist = [];
    context.NowPlaying = null;

    internals.AudioElement = null;
    internals.ElementRefrencesNull = true;

    setConst(internals, "LoadDatabase", () => {
        fetch("/database/database.json").then((result) => {
            result.json().then((result) => {
                for (let i = 0; i < result.length; i++) {
                    const song = result[i];

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
                context.Database = result;
                context.Playlist = context.Database;

                VSLib.SetDataset(context.Playlist);

                console.timeEnd("PageLoad");
            });
        });
    });

    setConst(internals, "SetElementRefrences", () => {
        internals.AudioElement = document.querySelector(".player_audio");
        internals.ElementRefrencesNull = false;
    });

    setConst(context, "PlaySong", (song) => {
        if (internals.ElementRefrencesNull) {
            return;
        }

        internals.AudioElement.pause();
        internals.AudioElement.src = song.src;
        internals.AudioElement.currentTime = 0;
        internals.AudioElement.play();

        context.NowPlaying = song;
        Gui.OnNowPlayingChanged();
    });

    internals.LoadDatabase();
    document.addEventListener("DOMContentLoaded", internals.SetElementRefrences);
})();