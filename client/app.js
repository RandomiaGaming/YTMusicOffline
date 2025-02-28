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

async function WaitForDomLoad() {
    return new Promise(resolve => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", resolve, { once: true });
        } else {
            resolve();
        }
    });
}

Player = {};
Player.containerElement = null;
Player.floatElement = null;
Player.audioElement = null;
Player.thumbnailElement = null;
Player.descriptionElement = null;
Player.watchOriginalElement = null;
Player.floatState = "hidden"; // hidden, top, middle, bottom
Player.nowPlaying = null;

async function Init() {
    promises = [
        LoadDatabase(),
        WaitForDomLoad()
    ];
    await Promise.all(promises);

    Player.containerElement = document.querySelector("#player_container");
    Player.floatElement = document.querySelector("#player_float");
    Player.thumbnailElement = document.querySelector("#player_thumbnail");
    Player.descriptionElement = document.querySelector("#player_description");
    Player.watchOriginalElement = document.querySelector("#player_watch_original");
    Player.audioElement = document.querySelector("#player_audio");

    Player.audioElement.addEventListener("ended", async (event) => { await PlayNextSong(); });
    const playerResizeObserver = new ResizeObserver(entries => {
        Player.floatElement.style.height = `${Player.containerElement.clientHeight}px`;
    });
    playerResizeObserver.observe(Player.containerElement);
    Player.floatElement.style.height = `${Player.containerElement.clientHeight}px`;

    InitMediaSession();

    for (let i = 0; i < Songs.length; i++) {
        const song = Songs[i];

        const htmlString = `<div class="list_element" onclick="PlaySong(Songs['${i}'])">
        <img class="square" alt="Thumbnail image." src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=">
        <div class="horizontal_spacer"></div>
        <p>${song.text}</p>
        <div class="horizontal_spacer"></div>
        <a class="" href="${song.source}" target="_blank" onclick="event.stopPropagation()">Watch original...</a>
        </div>`;

        const template = document.createElement("template");
        template.innerHTML = htmlString;
        song.element = document.body.appendChild(template.content.firstChild);
    }

    UpdateThumbnails(0);

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
        const startIndex = Math.max(Math.floor(scrollTop * Songs.length) - 5, 0);
        const endIndex = Math.min(Math.floor(scrollBottom * Songs.length) + 5, Songs.length - 1);
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
    const startIndex = Math.max(Math.floor(scrollTop * Songs.length) - 5, 0);
    const endIndex = Math.min(Math.floor(scrollBottom * Songs.length) + 5, Songs.length - 1);
    for (let i = startIndex; i <= endIndex; i++) {
        LoadThumbnail(Songs[i], delay);
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
    if (Player.nowPlaying == null || Player.nowPlaying.index == Songs.length - 1) {
        await PlaySong(null);
    } else {
        await PlaySong(Songs[Player.nowPlaying.index + 1]);
    }
}

async function PlayPreviousSong() {
    if (Player.nowPlaying == null || Player.nowPlaying.index == 0) {
        await PlaySong(null);
    } else {
        await PlaySong(Songs[Player.nowPlaying.index - 1]);
    }
}

async function PlayRandomSong() {
    const index = Math.floor(Math.random() * Songs.length);
    await PlaySong(Songs[index]);
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

Init();