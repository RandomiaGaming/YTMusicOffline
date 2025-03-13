"use strict";

(() => {
    DataLoader.RunWhenDatabaseLoaded(() => {
        Playlist = Database;
        VSLib.SetElementsPerScreen(10);
        VSLib.SetDataset(Playlist);
        VSLib.SetRebindCallback((element, binding, userdata) => {
            if (userdata == null) {
                userdata = {
                    boundToNull: false,
                    containerElement: element.querySelector(".element_container"),
                    thumbnailElement: element.querySelector(".element_thumbnail"),
                    textElement: element.querySelector(".element_text"),
                    titleElement: element.querySelector(".element_title"),
                    fromElement: element.querySelector(".element_from"),
                    albumElement: element.querySelector(".element_album"),
                    byElement: element.querySelector(".element_by"),
                    artist1Element: element.querySelector(".element_artist_1"),
                    conjunction1Element: element.querySelector(".element_conjunction_1"),
                    artist2Element: element.querySelector(".element_artist_2"),
                    conjunction2Element: element.querySelector(".element_conjunction_2"),
                    artist3Element: element.querySelector(".element_artist_3"),
                    andOthersElement: element.querySelector(".element_and_others"),
                    releasedOnElement: element.querySelector(".element_released_on"),
                    releaseDateElement: element.querySelector(".element_release_date"),
                    periodElement: element.querySelector(".element_period"),
                };
            }
            if (binding < 0 || binding >= Playlist.length) {
                if (!userdata.boundToNull) {
                    userdata.containerElement.style.display = "none";
                    userdata.boundToNull = true;
                }
            } else {
                if (userdata.boundToNull) {
                    userdata.containerElement.style.removeProperty("display");
                    userdata.boundToNull = false;
                }
                const song = Playlist[binding];
                userdata.containerElement.dataset.binding = binding;
                userdata.thumbnailElement.src = song.thumbnail;
                userdata.textElement.textContent = song.text;
                /*userdata.titleElement.textContent = song.title;
                userdata.albumElement.textContent = song.album;
                userdata.artist1Element.textContent = 0 < song.artists.length ? song.artists[0] : "";
                userdata.conjunction1Element.textContent = song.artists.length <= 1 ? "" : (song.artists.length == 2 ? ", and " : ", ");
                userdata.artist2Element.textContent = 1 < song.artists.length ? song.artists[1] : "";
                userdata.conjunction2Element.textContent = song.artists.length <= 2 ? "" : (song.artists.length == 3 ? ", and " : ", ");
                userdata.artist3Element.textContent = 2 < song.artists.length ? song.artists[2] : "";
                userdata.andOthersElement.textContent = 3 < song.artists.length ? ", and others" : "";
                userdata.releasedOnElement.textContent = " released on ";
                userdata.releaseDateElement.textContent = new Date(song.releaseDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });;
                userdata.periodElement.textContent = ".";*/
            }
            return userdata;
        });

        console.timeEnd("PageLoad");
    });
})();