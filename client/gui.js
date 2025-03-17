// Approved 03/17/2025
"use strict";

(() => {
    const context = defModule("Gui");
    const internals = context.Internals;

    internals.Elements = [];
    setConst(internals, "RebindCallback", (element, binding, userdata) => {
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
            userdata.thumbnailElement.src = song.thumbnail;
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
            userdata.releaseDateElement.textContent = epochToString(song.releaseDate);
        }
        return userdata;
    });
    VSLib.SetRebindCallback(internals.RebindCallback);

    setConst(context, "OnElementClicked", (element) => {
        const userdata = internals.Elements[element.dataset.GuiElementId];
        const song = Player.Playlist[userdata.binding];
        Player.PlaySong(song);
    });

    internals.PortraitMode = undefined;
    setConst(internals, "OnWindowResize", () => {
        if (window.innerHeight > window.innerWidth) {
            if (internals.PortraitMode !== true) {
                VSLib.SetElementsPerScreen(15);
                internals.LayoutMode = true;
            }
        } else {
            if (internals.LayoutMode !== false) {
                VSLib.SetElementsPerScreen(10);
                internals.LayoutMode = false;
            }
        }
    });
    window.addEventListener("resize", internals.OnWindowResize);
    internals.OnWindowResize();

    internals.PlayerElements = null;
    setConst(internals, "SetElementRefrences", () => {
        internals.PlayerElements = {};
        internals.PlayerElements.elementInvisible = true;

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

        context.OnNowPlayingChanged();
    });
    document.addEventListener("DOMContentLoaded", internals.SetElementRefrences);

    setConst(context, "OnNowPlayingChanged", () => {
        if (Player.NowPlaying == null) {
            internals.PlayerElements.thumbnailElement.src = ThumbLoader.DefaultThumbUrl;
            if (!internals.PlayerElements.elementInvisible) {
                internals.PlayerElements.textElement.style.display = "none";
                internals.PlayerElements.elementInvisible = true;
            }
        } else {
            if (internals.PlayerElements.elementInvisible) {
                internals.PlayerElements.textElement.style.removeProperty("display");
                internals.PlayerElements.elementInvisible = false;
            }

            const song = Player.NowPlaying;
            internals.PlayerElements.thumbnailElement.src = song.thumbnail;
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
            internals.PlayerElements.releaseDateElement.textContent = epochToString(song.releaseDate);
        }
    });
})();