async function Init() {
    window.NowPlaying = null;
    window.Player = {};
    window.Player.ContainerElement = document.querySelector("#player_container");
    window.Player.FloatElement = document.querySelector("#player_float");
    window.Player.AudioElement = document.querySelector("#player_audio");
    window.Player.StickyState = 1;
    for (let i = 0; i < window.Songs.List.length; i++) {
        const song = window.Songs.List[i];
        song.thumbnailLoaded = false;

        const releaseDate = new Date(song.ReleaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        let featuringStatement = "";
        for (let j = 0; j < song.FeaturedArtistNames.length; j++) {
            const featuredAristName = song.FeaturedArtistNames[j];
            if (j == 0) {
                featuringStatement += " featuring ";
            } else {
                featuringStatement += ", ";
            }
            featuringStatement += featuredAristName;
        }
        const statusText = `${song.SongName} by ${song.ArtistName} from ${song.AlbumName} released on ${releaseDate}${featuringStatement}. ${i}`;

        const htmlString = `<div class="song_container" onclick="PlaySong(window.Songs.ByID['${song.VideoID}'])">
            <img class="song_thumbnail" type="image/png" alt="Thumbnail image." src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII="></img>
            <div class="song_spacer"></div>
            <p class="song_description">${statusText}</p>
            <div class="song_spacer"></div>
            <p class="song_woy" onclick="event.stopPropagation(); window.open('https://youtu.be/${song.VideoID}', '_blank')">Watch on YouTube...</p>
        </div>`;

        const template = document.createElement("template");
        template.innerHTML = htmlString;
        song.Element = document.body.appendChild(template.content.firstChild);
    }

    let thumbnailTimer = null;
    function UpdateThumbnails() {
        clearTimeout(thumbnailTimer);
        thumbnailTimer = setTimeout(() => {
            const scrollTop = document.documentElement.scrollTop / document.documentElement.scrollHeight;
            const scrollBottom = (document.documentElement.scrollTop + document.documentElement.clientHeight) / document.documentElement.scrollHeight;
            const songCount = window.Songs.List.length;
            const startIndex = Math.max(Math.floor(scrollTop * songCount), 0);
            const endIndex = Math.min(Math.floor(scrollBottom * songCount), songCount - 1);
            for (let i = startIndex; i <= endIndex; i++) {
                const song = window.Songs.List[i];
                if (!song.thumbnailLoaded) {
                    const thumbnailUrl = `/Database/RawThumbnails/${song.VideoID}.jpg`;
                    song.Element.querySelector("img").src = thumbnailUrl;
                    song.thumbnailLoaded = true;
                }
            }
        }, 100);
    }
    function UpdatePlayerPosition() {
        const clientRect = window.Player.ContainerElement.getBoundingClientRect();
        if (clientRect.top < 0) {
            if (window.Player.StickyState != 0) {
                window.Player.FloatElement.style.removeProperty("bottom");
                window.Player.FloatElement.style.top = "0px";
                window.Player.FloatElement.style.position = "fixed";
                window.Player.StickyState = 0;
            }
        } else if (clientRect.bottom > window.innerHeight) {
            if (window.Player.StickyState != 2) {
                window.Player.FloatElement.style.removeProperty("top");
                window.Player.FloatElement.style.bottom = "0px";
                window.Player.FloatElement.style.position = "fixed";
                window.Player.StickyState = 2;
            }
        } else {
            if (window.Player.StickyState != 1) {
                window.Player.FloatElement.style.removeProperty("top");
                window.Player.FloatElement.style.removeProperty("bottom");
                window.Player.FloatElement.style.removeProperty("position");
                window.Player.StickyState = 1;
            }
        }
    }
    document.addEventListener("scroll", (event) => {
        UpdateThumbnails();
        UpdatePlayerPosition();
    });
    UpdateThumbnails();

    if ("mediaSession" in navigator) {
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
            window.Player.AudioElement.pause();
        });
        navigator.mediaSession.setActionHandler("play", (event) => {
            navigator.mediaSession.playbackState = "playing";
            window.Player.AudioElement.play();
        });
        navigator.mediaSession.setActionHandler("previoustrack", (event) => {
            PlayRandomSong();
        });
        navigator.mediaSession.setActionHandler("seekbackward", (event) => {
            const newTime = window.Player.AudioElement.currentTime - 5;
            if (event.seekOffset) {
                newTime = window.Player.AudioElement.currentTime - seekOffset;
            }
            newTime = Math.max(0, newTime)
            SeekTo(newTime);
            UpdatePosition(newTime);
        });
        navigator.mediaSession.setActionHandler("seekforward", (event) => {
            const newTime = window.Player.AudioElement.currentTime + 5;
            if (event.seekOffset) {
                newTime = window.Player.AudioElement.currentTime + seekOffset;
            }
            newTime = Math.min(window.Player.AudioElement.duration, newTime)
            SeekTo(newTime);
            UpdatePosition(newTime);
        });
        navigator.mediaSession.setActionHandler("seekto", (event) => {
            const newTime = event.seekTime;
            SeekTo(newTime);
            UpdatePosition(newTime);
        });
        navigator.mediaSession.setActionHandler("stop", (event) => {
            window.Player.AudioElement.pause();
            const newTime = 0;
            SeekTo(newTime);
            UpdatePosition(-1);
        });

        window.Player.AudioElement.onpause = () => {
            navigator.mediaSession.playbackState = "paused";
        };
        window.Player.AudioElement.onplay = () => {
            navigator.mediaSession.playbackState = "playing";
        };
        window.Player.AudioElement.addEventListener("timeupdate", function () {
            UpdatePosition();
        });

        navigator.mediaSession.playbackState = "paused";
        UpdatePosition(-1);
    }
}
async function SeekTo(newTime) {
    if ("fastSeek" in window.Player.AudioElement) {
        window.Player.AudioElement.fastSeek(newTime);
    } else {
        window.Player.AudioElement.currentTime = newTime;
    }
}
async function UpdatePosition(newTime) {
    if ("mediaSession" in navigator) {
        const overridePlaybackRate = 0.0001; // window.Player.AudioElement.playbackRate breaks on chrome for android.
        if (newTime != -1 && window.Player.AudioElement.duration > 0) {
            if (newTime == undefined || newTime == null) {
                navigator.mediaSession.setPositionState({ duration: window.Player.AudioElement.duration, playbackRate: overridePlaybackRate, position: window.Player.AudioElement.currentTime });
            } else {
                navigator.mediaSession.setPositionState({ duration: window.Player.AudioElement.duration, playbackRate: overridePlaybackRate, position: newTime });
            }
        } else {
            navigator.mediaSession.setPositionState({ duration: 500, playbackRate: overridePlaybackRate, position: 0 });
        }
    }
}
async function PlayRandomSong() {
    const index = Math.floor(Math.random() * window.Songs.List.length);
    PlaySong(window.Songs.List[index]);
}
async function PlaySong(song) {
    if (window.NowPlaying != null) {
        window.NowPlaying.Element.style.removeProperty("display");
    }
    window.NowPlaying = song;
    window.NowPlaying.Element.style.display = "none";

    window.Player.ContainerElement.style.removeProperty("display");
    document.body.insertBefore(window.Player.ContainerElement, window.NowPlaying.Element.nextSibling);

    window.Player.AudioElement.pause();
    window.Player.AudioElement.src = `/Database/RawSongs/${song.VideoID}.webm`;
    window.Player.AudioElement.currentTime = 0;
    await window.Player.AudioElement.play();

    ReInitMediaSession();
}
async function ReInitMediaSession() {
    if (!("mediaSession" in navigator)) {
        return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
        title: window.NowPlaying.SongName,
        artist: window.NowPlaying.ArtistName,
        album: window.NowPlaying.AlbumName,
        artwork: [{ src: `/Database/RawThumbnails/${window.NowPlaying.VideoID}.png`, type: "image/png" }]
    });

    navigator.mediaSession.playbackState = "playing";
    navigator.mediaSession.setPositionState({ duration: 1, playbackRate: 1, position: 0 });
}
document.addEventListener("DOMContentLoaded", async () => { await Init(); });