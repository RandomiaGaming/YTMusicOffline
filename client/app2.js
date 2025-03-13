"use strict";

let Playlist = [];

function Search() {
    const query = document.querySelector("#search_bar").value;

    Playlist = [];
    for (let i = 0; i < Database.length; i++) {
        const song = Database[i];
        if (song.title.startsWith(query)) {
            Playlist.push(song);
        }
    }

    VSLib.SetDataset(Playlist);
}

async function Init() {
    for (let i = 0; i < Database.length; i++) {
        const song = Database[i];
        song.index = i;

        song.releaseDateText = new Date(song.releaseDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        song.thumbnailState = "unloaded";
        song.element = null;
    }
    Playlist = Database;

    VSLib.SetElementsPerScreen(10);
    VSLib.SetDataset(Database);
    VSLib.SetRebindCallback((element, binding, userdata) => {
        if (userdata == null) {
            const boundToNull = false;
            const containerElement = element.querySelector(".element_container");
            const thumbnailElement = containerElement.querySelector(".element_thumbnail");
            const descriptionElement = containerElement.querySelector(".element_description");
            const titleElement = descriptionElement.querySelector(".element_title");
            const fromElement = descriptionElement.querySelector(".element_from");
            const albumElement = descriptionElement.querySelector(".element_album");
            const byElement = descriptionElement.querySelector(".element_by");
            const artist0Element = descriptionElement.querySelector(".element_artist_0");
            const conjunction0Element = descriptionElement.querySelector(".element_conjunction_0");
            const artist1Element = descriptionElement.querySelector(".element_artist_1");
            const conjunction1Element = descriptionElement.querySelector(".element_conjunction_1");
            const artist2Element = descriptionElement.querySelector(".element_artist_2");
            const conjunction2Element = descriptionElement.querySelector(".element_conjunction_2");
            const artistMoreElement = descriptionElement.querySelector(".element_artist_more");
            const releasedOnElement = descriptionElement.querySelector(".element_released_on");
            const releaseDateElement = descriptionElement.querySelector(".element_release_date");
            const periodElement = descriptionElement.querySelector(".element_period");
            userdata = {
                boundToNull: boundToNull,
                containerElement: containerElement,
                thumbnailElement: thumbnailElement,
                descriptionElement: descriptionElement,
                titleElement: titleElement,
                fromElement: fromElement,
                albumElement: albumElement,
                byElement: byElement,
                artist0Element: artist0Element,
                conjunction0Element: conjunction0Element,
                artist1Element: artist1Element,
                conjunction1Element: conjunction1Element,
                artist2Element: artist2Element,
                conjunction2Element: conjunction2Element,
                artistMoreElement: artistMoreElement,
                releasedOnElement: releasedOnElement,
                releaseDateElement: releaseDateElement,
                periodElement: periodElement,
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
            userdata.titleElement.textContent = song.title;
            userdata.fromElement.textContent = " from ";
            userdata.albumElement.textContent = song.album;
            userdata.byElement.textContent = " by ";
            let artistIndex = 0;
            userdata.artist0Element.textContent = artistIndex < song.artists.length ? song.artists[artistIndex] : "";
            userdata.conjunction0Element.textContent = artistIndex + 2 == song.artists.length ? ", and " : (artistIndex + 2 < song.artists.length ? ", " : "");
            artistIndex = 1;
            userdata.artist1Element.textContent = artistIndex < song.artists.length ? song.artists[artistIndex] : "";
            userdata.conjunction1Element.textContent = artistIndex + 2 == song.artists.length ? ", and " : (artistIndex + 2 < song.artists.length ? ", " : "");
            artistIndex = 2;
            userdata.artist2Element.textContent = artistIndex < song.artists.length ? song.artists[artistIndex] : "";
            userdata.conjunction2Element.textContent = song.artists.length > 3 ? ", and " : (artistIndex + 2 < song.artists.length ? ", " : "");
            userdata.artistMoreElement.textContent = song.artists.length > 3 ? "others" : "";
            userdata.releasedOnElement.textContent = " released on ";
            userdata.releaseDateElement.textContent = song.releaseDateText;
            userdata.periodElement.textContent = ".";
        }
        return userdata;
    });

    console.timeEnd("PageLoad");
}

window.addEventListener("resize", () => {
    if (window.innerHeight > window.innerWidth) {
        document.documentElement.style.setProperty("--list-element-height", "var(--list-element-height-portrait)");
    } else {
        document.documentElement.style.setProperty("--list-element-height", "var(--list-element-height-landscape)");
    }
});
if (window.innerHeight > window.innerWidth) {
    document.documentElement.style.setProperty("--list-element-height", "var(--list-element-height-portrait)");
} else {
    document.documentElement.style.setProperty("--list-element-height", "var(--list-element-height-landscape)");
}

function LoadThumbnail(song, delay = 0) {
    if (song.thumbnailState == "loaded") {
        return;
    }
    if (delay > 0) {
        if (song.thumbnailState != "loading") {
            setTimeout(() => {
                LoadThumbnail(song, 0);
            }, delay);
            song.thumbnailState = "loading";
        }
    } else {
        const scrollTop = document.documentElement.scrollTop / document.documentElement.scrollHeight;
        const scrollBottom = (document.documentElement.scrollTop + document.documentElement.clientHeight) / document.documentElement.scrollHeight;
        const startIndex = Math.max(Math.floor(scrollTop * Database.length) - 5, 0);
        const endIndex = Math.min(Math.floor(scrollBottom * Database.length) + 5, Database.length - 1);
        if (song.index >= startIndex && song.index <= endIndex) {
            song.element.querySelector("img").src = song.thumbnail;
            song.thumbnailState = "loaded";
        } else {
            song.thumbnailState = "unloaded";
        }
    }
}

function UpdateThumbnails(delay = 100) {
    const scrollTop = document.documentElement.scrollTop / document.documentElement.scrollHeight;
    const scrollBottom = (document.documentElement.scrollTop + document.documentElement.clientHeight) / document.documentElement.scrollHeight;
    const startIndex = Math.max(Math.floor(scrollTop * Database.length) - 5, 0);
    const endIndex = Math.min(Math.floor(scrollBottom * Database.length) + 5, Database.length - 1);
    for (let i = startIndex; i <= endIndex; i++) {
        LoadThumbnail(Database[i], delay);
    }
}

function UpdatePlayerPosition() {
    if (Player.nowPlaying == null) {
        if (Player.floatState != "hidden") {
            Player.floatElement.style.removeProperty("top");
            Player.floatElement.style.removeProperty("bottom");
            Player.floatElement.style.removeProperty("position");
            Player.containerElement.style.display = "none";
            Player.floatState = "hidden";
        }
    } else {
        const clientRect = Player.containerElement.getBoundingClientRect();
        if (clientRect.top < 0) {
            if (Player.floatState != "top") {
                Player.floatElement.style.top = "0px";
                Player.floatElement.style.removeProperty("bottom");
                Player.floatElement.style.position = "fixed";
                Player.containerElement.style.removeProperty("display");
                Player.floatState = "top";
            }
        } else if (clientRect.bottom > window.innerHeight) {
            if (Player.floatState != "bottom") {
                Player.floatElement.style.removeProperty("top");
                Player.floatElement.style.bottom = "0px";
                Player.floatElement.style.position = "fixed";
                Player.containerElement.style.removeProperty("display");
                Player.floatState = "bottom";
            }
        } else {
            if (Player.floatState != "middle") {
                Player.floatElement.style.removeProperty("top");
                Player.floatElement.style.removeProperty("bottom");
                Player.floatElement.style.removeProperty("position");
                Player.containerElement.style.removeProperty("display");
                Player.floatState = "middle";
            }
        }
    }
}

document.addEventListener("scroll", () => {
    UpdateThumbnails();
    UpdatePlayerPosition();
});

function SeekTo(newTime) {
    if ("fastSeek" in Player.audioElement) {
        Player.audioElement.fastSeek(newTime);
    } else {
        Player.audioElement.currentTime = newTime;
    }
}

async function PlayNextSong() {
    if (Player.nowPlaying == null || Player.nowPlaying.index == Database.length - 1) {
        await PlaySong(null);
    } else {
        await PlaySong(Database[Player.nowPlaying.index + 1]);
    }
}

async function PlayPreviousSong() {
    if (Player.nowPlaying == null || Player.nowPlaying.index == 0) {
        await PlaySong(null);
    } else {
        await PlaySong(Database[Player.nowPlaying.index - 1]);
    }
}

async function PlayRandomSong() {
    const index = Math.floor(Math.random() * Database.length);
    await PlaySong(Database[index]);
}

async function PlaySong(song) {
    Player.audioElement.pause();
    if (Player.nowPlaying != null) {
        Player.nowPlaying.element.style.removeProperty("display");
    }

    Player.nowPlaying = song;

    if (Player.nowPlaying != null) {
        Player.nowPlaying.element.style.display = "none";
        document.body.insertBefore(Player.containerElement, Player.nowPlaying.element.nextSibling);
        Player.descriptionElement.textContent = song.text;
        Player.thumbnailElement.src = song.thumbnail;
        Player.watchOriginalElement.href = song.source;
        SeekTo(0);
    }

    UpdatePlayerPosition();
    ReInitMediaSession();

    if (Player.nowPlaying != null) {
        Player.audioElement.src = song.src;
        await Player.audioElement.play();
    }
}

function UpdateMediaSession(newTime) {
    if ("mediaSession" in navigator) {
        // KNOWN ISSUE:
        // navigator.mediaSession.playbackRate breaks on chrome for android.
        const overridePlaybackRate = 0.0001;
        if (newTime != -1 && Player.audioElement.duration > 0) {
            if (newTime == undefined || newTime == null) {
                navigator.mediaSession.setPositionState({ duration: Player.audioElement.duration, playbackRate: overridePlaybackRate, position: Player.audioElement.currentTime });
            } else {
                navigator.mediaSession.setPositionState({ duration: Player.audioElement.duration, playbackRate: overridePlaybackRate, position: newTime });
            }
        } else {
            navigator.mediaSession.setPositionState({ duration: 500, playbackRate: overridePlaybackRate, position: 0 });
        }
    }
}

function ReInitMediaSession() {
    if (!("mediaSession" in navigator)) {
        return;
    }

    if (Player.nowPlaying == null) {
        navigator.mediaSession.metadata = null;
        return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
        title: Player.nowPlaying.title,
        artist: Player.nowPlaying.artists[0],
        album: Player.nowPlaying.album,
        artwork: [{ sizes: "320x180", src: Player.nowPlaying.thumbnail, type: "image/jpeg" }]
    });

    navigator.mediaSession.playbackState = "playing";
    navigator.mediaSession.setPositionState({ duration: 1, playbackRate: 1, position: 0 });
}

function InitMediaSession() {
    if (!"mediaSession" in navigator) {
        return;
    }
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.setCameraActive(false);
    navigator.mediaSession.setMicrophoneActive(false);

    navigator.mediaSession.setActionHandler("hangup", null);
    navigator.mediaSession.setActionHandler("nextslide", null)
    navigator.mediaSession.setActionHandler("previousslide", null);
    navigator.mediaSession.setActionHandler("skipad", null);
    navigator.mediaSession.setActionHandler("togglecamera", null);
    navigator.mediaSession.setActionHandler("togglemicrophone", null);

    navigator.mediaSession.setActionHandler("nexttrack", async (event) => {
        await PlayNextSong();
    });
    navigator.mediaSession.setActionHandler("pause", (event) => {
        navigator.mediaSession.playbackState = "paused";
        Player.audioElement.pause();
    });
    navigator.mediaSession.setActionHandler("play", (event) => {
        navigator.mediaSession.playbackState = "playing";
        Player.audioElement.play();
    });
    navigator.mediaSession.setActionHandler("previoustrack", async (event) => {
        await PlayPreviousSong();
    });
    navigator.mediaSession.setActionHandler("seekbackward", (event) => {
        const newTime = Player.audioElement.currentTime - 5;
        if (event.seekOffset) {
            newTime = Player.audioElement.currentTime - seekOffset;
        }
        newTime = Math.max(0, newTime)
        SeekTo(newTime);
        UpdateMediaSession(newTime);
    });
    navigator.mediaSession.setActionHandler("seekforward", (event) => {
        const newTime = Player.audioElement.currentTime + 5;
        if (event.seekOffset) {
            newTime = Player.audioElement.currentTime + seekOffset;
        }
        newTime = Math.min(Player.audioElement.duration, newTime)
        SeekTo(newTime);
        UpdateMediaSession(newTime);
    });
    navigator.mediaSession.setActionHandler("seekto", (event) => {
        const newTime = event.seekTime;
        SeekTo(newTime);
        UpdateMediaSession(newTime);
    });
    navigator.mediaSession.setActionHandler("stop", (event) => {
        Player.audioElement.pause();
        const newTime = 0;
        SeekTo(newTime);
        UpdateMediaSession(-1);
    });

    Player.audioElement.onpause = () => {
        navigator.mediaSession.playbackState = "paused";
    };
    Player.audioElement.onplay = () => {
        navigator.mediaSession.playbackState = "playing";
    };
    Player.audioElement.addEventListener("timeupdate", function () {
        UpdateMediaSession();
    });

    navigator.mediaSession.playbackState = "paused";
    UpdateMediaSession(-1);
}

function RunWhenDomLoaded(callback) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
        callback();
    }
}

DataLoader.RunWhenDatabaseLoaded(() => {
    RunWhenDomLoaded(Init);
});