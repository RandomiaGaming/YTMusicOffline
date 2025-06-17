// Approved 03/20/2025
"use strict";

(() => {
    const internals = DefModule("Gui");

    SetConst(Gui, "ComputeSongExtraData", () => {
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
            song.textHtml += " released on " + highlightStart + Helper.EpochToString(song.releaseDate) + highlightEnd;
            song.text += " released on " + Helper.EpochToString(song.releaseDate);
        }
    });

    VSLib.SetElementsPerScreen(10);

    internals.Userdata = [];
    VSLib.SetRebindCallback((element, binding, value, userdata) => {
        if (userdata == null) {
            userdata = {
                binding: -1,
                value: null,
                containerElement: element.querySelector(".element_container"),
                thumbnailElement: element.querySelector(".element_thumbnail"),
                textElement: element.querySelector(".element_text"),
            };
            internals.Userdata.push(userdata);
            userdata.containerElement.dataset.UserdataIndex = internals.Userdata.length - 1;
        }
        userdata.binding = binding;
        userdata.value = value;
        if (value == null) {
            userdata.containerElement.style.visibility = "hidden";
        } else {
            userdata.containerElement.style.visibility = "visible";
            userdata.textElement.innerHTML = value.textHtml;
            ImageLoader.Bind(userdata.thumbnailElement, value.thumbnail);
        }

        return userdata;
    });

    VSLib.SetUpdateCallback((elements, startIndex, dataset) => {
        ImageLoader.ClearPreloads();
        const endIndex = startIndex + elements.length;
        startIndex--;
        for (let i = 0; i < elements.length; i++) {
            if (endIndex + i > 0 && endIndex + i < dataset.length) {
                ImageLoader.Preload(dataset[endIndex + i].thumbnail);
            }
            if (startIndex - i > 0 && startIndex - i < dataset.length) {
                ImageLoader.Preload(dataset[startIndex - i].thumbnail);
            }
        }
    });

    SetConst(Gui, "OnElementClicked", (element) => {
        const userdata = internals.Userdata[element.dataset.UserdataIndex];
        if (userdata.value != null) {
            Player.PlaySong(userdata.value);
        }
    });

    internals.PortraitMode = undefined;
    SetConst(internals, "OnWindowResize", () => {
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
    });
    window.addEventListener("resize", internals.OnWindowResize);
    internals.OnWindowResize();

    internals.PlayerThumbnailElement = null;
    internals.PlayerTextElement = null;
    internals.PlayerWatchOriginalElement = null;
    internals.PlayerLoopElement = null;
    internals.PlayerShuffleElement = null;
    internals.SearchBarElement = null;
    internals.ElementRefrencesNull = true;
    SetConst(internals, "SetElementRefrences", () => {
        internals.PlayerThumbnailElement = document.querySelector(".player_thumbnail");
        internals.PlayerTextElement = document.querySelector(".player_text");
        internals.PlayerWatchOriginalElement = document.querySelector(".player_watch_original");
        internals.PlayerWatchOriginalElement.addEventListener("click", (event) => {
            event.preventDefault();
            if (Player.NowPlaying != null) {
                window.open(Player.NowPlaying.source, "_blank");
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
    });
    document.addEventListener("DOMContentLoaded", internals.SetElementRefrences);

    SetConst(Gui, "OnSearchButtonClicked", () => {
        if (internals.ElementRefrencesNull) {
            return;
        }

        Player.Search(internals.SearchBarElement.value);
    });

    SetConst(Gui, "RefreshPlayer", () => {
        if (internals.ElementRefrencesNull) {
            return;
        }

        if (Player.NowPlaying == null) {
            internals.PlayerTextElement.innerHTML = "Nothing is playing...";
            ImageLoader.Bind(internals.PlayerThumbnailElement, null);
        } else {
            internals.PlayerTextElement.innerHTML = Player.NowPlaying.textHtml;
            ImageLoader.Bind(internals.PlayerThumbnailElement, Player.NowPlaying.thumbnail);
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
    });

    DeepFreeze(Gui);
})();