// Approved 03/17/2025
"use strict";

(() => {
    const Player = {};

    Player.Database = [];
    Player.Playlist = [];
    Player.NowPlaying = null;

    let AudioElement = null;
    let ElementRefrencesNull = true;

    const LoadDatabase = () => {
        fetch("/database/database.json").then((result) => {
            result.json().then((result) => {
                Player.Database = Object.values(result);
                Player.Playlist = Player.Database;

                VSLib.SetDataset(Player.Playlist);
                ThumbLib.SetDataset(Player.Playlist.map(song => song.thumbnail));

                Gui.ComputeSongExtraData();

                console.timeEnd("PageLoad");
            });
        });
    };
    LoadDatabase();

    const SetElementRefrences = () => {
        AudioElement = document.querySelector(".player_audio");
        ElementRefrencesNull = false;
    };
    if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", SetElementRefrences);
    } else {
        SetElementRefrences();
    }

    Player.PlaySong = (song) => {
        AudioElement.pause();
        AudioElement.currentTime = 0;
        if (song == null) {
            AudioElement.src = "";
        } else {
            AudioElement.src = song.src;
            AudioElement.play();
        }

        Player.NowPlaying = song;
        Gui.RefreshPlayer();
    };

    Player.Search = (query) => {
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
        ThumbLib.SetDataset(Player.Playlist.map(song => song.thumbnail));
    };

    Player.Loop = false;
    Player.ToggleLoop = () => {
        Player.Loop = !Player.Loop;
        AudioElement.loop = Player.Loop;
        Gui.RefreshPlayer();
    };

    Player.Shuffle = false;
    Player.ToggleShuffle = () => {
        Player.Shuffle = !Player.Shuffle;
        Gui.RefreshPlayer();
    };

    globalThis.Player = Player;
})();