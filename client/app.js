async function LoadDatabase() {
    rawSongs = await (await fetch("/database/songs.json")).json();
    
    window.Songs = {};
    window.Songs.ByID = {};
    window.Songs.List = [];
    for (let i = 0; i < rawSongs.length; i++) {
        const song = rawSongs[i];
        song.Index = i;
        
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
        
        song.ThumbnailState = "unloaded";
        song.Element = null;
        
        Songs.ByID[song.VideoID] = song;
        Songs.List[song.Index] = song;
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
Player.ContainerElement = null;
Player.FloatElement = null;
Player.AudioElement = null;
Player.ThumbnailElement = null;
Player.DescriptionElement = null;
Player.FloatState = "hidden"; // hidden, top, middle, bottom
async function Init() {
    promises = [
        LoadDatabase(),
        WaitForDomLoad()
    ];
    await Promise.all(promises);

    Player.ContainerElement = document.querySelector(".player_container");
    Player.FloatElement = document.querySelector(".player_float");
    Player.AudioElement = document.querySelector(".player_audio");
    Player.ThumbnailElement = document.querySelector(".player_thumbnail");
    Player.DescriptionElement = document.querySelector(".player_description");

    Player.AudioElement.addEventListener("ended", async (event) => { await PlayNextSong(); });
    const playerResizeObserver = new ResizeObserver(entries => {
        Player.FloatElement.style.height = `${Player.ContainerElement.clientHeight}px`;
    });
    playerResizeObserver.observe(Player.ContainerElement);
    Player.FloatElement.style.height = `${Player.ContainerElement.clientHeight}px`;

    for (let i = 0; i < Songs.List.length; i++) {
        const song = Songs.List[i];

        const htmlString = `<div class="song_container" onclick="PlaySong(Songs.ByID['${song.VideoID}'])">
            <img class="song_thumbnail" alt="Thumbnail image." src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=">
            <div class="song_spacer"></div>
            <p class="song_description">${song.StatusText}</p>
            <div class="song_spacer"></div>
            <p class="song_woy" onclick="event.stopPropagation(); window.open('https\:\/\/youtu.be/${song.VideoID}', '_blank')">Watch on YouTube...</p>
        </div>`;

        const template = document.createElement("template");
        template.innerHTML = htmlString;
        song.Element = document.body.appendChild(template.content.firstChild);
    }

    UpdateThumbnails(0);
}

window.addEventListener("resize", () => {
    if (window.innerHeight > window.innerWidth) {
        document.documentElement.style.setProperty("--song-container-height", "var(--song-container-height-portrait)");
    } else {
        document.documentElement.style.setProperty("--song-container-height", "var(--song-container-height-landscape)");
    }
});
if (window.innerHeight > window.innerWidth) {
    document.documentElement.style.setProperty("--song-container-height", "var(--song-container-height-portrait)");
} else {
    document.documentElement.style.setProperty("--song-container-height", "var(--song-container-height-landscape)");
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
        const songCount = Songs.List.length;
        const startIndex = Math.max(Math.floor(scrollTop * songCount) - 5, 0);
        const endIndex = Math.min(Math.floor(scrollBottom * songCount) + 5, songCount - 1);
        if (song.Index >= startIndex && song.Index <= endIndex) {
            const thumbnailUrl = `/database/thumbnails/${song.VideoID}.jpg`;
            song.Element.querySelector("img").src = thumbnailUrl;
            song.thumbnailState = "loaded";
        } else {
            song.thumbnailState = "unloaded";
        }
    }
}

function UpdateThumbnails(delay = 100) {
    const scrollTop = document.documentElement.scrollTop / document.documentElement.scrollHeight;
    const scrollBottom = (document.documentElement.scrollTop + document.documentElement.clientHeight) / document.documentElement.scrollHeight;
    const songCount = Songs.List.length;
    const startIndex = Math.max(Math.floor(scrollTop * songCount) - 5, 0);
    const endIndex = Math.min(Math.floor(scrollBottom * songCount) + 5, songCount - 1);
    for (let i = startIndex; i <= endIndex; i++) {
        LoadThumbnail(Songs.List[i], delay);
    }
}

function UpdatePlayerPosition() {
    if (Player.NowPlaying == null) {
        if (Player.FloatState != "hidden") {
            Player.FloatElement.style.removeProperty("top");
            Player.FloatElement.style.removeProperty("bottom");
            Player.FloatElement.style.removeProperty("position");
            Player.ContainerElement.style.display = "none";
            Player.FloatState = "hidden";
        }
    } else {
        const clientRect = Player.ContainerElement.getBoundingClientRect();
        if (clientRect.top < 0) {
            if (Player.FloatState != "top") {
                Player.FloatElement.style.top = "0px";
                Player.FloatElement.style.removeProperty("bottom");
                Player.FloatElement.style.position = "fixed";
                Player.ContainerElement.style.removeProperty("display");
                Player.FloatState = "top";
            }
        } else if (clientRect.bottom > window.innerHeight) {
            if (Player.FloatState != "bottom") {
                Player.FloatElement.style.removeProperty("top");
                Player.FloatElement.style.bottom = "0px";
                Player.FloatElement.style.position = "fixed";
                Player.ContainerElement.style.removeProperty("display");
                Player.FloatState = "bottom";
            }
        } else {
            if (Player.FloatState != "middle") {
                Player.FloatElement.style.removeProperty("top");
                Player.FloatElement.style.removeProperty("bottom");
                Player.FloatElement.style.removeProperty("position");
                Player.ContainerElement.style.removeProperty("display");
                Player.FloatState = "middle";
            }
        }
    }
}

document.addEventListener("scroll", () => {
    UpdateThumbnails();
    UpdatePlayerPosition();
});

function SeekTo(newTime) {
    if ("fastSeek" in Player.AudioElement) {
        Player.AudioElement.fastSeek(newTime);
    } else {
        Player.AudioElement.currentTime = newTime;
    }
}

async function PlayNextSong() {
    if (Player.NowPlaying == null || Player.NowPlaying.Index == Songs.List.length - 1) {
        await PlaySong(null);
    } else {
        await PlaySong(Songs.List[Player.NowPlaying.Index + 1]);
    }
}

async function PlayPreviousSong() {
    if (Player.NowPlaying == null || Player.NowPlaying.Index == 0) {
        await PlaySong(null);
    } else {
        await PlaySong(Songs.List[Player.NowPlaying.Index - 1]);
    }
}

async function PlayRandomSong() {
    const index = Math.floor(Math.random() * Songs.List.length);
    await PlaySong(Songs.List[index]);
}

Player.NowPlaying = null;
async function PlaySong(song) {
    Player.AudioElement.pause();
    if (Player.NowPlaying != null) {
        Player.NowPlaying.Element.style.removeProperty("display");
    }

    Player.NowPlaying = song;

    if (Player.NowPlaying != null) {
        Player.NowPlaying.Element.style.display = "none";
        document.body.insertBefore(Player.ContainerElement, Player.NowPlaying.Element.nextSibling);
        Player.DescriptionElement.textContent = "Now Playing: " + song.StatusText;
        Player.ThumbnailElement.src = `/database/thumbnails/${song.VideoID}.jpg`;
        Player.AudioElement.currentTime = 0;
    }

    UpdatePlayerPosition();
    ReInitMediaSession();

    if (Player.NowPlaying != null) {
        try {
            Player.AudioElement.src = `/database/songs/${song.VideoID}.webm`;
            await Player.AudioElement.play();
        } catch {
            try {
                Player.AudioElement.src = `/database/songs/${song.VideoID}.m4a`;
                await Player.AudioElement.play();
            } catch {
                alert(`ERROR: Could not play \"${song.StatusText}\"!`);
                await PlaySong(null);
            }
        }
    }
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

    if (Player.NowPlaying == null) {
        navigator.mediaSession.metadata = null;
        return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
        title: Player.NowPlaying.SongName,
        artist: Player.NowPlaying.ArtistName,
        album: Player.NowPlaying.AlbumName,
        artwork: [{ sizes: "320x180", src: `/database/thumbnails/${Player.NowPlaying.VideoID}.jpg`, type: "image/jpeg" }]
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
        Player.AudioElement.pause();
    });
    navigator.mediaSession.setActionHandler("play", (event) => {
        navigator.mediaSession.playbackState = "playing";
        Player.AudioElement.play();
    });
    navigator.mediaSession.setActionHandler("previoustrack", async (event) => {
        await PlayPreviousSong();
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

Init();