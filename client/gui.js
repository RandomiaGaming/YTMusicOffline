// Approved 03/20/2025
"use strict";

(() => {
    const Gui = {};
    const internals = {};

    internals.EpochToString = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const day = ("0" + date.getUTCDate().toString()).slice(-2);
        const month = ("0" + (date.getUTCMonth() + 1).toString()).slice(-2);
        const year = ("000" + date.getUTCFullYear().toString()).slice(-4);
        return month + "/" + day + "/" + year;
    };

    Gui.ComputeSongExtraData = () => {
        const highlightStart = "<span class=\"element_highlight\">";
        const highlightEnd = "</span>";
        for (let i = 0; i < Player.Database.length; i++) {
            const song = Player.Database[i];
            song.textHtml = highlightStart + song.title + highlightEnd;
            song.text = song.title;
            if (song.album != undefined && song.album != null && song.album != "") {
                song.textHtml += " from " + highlightStart + song.album + highlightEnd;
                song.text += " from " + song.album;
            }
            switch (song.artists.length) {
                case 0:
                    song.textHtml += " by unknown artist";
                    song.text += " by unknown artist";
                    break;
                case 1:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    song.text += " by " + song.artists[0];
                    break;
                case 2:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    song.textHtml += ", and " + highlightStart + song.artists[1] + highlightEnd;
                    song.text += " by " + song.artists[0];
                    song.text += ", and " + song.artists[1];
                    break;
                case 3:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    song.textHtml += ", " + highlightStart + song.artists[1] + highlightEnd;
                    song.textHtml += ", and " + highlightStart + song.artists[2] + highlightEnd;
                    song.text += " by " + song.artists[0];
                    song.text += ", " + song.artists[1];
                    song.text += ", and " + song.artists[2];
                    break;
                default:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    song.textHtml += ", " + highlightStart + song.artists[1] + highlightEnd;
                    song.textHtml += ", " + highlightStart + song.artists[2] + highlightEnd;
                    song.textHtml += ", and others";
                    song.text += " by " + song.artists[0];
                    song.text += ", " + song.artists[1];
                    song.text += ", " + song.artists[2];
                    song.text += ", and others";
                    break;
            }
            song.textHtml += " released on " + highlightStart + internals.EpochToString(song.releaseDate) + highlightEnd;
            song.text += " released on " + internals.EpochToString(song.releaseDate);
        }
    };

    VSLib.SetElementsPerScreen(10);

    internals.Userdata = new Map();
    VSLib.SetRebindCallback((element, binding, value, userdata) => {
        if (userdata == null) {
            userdata = {
                binding: -1,
                value: null,
                containerElement: element.querySelector(".element_container"),
                thumbnailElement: element.querySelector(".element_thumbnail"),
                textElement: element.querySelector(".element_text"),
            };
            internals.Userdata.set(element, userdata);
        }
        userdata.binding = binding;
        userdata.value = value;
        if (value == null) {
            userdata.containerElement.style.visibility = "hidden";
        } else {
            userdata.containerElement.style.visibility = "visible";
            userdata.textElement.innerHTML = value.textHtml;
        }

        return userdata;
    });

    VSLib.SetUpdateCallback((elements, startIndex, dataset) => {
        const imgElements = [];
        for (let element of elements) {
            imgElements.push(internals.Userdata.get(element).thumbnailElement);
        }
        dataset = [];
        for (let song of Player.Playlist) {
            dataset.push(song.thumbnail);            
        }
        ThumbLib.Rebind(imgElements, dataset, startIndex);
    });

    Gui.OnElementClicked = (element) => {
        Player.PlaySong(internals.Userdata.get(element.parentElement).value);
    };

    internals.PortraitMode = undefined;
    internals.OnWindowResize = () => {
        if (window.innerHeight > window.innerWidth) {
            if (internals.PortraitMode !== true) {
                document.documentElement.style.setProperty("--search-container-height", "75px");
                document.documentElement.style.setProperty("--player-container-height", "250px");
                internals.PortraitMode = true;
            }
        } else {
            if (internals.PortraitMode !== false) {
                document.documentElement.style.setProperty("--search-container-height", "50px");
                document.documentElement.style.setProperty("--player-container-height", "150px");
                internals.PortraitMode = false;
            }
        }
    };
    window.addEventListener("resize", internals.OnWindowResize);
    internals.OnWindowResize();

    Gui.OnSearchButtonClicked = () => {
        Player.Search(internals.SearchBarElement.value);
    };

    Gui.RefreshPlayer = () => {
        if (Player.NowPlaying == null) {
            internals.PlayerTextElement.innerHTML = "Nothing is playing...";
            internals.PlayerThumbnailElement.src = ThumbLib.BlankImageSrc;
        } else {
            internals.PlayerTextElement.innerHTML = Player.NowPlaying.textHtml;
            internals.PlayerThumbnailElement.src = Player.NowPlaying.thumbnail;
        }

        if (Player.Loop) {
            internals.PlayerLoopElement.textContent = "Loop✅";
        } else {
            internals.PlayerLoopElement.textContent = "Loop❌";
        }
        if (Player.Shuffle) {
            internals.PlayerShuffleElement.textContent = "Shuffle✅";
        } else {
            internals.PlayerShuffleElement.textContent = "Shuffle❌";
        }
    };

    internals.PlayerThumbnailElement = null;
    internals.PlayerTextElement = null;
    internals.PlayerWatchOriginalElement = null;
    internals.PlayerLoopElement = null;
    internals.PlayerShuffleElement = null;
    internals.SearchBarElement = null;
    internals.ElementRefrencesNull = true;
    internals.SetElementRefrences = () => {
        internals.PlayerThumbnailElement = document.querySelector(".player_thumbnail");
        internals.PlayerTextElement = document.querySelector(".player_text");
        internals.PlayerWatchOriginalElement = document.querySelector(".player_watch_original");
        internals.PlayerWatchOriginalElement.addEventListener("click", (event) => {
            event.preventDefault();
            if (Player.NowPlaying != null) {
                window.open(Player.NowPlaying.srcUrl, "_blank");
            }
        });
        internals.PlayerLoopElement = document.querySelector(".player_loop");
        internals.PlayerShuffleElement = document.querySelector(".player_shuffle");
        internals.SearchBarElement = document.querySelector(".search_bar");
        internals.SearchBarElement.addEventListener("keydown", (event) => {
            if (event.key == "Enter") {
                Gui.OnSearchButtonClicked();
                internals.SearchBarElement.blur();
            } else if (event.key == "Escape") {
                internals.SearchBarElement.blur();
            }
        });
        internals.ElementRefrencesNull = false;

        Gui.RefreshPlayer();
    };
    if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", internals.SetElementRefrences);
    } else {
        internals.SetElementRefrences();
    }

    globalThis.Gui = Gui;
})();