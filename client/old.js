"use strict";

(() => {
    let pendingCallbacks = [];

    const recursiveFreeze = (obj) => {
        Object.freeze(obj);
        Object.getOwnPropertyNames(obj).forEach((key) => {
            if (obj[key] != null && typeof obj[key] == "object") {
                recursiveFreeze(obj[key]);
            }
        });
    };

    Object.defineProperty(globalThis, "DefLib", {
        writable: false,
        configurable: false,
        value: (lib, libName) => {
            recursiveFreeze(lib);
            Object.defineProperty(globalThis, libName, {
                writable: false,
                configurable: false,
                value: lib
            });
            for (let i = 0; i < pendingCallbacks.length; i++) {
                const pendingCallback = pendingCallbacks[i];
                let hasAllDeps = true;
                for (let dep of pendingCallback.deps) {
                    if (!(dep in globalThis)) {
                        hasAllDeps = false;
                        break;
                    }
                }
                if (hasAllDeps) {
                    pendingCallback.callback();
                    pendingCallbacks.splice(i, 1);
                    i--;
                }
            }
        }
    });

    Object.defineProperty(globalThis, "AwaitDeps", {
        writable: false,
        configurable: false,
        value: (deps, callback) => {
            const newPendingCallback = { deps: deps, callback: callback };
            let hasAllDeps = true;
            for (let dep of newPendingCallback.deps) {
                if (!(dep in globalThis)) {
                    hasAllDeps = false;
                    break;
                }
            }
            if (hasAllDeps) {
                newPendingCallback.callback();
            } else {
                pendingCallbacks.push(newPendingCallback);
            }
        }
    });
})();

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



"use strict";

async function LoadDatabase() {
    window.Songs = await (await fetch("/database/database.json")).json();
    for (let i = 0; i < Songs.length; i++) {
        const song = Songs[i];
        song.index = i;

        const releaseDateText = new Date(song.releaseDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        let artistsText = "";
        for (let j = 0; j < song.artists.length; j++) {
            if (j == 0) {

            } else if (j == song.artists.length - 1) {
                artistsText += ", and ";
            } else {
                artistsText += ", ";
            }
            artistsText += song.artists[j];
        }
        song.text = `${song.title} by ${artistsText} from ${song.album} released on ${releaseDateText}`;

        song.thumbnailState = "unloaded";
        song.element = null;
    }
}