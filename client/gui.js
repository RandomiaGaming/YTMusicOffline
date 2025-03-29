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
            if (song.album == undefined || song.album == null || song.album == "") {
                song.textHtml += " from " + highlightStart + song.album + highlightEnd;
            }
            switch (song.artists.length) {
                case 0:
                    song.textHtml += " by unknown artist";
                    break;
                case 1:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    break;
                case 2:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    song.textHtml += ", and " + highlightStart + song.artists[1] + highlightEnd;
                    break;
                case 3:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    song.textHtml += ", " + highlightStart + song.artists[1] + highlightEnd;
                    song.textHtml += ", and " + highlightStart + song.artists[2] + highlightEnd;
                    break;
                default:
                    song.textHtml += " by " + highlightStart + song.artists[0] + highlightEnd;
                    song.textHtml += ", " + highlightStart + song.artists[1] + highlightEnd;
                    song.textHtml += ", " + highlightStart + song.artists[2] + highlightEnd;
                    song.textHtml += ", and others";
                    break;
            }
            song.textHtml += " released on " + highlightStart + Helper.EpochToString(song.releaseDate) + highlightEnd;
        }
    });

    VSLib.SetElementsPerScreen(10);

    internals.Userdata = [];
    VSLib.SetRebindCallback((element, binding, userdata) => {
        if (userdata == null) {
            userdata = {
                binding: null,
                containerElement: element.querySelector(".element_container"),
                thumbnailElement: element.querySelector(".element_thumbnail"),
                textElement: element.querySelector(".element_text"),
            };
            internals.Userdata.push(userdata);
            userdata.containerElement.dataset.UserdataIndex = internals.Userdata.length - 1;
        }

        if (binding < 0 || binding >= Player.Playlist.length) {
            userdata.containerElement.style.visibility = "hidden";
            userdata.binding = null;
        } else {
            userdata.containerElement.style.visibility = "visible";
            const song = Player.Playlist[binding];
            userdata.binding = binding;
            userdata.textElement.innerHTML = song.textHtml;
            //ThumbnailLoader.Bind(userdata.thumbnailElement, song);
        }

        return userdata;
    });

    SetConst(Gui, "OnElementClicked", (element) => {
        const userdata = internals.Userdata[element.dataset.UserdataIndex];
        if (userdata.binding != null) {
            const song = Player.Playlist[userdata.binding];
            Player.PlaySong(song);
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
        internals.PlayerWatchOriginalHrefElement = document.querySelector(".player_watch_original_href");
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
            console.log(event.key);
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
            internals.PlayerWatchOriginalHrefElement.href = "";
            //ThumbnailLoader.Bind(internals.PlayerThumbnailElement, null);
        } else {
            internals.PlayerTextElement.innerHTML = Player.NowPlaying.textHtml;
            internals.PlayerWatchOriginalHrefElement.href = Player.NowPlaying.source;
            //ThumbnailLoader.Bind(internals.PlayerThumbnailElement, Player.NowPlaying);
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
})();