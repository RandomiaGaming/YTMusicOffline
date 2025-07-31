// Approved 03/20/2025
"use strict";

(() => {
    const Gui = {};

    const EpochToString = (timestamp) => {
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
            song.textHtml += " released on " + highlightStart + EpochToString(song.releaseDate) + highlightEnd;
            song.text += " released on " + EpochToString(song.releaseDate);
        }
    };

    VSLib.SetElementsPerScreen(10);

    let Userdata = new Map();
    VSLib.SetRebindCallback((element, binding, value, userdata) => {
        if (userdata == null) {
            userdata = {
                binding: -1,
                value: null,
                containerElement: element.querySelector(".element_container"),
                thumbnailElement: element.querySelector(".element_thumbnail"),
                textElement: element.querySelector(".element_text"),
            };
            Userdata.set(element, userdata);
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
            imgElements.push(Userdata.get(element).thumbnailElement);
        }
        ThumbLib.StartTransaction();
        ThumbLib.SetElements(imgElements);
        ThumbLib.SetStartIndex(startIndex);
        ThumbLib.EndTransaction();
    });

    Gui.OnElementClicked = (element) => {
        Player.PlaySong(Userdata.get(element.parentElement).value);
    };

    let PortraitMode = undefined;
    const OnWindowResize = () => {
        if (window.innerHeight > window.innerWidth) {
            if (PortraitMode !== true) {
                document.documentElement.style.setProperty("--search-container-height", "75px");
                document.documentElement.style.setProperty("--player-container-height", "250px");
                PortraitMode = true;
            }
        } else {
            if (PortraitMode !== false) {
                document.documentElement.style.setProperty("--search-container-height", "50px");
                document.documentElement.style.setProperty("--player-container-height", "150px");
                PortraitMode = false;
            }
        }
    };
    window.addEventListener("resize", OnWindowResize);
    OnWindowResize();

    Gui.OnSearchButtonClicked = () => {
        Player.Search(SearchBarElement.value);
    };

    Gui.RefreshPlayer = () => {
        if (Player.NowPlaying == null) {
            PlayerTextElement.innerHTML = "Nothing is playing...";
            PlayerThumbnailElement.style.visibility = "hidden";
        } else {
            PlayerTextElement.innerHTML = Player.NowPlaying.textHtml;
            PlayerThumbnailElement.src = Player.NowPlaying.thumbnail;
            PlayerThumbnailElement.style.visibility = "visible";
        }

        if (Player.Loop) {
            PlayerLoopElement.textContent = "Loop✅";
        } else {
            PlayerLoopElement.textContent = "Loop❌";
        }
        if (Player.Shuffle) {
            PlayerShuffleElement.textContent = "Shuffle✅";
        } else {
            PlayerShuffleElement.textContent = "Shuffle❌";
        }
    };

    let PlayerThumbnailElement = null;
    let PlayerTextElement = null;
    let PlayerWatchOriginalElement = null;
    let PlayerLoopElement = null;
    let PlayerShuffleElement = null;
    let SearchBarElement = null;
    let ElementRefrencesNull = true;
    const SetElementRefrences = () => {
        PlayerThumbnailElement = document.querySelector(".player_thumbnail");
        PlayerTextElement = document.querySelector(".player_text");
        PlayerWatchOriginalElement = document.querySelector(".player_watch_original");
        PlayerWatchOriginalElement.addEventListener("click", (event) => {
            event.preventDefault();
            if (Player.NowPlaying != null) {
                window.open(Player.NowPlaying.srcUrl, "_blank");
            }
        });
        PlayerLoopElement = document.querySelector(".player_loop");
        PlayerShuffleElement = document.querySelector(".player_shuffle");
        SearchBarElement = document.querySelector(".search_bar");
        SearchBarElement.addEventListener("keydown", (event) => {
            if (event.key == "Enter") {
                Gui.OnSearchButtonClicked();
                SearchBarElement.blur();
            } else if (event.key == "Escape") {
                SearchBarElement.blur();
            }
        });
        ElementRefrencesNull = false;

        Gui.RefreshPlayer();
    };
    if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", SetElementRefrences);
    } else {
        SetElementRefrences();
    }

    globalThis.Gui = Gui;
})();