async function Init() {
    window.NowPlaying = null;
    window.Player = document.querySelector("#player");

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
            window.Player.pause();
        });
        navigator.mediaSession.setActionHandler("play", (event) => {
            navigator.mediaSession.playbackState = "playing";
            window.Player.play();
        });
        navigator.mediaSession.setActionHandler("previoustrack", (event) => {
            PlayRandomSong();
        });
        navigator.mediaSession.setActionHandler("seekbackward", (event) => {
            const newTime = window.Player.currentTime - 5;
            if (event.seekOffset) {
                newTime = window.Player.currentTime - seekOffset;
            }
            newTime = Math.max(0, newTime)
            SeekTo(newTime);
            UpdatePosition(newTime);
        });
        navigator.mediaSession.setActionHandler("seekforward", (event) => {
            const newTime = window.Player.currentTime + 5;
            if (event.seekOffset) {
                newTime = window.Player.currentTime + seekOffset;
            }
            newTime = Math.min(window.Player.duration, newTime)
            SeekTo(newTime);
            UpdatePosition(newTime);
        });
        navigator.mediaSession.setActionHandler("seekto", (event) => {
            const newTime = event.seekTime;
            SeekTo(newTime);
            UpdatePosition(newTime);
        });
        navigator.mediaSession.setActionHandler("stop", (event) => {
            window.Player.pause();
            const newTime = 0;
            SeekTo(newTime);
            UpdatePosition(-1);
        });

        window.Player.onpause = () => {
            navigator.mediaSession.playbackState = "paused";
        };
        window.Player.onplay = () => {
            navigator.mediaSession.playbackState = "playing";
        };
        window.Player.addEventListener("timeupdate", function () {
            UpdatePosition();
        });

        navigator.mediaSession.playbackState = "paused";
        UpdatePosition(-1);
    }
}
async function SeekTo(newTime) {
    if ("fastSeek" in window.Player) {
        window.Player.fastSeek(newTime);
    } else {
        window.Player.currentTime = newTime;
    }
}
async function UpdatePosition(newTime) {
    if ("mediaSession" in navigator) {
        const overridePlaybackRate = 0.0001; // window.Player.playbackRate breaks on chrome for android.
        if (newTime != -1 && window.Player.duration > 0) {
            if (newTime == undefined || newTime == null) {
                navigator.mediaSession.setPositionState({ duration: window.Player.duration, playbackRate: overridePlaybackRate, position: window.Player.currentTime });
            } else {
                navigator.mediaSession.setPositionState({ duration: window.Player.duration, playbackRate: overridePlaybackRate, position: newTime });
            }
        } else {
            navigator.mediaSession.setPositionState({ duration: 500, playbackRate: overridePlaybackRate, position: 0 });
        }
    }
}
async function PlayRandomSong() {
    const index = Math.floor(Math.random() * window.Songs.length);
    Play(window.Songs[index]);
}
async function SongByVideoID(videoID) {
    for (let i = 0; i < window.Songs.length; i++) {
        if (window.Songs[i].VideoID == videoID) {
            return Songs[i];
        }
    }
    return null;
}
async function Play(song) {
    window.NowPlaying = song;

    window.Player.pause();
    window.Player.src = `/Database/RawSongs/${window.NowPlaying.VideoID}.webm`;
    window.Player.currentTime = 0;
    await window.Player.play();

    UpdateSongInfo();

    ReInitMediaSession();
}
// Updates all the non-audio elements which show song data like the thumbnail and status.
async function UpdateSongInfo() {
    const status = document.querySelector("#status");
    const releaseDate = new Date(window.NowPlaying.ReleaseDate);
    const releaseDateFormatted = releaseDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    let featuringStatement = "";
    for (let i = 0; i < window.NowPlaying.FeaturedArtistNames.length; i++) {
        if (i == 0) {
            featuringStatement += " featuring ";
        } else {
            featuringStatement += ", ";
        }
        featuringStatement += window.NowPlaying.FeaturedArtistNames[i];
    }
    status.innerHTML = `Now playing ${window.NowPlaying.SongName} by ${window.NowPlaying.ArtistName} from ${window.NowPlaying.AlbumName} released on ${releaseDateFormatted}${featuringStatement}.`;

    const thumbnail = document.querySelector("#thumbnail");
    thumbnail.src = `/Database/RawThumbnails/${window.NowPlaying.VideoID}.png`;

    const woy = document.querySelector("#woy");
    woy.href = `https://www.youtube.com/watch?v=${window.NowPlaying.VideoID}`;
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