// Approved 03/17/2025
"use strict";

(() => {
    const internals = DefModule("Gui");

    VSLib.SetElementsPerScreen(10);

    internals.Elements = [];
    SetConst(internals, "RebindCallback", (element, binding, userdata) => {
        if (userdata == null) {
            userdata = {
                GuiElementId: internals.Elements.length,
                elementInvisible: true,
                binding: 0,
                containerElement: element.querySelector(".element_container"),
                thumbnailElement: element.querySelector(".element_thumbnail"),
                titleElement: element.querySelector(".element_title"),
                albumElement: element.querySelector(".element_album"),
                artist1Element: element.querySelector(".element_artist_1"),
                conjunction1Element: element.querySelector(".element_conjunction_1"),
                artist2Element: element.querySelector(".element_artist_2"),
                conjunction2Element: element.querySelector(".element_conjunction_2"),
                artist3Element: element.querySelector(".element_artist_3"),
                andOthersElement: element.querySelector(".element_and_others"),
                releaseDateElement: element.querySelector(".element_release_date"),
            };
            userdata.containerElement.dataset.GuiElementId = userdata.GuiElementId;
            internals.Elements.push(userdata);
        }
        if (binding < 0 || binding >= Player.Playlist.length) {
            if (!userdata.elementInvisible) {
                userdata.containerElement.style.display = "none";
                userdata.elementInvisible = true;
            }
        } else {
            if (userdata.elementInvisible) {
                userdata.containerElement.style.removeProperty("display");
                userdata.elementInvisible = false;
            }
            const song = Player.Playlist[binding];
            userdata.binding = binding;
            FetchLib.BindImage(userdata.thumbnailElement, song.thumbnail);
            userdata.titleElement.textContent = song.title;
            userdata.albumElement.textContent = song.album;
            switch (song.artists.length) {
                case 1:
                    userdata.artist1Element.textContent = song.artists[0];
                    userdata.conjunction1Element.textContent = "";
                    userdata.artist2Element.textContent = "";
                    userdata.conjunction2Element.textContent = "";
                    userdata.artist3Element.textContent = "";
                    userdata.andOthersElement.textContent = "";
                    break;
                case 2:
                    userdata.artist1Element.textContent = song.artists[0];
                    userdata.conjunction1Element.textContent = ", and ";
                    userdata.artist2Element.textContent = song.artists[1];
                    userdata.conjunction2Element.textContent = "";
                    userdata.artist3Element.textContent = "";
                    userdata.andOthersElement.textContent = "";
                    break;
                case 3:
                    userdata.artist1Element.textContent = song.artists[0];
                    userdata.conjunction1Element.textContent = ", ";
                    userdata.artist2Element.textContent = song.artists[1];
                    userdata.conjunction2Element.textContent = ", and ";
                    userdata.artist3Element.textContent = song.artists[2];
                    userdata.andOthersElement.textContent = "";
                    break;
                default:
                    userdata.artist1Element.textContent = song.artists[0];
                    userdata.conjunction1Element.textContent = ", ";
                    userdata.artist2Element.textContent = song.artists[1];
                    userdata.conjunction2Element.textContent = ", ";
                    userdata.artist3Element.textContent = song.artists[2];
                    userdata.andOthersElement.textContent = ", and others";
                    break;
            }
            userdata.releaseDateElement.textContent = Helper.EpochToString(song.releaseDate);
        }
        return userdata;
    });
    VSLib.SetRebindCallback(internals.RebindCallback);

    SetConst(Gui, "OnElementClicked", (element) => {
        const userdata = internals.Elements[element.dataset.GuiElementId];
        const song = Player.Playlist[userdata.binding];
        Player.PlaySong(song);
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

    internals.PlayerElements = null;
    SetConst(internals, "SetElementRefrences", () => {
        internals.PlayerElements = {};

        internals.PlayerElements.thumbnailElement = document.querySelector(".player_thumbnail");
        internals.PlayerElements.textElement = document.querySelector(".player_text");
        internals.PlayerElements.titleElement = document.querySelector(".player_title");
        internals.PlayerElements.albumElement = document.querySelector(".player_album");
        internals.PlayerElements.artist1Element = document.querySelector(".player_artist_1");
        internals.PlayerElements.conjunction1Element = document.querySelector(".player_conjunction_1");
        internals.PlayerElements.artist2Element = document.querySelector(".player_artist_2");
        internals.PlayerElements.conjunction2Element = document.querySelector(".player_conjunction_2");
        internals.PlayerElements.artist3Element = document.querySelector(".player_artist_3");
        internals.PlayerElements.andOthersElement = document.querySelector(".player_and_others");
        internals.PlayerElements.releaseDateElement = document.querySelector(".player_release_date");
        internals.PlayerElements.nothingPlayingElement = document.querySelector(".player_nothing_playing");
        internals.PlayerElements.loopElement = document.querySelector(".player_loop");
        internals.PlayerElements.shuffleElement = document.querySelector(".player_shuffle");
        internals.PlayerElements.watchOriginalHrefElement = document.querySelector(".player_watch_original_href");

        Gui.OnNowPlayingChanged();
    });
    document.addEventListener("DOMContentLoaded", internals.SetElementRefrences);

    SetConst(Gui, "OnNowPlayingChanged", () => {
        if (Player.NowPlaying == null) {
            internals.PlayerElements.textElement.style.display = "none";
            internals.PlayerElements.nothingPlayingElement.style.removeProperty("display");
            FetchLib.BindImage(internals.PlayerElements.thumbnailElement, null);
            internals.PlayerElements.watchOriginalHrefElement.href = "";
        } else {
            const song = Player.NowPlaying;
            internals.PlayerElements.textElement.style.removeProperty("display");
            internals.PlayerElements.nothingPlayingElement.style.display = "none";
            FetchLib.BindImage(internals.PlayerElements.thumbnailElement, song.thumbnail);
            internals.PlayerElements.titleElement.textContent = song.title;
            internals.PlayerElements.albumElement.textContent = song.album;
            switch (song.artists.length) {
                case 1:
                    internals.PlayerElements.artist1Element.textContent = song.artists[0];
                    internals.PlayerElements.conjunction1Element.textContent = "";
                    internals.PlayerElements.artist2Element.textContent = "";
                    internals.PlayerElements.conjunction2Element.textContent = "";
                    internals.PlayerElements.artist3Element.textContent = "";
                    internals.PlayerElements.andOthersElement.textContent = "";
                    break;
                case 2:
                    internals.PlayerElements.artist1Element.textContent = song.artists[0];
                    internals.PlayerElements.conjunction1Element.textContent = ", and ";
                    internals.PlayerElements.artist2Element.textContent = song.artists[1];
                    internals.PlayerElements.conjunction2Element.textContent = "";
                    internals.PlayerElements.artist3Element.textContent = "";
                    internals.PlayerElements.andOthersElement.textContent = "";
                    break;
                case 3:
                    internals.PlayerElements.artist1Element.textContent = song.artists[0];
                    internals.PlayerElements.conjunction1Element.textContent = ", ";
                    internals.PlayerElements.artist2Element.textContent = song.artists[1];
                    internals.PlayerElements.conjunction2Element.textContent = ", and ";
                    internals.PlayerElements.artist3Element.textContent = song.artists[2];
                    internals.PlayerElements.andOthersElement.textContent = "";
                    break;
                default:
                    internals.PlayerElements.artist1Element.textContent = song.artists[0];
                    internals.PlayerElements.conjunction1Element.textContent = ", ";
                    internals.PlayerElements.artist2Element.textContent = song.artists[1];
                    internals.PlayerElements.conjunction2Element.textContent = ", ";
                    internals.PlayerElements.artist3Element.textContent = song.artists[2];
                    internals.PlayerElements.andOthersElement.textContent = ", and others";
                    break;
            }
            internals.PlayerElements.releaseDateElement.textContent = Helper.EpochToString(song.releaseDate);
            internals.PlayerElements.watchOriginalHrefElement.href = song.source;
        }
    });

    SetConst(Gui, "OnLoopChanged", () => {
        if (Player.Loop) {
            internals.PlayerElements.loopElement.textContent = "Loop✅";
        } else {
            internals.PlayerElements.loopElement.textContent = "Loop❌";
        }
    });

    SetConst(Gui, "OnShuffleChanged", () => {
        if (Player.Shuffle) {
            internals.PlayerElements.shuffleElement.textContent = "Shuffle✅";
        } else {
            internals.PlayerElements.shuffleElement.textContent = "Shuffle❌";
        }
    });
})();