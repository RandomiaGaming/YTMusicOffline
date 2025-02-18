for (let i = 0; i < Songs.List.length; i++) {
    const song = Songs.List[i];

    const releaseDate = new Date(song.ReleaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    let featuringStatement = "";
    for (let j = 0; j < song.FeaturedArtistNames.length; j++) {
        const featuredAristName = song.FeaturedArtistNames[j];
        if (j == 0) {
            featuringStatement += " featuring ";
        } else if (j == song.FeaturedArtistNames.length - 1) {
            featuringStatement += ", and ";
        } else {
            featuringStatement += ", ";
        }
        featuringStatement += featuredAristName;
    }
    song.StatusText = `${song.SongName} by ${song.ArtistName} from ${song.AlbumName} released on ${releaseDate}${featuringStatement}`;

    song.ThumbnailLoaded = false;
    song.Element = null;
}

Player = {};
Player.ContainerElement = null;
Player.FloatElement = null;
Player.AudioElement = null;
Player.ThumbnailElement = null;
Player.DescriptionElement = null;
Player.FloatState = "hidden"; // hidden, top, middle, bottom
function InitDom() {
    Player.ContainerElement = document.querySelector(".player_container");
    Player.FloatElement = document.querySelector(".player_float");
    Player.AudioElement = document.querySelector(".player_audio");
    Player.ThumbnailElement = document.querySelector(".player_thumbnail");
    Player.DescriptionElement = document.querySelector(".player_description");

    for (let i = 0; i < Songs.List.length; i++) {
        const song = Songs.List[i];

        const htmlString = `<div class="song_container" onclick="PlaySong(Songs.ByID['${song.VideoID}'])">
            <img class="song_thumbnail" type="image/png" alt="Thumbnail image." src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=">
            <div class="song_spacer"></div>
            <p class="song_description">${song.StatusText}</p>
            <div class="song_spacer"></div>
            <p class="song_woy" onclick="event.stopPropagation(); window.open('https\:\/\/youtu.be/${song.VideoID}', '_blank')">Watch on YouTube...</p>
        </div>`;

        const template = document.createElement("template");
        template.innerHTML = htmlString;
        song.Element = document.body.appendChild(template.content.firstChild);
    }
}
document.addEventListener("DOMContentLoaded", InitDom);

function UpdateThumbnails() {
    const scrollTop = document.documentElement.scrollTop / document.documentElement.scrollHeight;
    const scrollBottom = (document.documentElement.scrollTop + document.documentElement.clientHeight) / document.documentElement.scrollHeight;
    const songCount = Songs.List.length;
    const startIndex = Math.max(Math.floor(scrollTop * songCount), 0);
    const endIndex = Math.min(Math.floor(scrollBottom * songCount), songCount - 1);
    for (let i = startIndex; i <= endIndex; i++) {
        const song = Songs.List[i];
        if (!song.thumbnailLoaded) {
            const thumbnailUrl = `/Database/RawThumbnails/${song.VideoID}.jpg`;
            song.Element.querySelector("img").src = thumbnailUrl;
            song.thumbnailLoaded = true;
        }
    }
}
document.addEventListener("DOMContentLoaded", UpdateThumbnails);

Player.ThumbnailUpdateTimer = null;
function QueueThumbnailUpdate() {
    clearTimeout(Player.ThumbnailUpdateTimer);
    Player.ThumbnailUpdateTimer = setTimeout(() => {
        UpdateThumbnails();
    }, 100);
}

function UpdatePlayerPosition() {
    const clientRect = Player.ContainerElement.getBoundingClientRect();
    if (clientRect.top < 0) {
        if (Player.FloatState != "top") {
            Player.FloatElement.style.removeProperty("bottom");
            Player.FloatElement.style.top = "0px";
            Player.FloatElement.style.position = "fixed";
            Player.FloatState = "top";
        }
    } else if (clientRect.bottom > window.innerHeight) {
        if (Player.FloatState != "bottom") {
            Player.FloatElement.style.removeProperty("top");
            Player.FloatElement.style.bottom = "0px";
            Player.FloatElement.style.position = "fixed";
            Player.FloatState = "bottom";
        }
    } else {
        if (Player.FloatState != "middle") {
            Player.FloatElement.style.removeProperty("top");
            Player.FloatElement.style.removeProperty("bottom");
            Player.FloatElement.style.removeProperty("position");
            Player.FloatState = "middle";
        }
    }
}

document.addEventListener("scroll", () => {
    QueueThumbnailUpdate();
    UpdatePlayerPosition();
});

function SeekTo(newTime) {
    if ("fastSeek" in Player.AudioElement) {
        Player.AudioElement.fastSeek(newTime);
    } else {
        Player.AudioElement.currentTime = newTime;
    }
}

async function PlayRandomSong() {
    const index = Math.floor(Math.random() * Songs.List.length);
    PlaySong(Songs.List[index]);
}

Player.NowPlaying = null;
async function PlaySong(song) {
    if (Player.NowPlaying != null) {
        Player.NowPlaying.Element.style.removeProperty("display");
    }
    Player.NowPlaying = song;
    Player.NowPlaying.Element.style.display = "none";

    Player.ContainerElement.style.removeProperty("display");
    document.body.insertBefore(Player.ContainerElement, Player.NowPlaying.Element.nextSibling);

    UpdatePlayerPosition();

    Player.DescriptionElement.textContent = song.StatusText;
    Player.ThumbnailElement.src = `/Database/RawThumbnails/${song.VideoID}.jpg`;
    Player.AudioElement.pause();
    Player.AudioElement.src = `/Database/RawSongs/${song.VideoID}.webm`;
    Player.AudioElement.currentTime = 0;
    await Player.AudioElement.play();

    ReInitMediaSession();
}

function UpdateMediaSession(newTime) {
    if ("mediaSession" in navigator) {
        // KNOWN ISSUE:
        // navigator.mediaSession.playbackRate breaks on chrome for android.
        const overridePlaybackRate = 0.0001;
        if (newTime != -1 && Player.AudioElement.duration > 0) {
            if (newTime == undefined || newTime == null) {
                navigator.mediaSession.setPositionState({ duration: Player.AudioElement.duration, playbackRate: overridePlaybackRate, position: Player.AudioElement.currentTime });
            } else {
                navigator.mediaSession.setPositionState({ duration: Player.AudioElement.duration, playbackRate: overridePlaybackRate, position: newTime });
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

    navigator.mediaSession.metadata = new MediaMetadata({
        title: Player.NowPlaying.SongName,
        artist: Player.NowPlaying.ArtistName,
        album: Player.NowPlaying.AlbumName,
        artwork: [{ src: `/Database/RawThumbnails/${Player.NowPlaying.VideoID}.jpg`, type: "image/png" }]
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

    navigator.mediaSession.setActionHandler("nexttrack", (event) => {
        PlayRandomSong();
    });
    navigator.mediaSession.setActionHandler("pause", (event) => {
        navigator.mediaSession.playbackState = "paused";
        Player.AudioElement.pause();
    });
    navigator.mediaSession.setActionHandler("play", (event) => {
        navigator.mediaSession.playbackState = "playing";
        Player.AudioElement.play();
    });
    navigator.mediaSession.setActionHandler("previoustrack", (event) => {
        PlayRandomSong();
    });
    navigator.mediaSession.setActionHandler("seekbackward", (event) => {
        const newTime = Player.AudioElement.currentTime - 5;
        if (event.seekOffset) {
            newTime = Player.AudioElement.currentTime - seekOffset;
        }
        newTime = Math.max(0, newTime)
        SeekTo(newTime);
        UpdateMediaSession(newTime);
    });
    navigator.mediaSession.setActionHandler("seekforward", (event) => {
        const newTime = Player.AudioElement.currentTime + 5;
        if (event.seekOffset) {
            newTime = Player.AudioElement.currentTime + seekOffset;
        }
        newTime = Math.min(Player.AudioElement.duration, newTime)
        SeekTo(newTime);
        UpdateMediaSession(newTime);
    });
    navigator.mediaSession.setActionHandler("seekto", (event) => {
        const newTime = event.seekTime;
        SeekTo(newTime);
        UpdateMediaSession(newTime);
    });
    navigator.mediaSession.setActionHandler("stop", (event) => {
        Player.AudioElement.pause();
        const newTime = 0;
        SeekTo(newTime);
        UpdateMediaSession(-1);
    });

    Player.AudioElement.onpause = () => {
        navigator.mediaSession.playbackState = "paused";
    };
    Player.AudioElement.onplay = () => {
        navigator.mediaSession.playbackState = "playing";
    };
    Player.AudioElement.addEventListener("timeupdate", function () {
        UpdateMediaSession();
    });

    navigator.mediaSession.playbackState = "paused";
    UpdateMediaSession(-1);
}
document.addEventListener("DOMContentLoaded", InitMediaSession);