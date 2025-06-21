# User Settings
# To update user agent run the following in the chrome developer console
# console.log(navigator.userAgent);
UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
TraceMinDelay = 0
TraceMaxDelay = 1
ThumbnailDownloadMinDelay = 0
ThumbnailDownloadMaxDelay = 1
AudioStreamDownloadMinDelay = 0
AudioStreamDownloadMaxDelay = 5
SongDownloadRateLimit = 1_000_000
SegmentDownloadMinDelay = 0
SegmentDownloadMaxDelay = 5

# Import builtins (part of python)
import json
import sys
import os
import subprocess
import urllib.request
import urllib.parse
import time
from datetime import datetime, timezone
import random
import importlib

# Import pip dependencies
def PromptPipInstall(importName, pipName):
    pipCommand = f"python -m pip install -U {pipName}"
    print(f"ERROR: Dependency {pipName} not found. Would you like to install it now? (y/n)")
    choice = input().lower()
    if choice in [ "y", "yes" ]:
        print()
        print(f"> {pipCommand}")
        errorCode = subprocess.run(pipCommand, shell=True, env=os.environ.copy()).returncode
        print()
        if errorCode != 0:
           print(f"ERROR: {pipCommand} failed with error code {errorCode}.")
           sys.exit(1)
        globals()[importName] = importlib.import_module(importName)
    else:
        print(f"Execution cannot continue without required dependency {pipName}.")
        sys.exit(1)
try:
    import googleapiclient
except ImportError:
    PromptPipInstall("googleapiclient", "google-api-python-client")
try:
    import google_auth_oauthlib
except ImportError:
    PromptPipInstall("google_auth_oauthlib", "google-auth-oauthlib")
try:
    import google_auth_httplib2
except ImportError:
    PromptPipInstall("google_auth_httplib2", "google-auth-httplib2")
try:
    import yt_dlp
except ImportError:
    PromptPipInstall("yt_dlp", "yt-dlp")

# Import submodules of pip packages not previously imported
import google_auth_oauthlib.flow
import googleapiclient.discovery
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Define helper functions
def DictionaryHas(dictionary, path):
    if dictionary == None:
        return False
    keys = path.split(".")
    for key in keys:
        if not key in dictionary:
            return False
        if dictionary[key] == None:
            return False
        dictionary = dictionary[key]
    return True
def RandomSleep(minSeconds, maxSeconds):
    if minSeconds > maxSeconds:
        minSeconds, maxSeconds = maxSeconds, minSeconds
    duration = random.uniform(minSeconds, maxSeconds)
    time.sleep(duration)
def ChangeDir():
    extractorDir = os.path.dirname(os.path.abspath(sys.argv[0]))
    ytMusicOfflineDir = os.path.dirname(extractorDir)
    os.chdir(ytMusicOfflineDir)
def PathToClientUrl(filePath):
    ChangeDir()
    filePath = os.path.abspath(filePath)
    databaseDir = os.path.abspath("database")
    clientDir = os.path.abspath("client")
    if not "..\\" in os.path.relpath(filePath, databaseDir):
        return "/database/" + os.path.relpath(filePath, databaseDir).replace("\\", "/")
    if not "..\\" in os.path.relpath(filePath, clientDir):
        return "/" + os.path.relpath(filePath, clientDir).replace("\\", "/")
    raise Exception(f"{filePath} is not within the client or database folders and therefore is innaccesable to the client.")
Database = None
def LoadDatabase(echo=False):
    global Database
    if Database != None:
        return
    if echo: print("Loading database...")

    ChangeDir()
    databaseDir = os.path.abspath("database")
    os.makedirs(databaseDir, exist_ok=True)
    databasePath = os.path.abspath("database/database.json")

    if not os.path.exists(databasePath):
        Database = {}
    with open(databasePath, "r", encoding="utf-8") as databaseFile:
        Database = json.load(databaseFile)
def SaveDatabase(echo=False):
    global Database
    if Database == None:
        raise Exception("Database must be loaded before calling SaveDatabase.")
    if echo: print("Saving database...")

    ChangeDir()
    databaseDir = os.path.abspath("database")
    os.makedirs(databaseDir, exist_ok=True)
    databasePath = os.path.abspath("database/database.json")

    with open(databasePath, "w", encoding="utf-8") as databaseFile:
        json.dump(Database, databaseFile, indent=4, ensure_ascii=True)
YouTubeApi = None
def AuthApi(echo=False):
    global YouTubeApi
    if YouTubeApi != None:
        return
    if echo: print("Authenticating with YouTube Api...")

    ChangeDir()
    userSecretsPath = os.path.abspath("extractor/user_secrets.json")
    clientSecretsPath = os.path.abspath("extractor/client_secrets.json")

    credentials = None
    if os.path.exists(userSecretsPath):
        credentials = Credentials.from_authorized_user_file(userSecretsPath, [ "https://www.googleapis.com/auth/youtube.readonly" ])
        if credentials.expired:
            credentials.refresh(Request())
        if not credentials.valid:
            credentials = None

    if credentials == None:
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
        flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(clientSecretsPath, [ "https://www.googleapis.com/auth/youtube.readonly" ])
        credentials = flow.run_local_server(port=0)

    with open(userSecretsPath, "w") as userSecretsFile: userSecretsFile.write(credentials.to_json())

    YouTubeApi = googleapiclient.discovery.build("youtube", "v3", credentials=credentials)

# Phase 1 - Getting MyVideoIds
MyVideoIds = None
def EnumMyPlaylists(includeLikes=False, includeLikedMusic=False):
    global YouTubeApi
    output = set()

    if includeLikedMusic:
        output.add("LM")
    if includeLikes:
        output.add("LL")

    request = YouTubeApi.playlists().list(
        part="id",
        mine=True,
        maxResults=50
    )
    response = request.execute()
    for item in response["items"]:
        output.add(item["id"])
    if DictionaryHas(response, "nextPageToken"):
        nextPageToken = response["nextPageToken"]
    else:
        nextPageToken = None

    while nextPageToken != None:
        request = YouTubeApi.playlists().list(
            part="id",
            mine=True,
            maxResults=50,
            pageToken=nextPageToken
        )
        response = request.execute()
        for item in response["items"]:
            output.add(item["id"])
        if DictionaryHas(response, "nextPageToken"):
            nextPageToken = response["nextPageToken"]
        else:
            nextPageToken = None
    return output
def EnumPlaylistContents(playlistId):
    global YouTubeApi
    output = set()

    request = YouTubeApi.playlistItems().list(
        part="snippet", # Snippet used instead of id because id returns the playlistItemId not the videoId
        playlistId=playlistId,
        maxResults=50
    )
    response = request.execute()
    for item in response["items"]:
        output.add(item["snippet"]["resourceId"]["videoId"])
    if DictionaryHas(response, "nextPageToken"):
        nextPageToken = response["nextPageToken"]
    else:
        nextPageToken = None
    
    while nextPageToken != None:
        request = YouTubeApi.playlistItems().list(
            part="snippet",
            playlistId=playlistId,
            maxResults=50,
            pageToken=nextPageToken
        )
        response = request.execute()
        for item in response["items"]:
            output.add(item["snippet"]["resourceId"]["videoId"])
        if DictionaryHas(response, "nextPageToken"):
            nextPageToken = response["nextPageToken"]
        else:
            nextPageToken = None
    return output
def Phase1():
    global MyVideoIds
    print("Fetching playlists including music likes...")
    
    MyVideoIds = set()

    myPlaylistIds = EnumMyPlaylists(includeLikedMusic=True)

    i = 0
    for playlistId in myPlaylistIds:
        print(f"Fetching playlist contents {i} of {len(myPlaylistIds)}...")
        i += 1
        for videoId in EnumPlaylistContents(playlistId):
            MyVideoIds.add(videoId)

# Phase 2 - Getting Video Info
VideoInfo = {}
def GetVideoInfo(videoIds, echo=False):
    videoInfo = {}
    noMetadataVideoIds = set()

    i = 0
    videoIds = list(videoIds)
    while i < len(videoIds):
        nextVideoIds = videoIds[i:i + 50]
        print(f"Fetching video info for videos {i} to {i + (len(nextVideoIds) - 1)} of {len(videoIds)}...")
        i += len(nextVideoIds)
        request = YouTubeApi.videos().list(
            part="contentDetails,id,liveStreamingDetails,localizations,paidProductPlacementDetails,player,recordingDetails,snippet,statistics,status,topicDetails",
            id=",".join(nextVideoIds),
            maxResults=50
        )
        response = request.execute()
        for video in response["items"]:
            videoId = video["id"]
            nextVideoIds.remove(videoId)
            videoInfo[videoId] = video
        for videoId in nextVideoIds:
            noMetadataVideoIds.add(videoId)
    return videoInfo, noMetadataVideoIds
def Phase2():
    global MyVideoIds, VideoInfo
    print("Fetching video info for videos not yet in the video database...")

    for videoId in list(VideoInfo.keys()):
        if videoId not in MyVideoIds:
            del VideoInfo[videoId]

    infoNeededVideoIds = set()
    for videoId in MyVideoIds:
        if videoId in VideoInfo:
            continue
        infoNeededVideoIds.add(videoId)
    if len(infoNeededVideoIds) <= 0:
        return False
    
    newVideoInfo, noMetadataVideoIds = GetVideoInfo(infoNeededVideoIds, echo=True)
    VideoInfo.update(newVideoInfo)
    MyVideoIds.difference_update(noMetadataVideoIds)
    return True

# Phase 3 - Tracing Redirected Videos
def IsVideoUnavailable(video):
    if DictionaryHas(video, "status.privacyStatus"):
        privacyStatus = video["status"]["privacyStatus"]
        if privacyStatus != "public" and privacyStatus != "unlisted":
            return True
    if DictionaryHas(video, "contentDetails.regionRestriction.allowed"):
        allowedCountries = video["contentDetails"]["regionRestriction"]["allowed"]
        if allowedCountries != None and not "US" in allowedCountries:
            return True
    if DictionaryHas(video, "contentDetails.regionRestriction.blocked"):
        blockedCountries = video["contentDetails"]["regionRestriction"]["blocked"]
        if blockedCountries != None and "US" in blockedCountries:
            return True
    return False
def TraceVideo(videoId):
    musicUrl = f"https://music.youtube.com/watch?v={videoId}"
    marker = "ytcfg.set("
    request = urllib.request.Request(musicUrl, headers={ "User-Agent": UserAgent })
    with urllib.request.urlopen(request) as responseFile: response = responseFile.read().decode("utf-8")
    startIndex = 0
    markerIndex = response.find(marker, startIndex)
    startIndex = markerIndex + len(marker)
    while markerIndex != -1:
        parenthesisDepth = 1
        ytcfgJson = None
        for i in range(markerIndex + len(marker), len(response)):
            if response[i] == "(":
                parenthesisDepth += 1
            elif response[i] == ")":
                parenthesisDepth -= 1
            if parenthesisDepth == 0:
                ytcfgJson = response[markerIndex + len(marker):i]
                startIndex = i + 1
                break
        if ytcfgJson == None:
            continue
        ytcfg = json.loads(ytcfgJson)
        if not DictionaryHas(ytcfg, "INITIAL_ENDPOINT"):
            continue
        initialEndpoint = json.loads(ytcfg["INITIAL_ENDPOINT"])
        if not DictionaryHas(initialEndpoint, "watchEndpoint.videoId"):
            continue
        tracedVideoId = initialEndpoint["watchEndpoint"]["videoId"]
        if tracedVideoId == videoId:
            return None
        return tracedVideoId
    return None
def Phase3():
    global MyVideoIds, VideoInfo, TraceMinDelay, TraceMaxDelay
    print("Tracing unavailable videos to see if they were redirected...")
    
    traceNeededVideoIds = set()
    for videoId in MyVideoIds:
        if IsVideoUnavailable(VideoInfo[videoId]):
            traceNeededVideoIds.add(videoId)
    if len(traceNeededVideoIds) <= 0:
        return False
    
    i = 0
    for videoId in traceNeededVideoIds:
        print(f"Tracing unavailable video {i} of {len(traceNeededVideoIds)}...")
        i += 1
        tracedVideoId = TraceVideo(videoId)
        RandomSleep(TraceMinDelay, TraceMaxDelay)
        MyVideoIds.remove(videoId)
        if tracedVideoId != None:
            MyVideoIds.add(tracedVideoId)
    return True

# Phase 4 - Converting Video Info To Song Database And Saving
def GetBestThumbnail(video):
    bestThumbnailSize = 0
    bestThumbnailUrl = None
    for thumbnail in video["snippet"]["thumbnails"].values():
        if thumbnail == None:
            continue
        if thumbnail["width"] * thumbnail["height"] > bestThumbnailSize:
            bestThumbnailSize = thumbnail["width"] * thumbnail["height"]
            bestThumbnailUrl = thumbnail["url"]
    return bestThumbnailUrl
def ConvertVideoToSong(videoId, video):
    srcUrl = f"https://www.youtube.com/watch?v={videoId}"
    src = None
    thumbnailUrl = GetBestThumbnail(video)
    thumbnail = None
    title = None
    album = None
    artists = None
    releaseDate = None

    description = video["snippet"]["description"]
    descriptionLines = [line.strip() for line in description.replace("\r\n", "\n").split("\n") if len(line) > 0]
    if len(descriptionLines) > 0 and descriptionLines[-1] == "Auto-generated by YouTube.":
        if descriptionLines[0].startswith("Provided to YouTube by "):
            descriptionLines = descriptionLines[1:]
        if len(descriptionLines) >= 1:
            titleArtistsSplit = descriptionLines[0].split(" · ")
            if len(titleArtistsSplit) >= 2:
                title = titleArtistsSplit[0]
                artists = titleArtistsSplit[1:]
        if len(descriptionLines) >= 2:
            album = descriptionLines[1]
        for line in descriptionLines[2:]:
            if line.startswith("Released on: "):
                line = line[len("Released on: "):]
                releaseDate = int(datetime.strptime(line, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())
                break

    if title == None:
        title = video["snippet"]["title"]
    if album == None:
        album = ""
    if artists == None:
        artistRaw = video["snippet"]["channelTitle"]
        artists = [ artistRaw[0:-len(" - Topic")] if artistRaw.endswith(" - Topic") else artistRaw ]
    if releaseDate == None:
        rawReleaseDate = video["snippet"]["publishedAt"]
        releaseDate = int(datetime.strptime(rawReleaseDate, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp())

    return { "srcUrl": srcUrl, "src": src, "thumbnailUrl": thumbnailUrl, "thumbnail": thumbnail, "title": title, "album": album, "artists": artists, "releaseDate": releaseDate }
def Phase4():
    global MyVideoIds, VideoInfo, Database
    print("Extracting song info from video info...")
    
    for videoId in MyVideoIds:
        if not videoId in Database:
            Database[videoId] = ConvertVideoToSong(videoId, VideoInfo[videoId])
        else:
            print(f"Warning: Song {videoId} was already in the database.")
    SaveDatabase()

# Module 2 - Download Each Song's Thumbnail
# Downloads the thumbnail for any song in the Database which does not already have a thumbnail in database/thumbnails
# Regardless of weather a thumbnail is needed it updates song.thumbnail to reflect the client url of the thumbnail
# Does not depend on previous steps and runs independently
def DownloadThumbnail(songId, song, thumbnailsDir):
    thumbnailUrl = song["thumbnailUrl"]
    thumbnailUrlPath = urllib.parse.urlparse(thumbnailUrl).path
    thumbnailFileExt = os.path.splitext(os.path.basename(thumbnailUrlPath))[1]
    thumbnailFilePath = os.path.join(thumbnailsDir, songId + thumbnailFileExt)
    request = urllib.request.Request(thumbnailUrl, headers={ "User-Agent": UserAgent })
    with urllib.request.urlopen(request) as responseFile: response = responseFile.read()
    with open(thumbnailFilePath, "wb") as thumbnailFile: thumbnailFile.write(response)
    song["thumbnail"] = PathToClientUrl(thumbnailFilePath)
def Module2():
    global Database, ThumbnailDownloadMinDelay, ThumbnailDownloadMaxDelay
    LoadDatabase(echo=True)

    print("Downloading thumbnails for songs without a thumbnail...")
    ChangeDir()
    thumbnailsDir = os.path.abspath("database/thumbnails")
    os.makedirs(thumbnailsDir, exist_ok=True)

    existingFiles = {}
    for fileName in os.listdir(thumbnailsDir):
        filePath = os.path.join(thumbnailsDir, fileName)
        songId = os.path.splitext(fileName)[0]
        if not songId in Database:
            print(f"Warning: Thumbnail exists for song {songId} at {filePath} but that song isn't in the database.")
        existingFiles[songId] = filePath

    thumbnailNeededSongIds = set()
    for songId in Database:
        if songId in existingFiles:
            Database[songId]["thumbnail"] = PathToClientUrl(existingFiles[songId])
            continue
        thumbnailNeededSongIds.add(songId)

    i = 0
    for songId in thumbnailNeededSongIds:
        print(f"Downloading thumbnail for song {i} of {len(thumbnailNeededSongIds)}...")
        i += 1
        DownloadThumbnail(songId, Database[songId], thumbnailsDir)
        RandomSleep(ThumbnailDownloadMinDelay, ThumbnailDownloadMaxDelay)
    SaveDatabase(echo=True)

# Module 3 - Download Each Song's Audio Stream
# Downloads the audio stream for any song in the Database which does not already have an audio stream in database/songs
# Regardless of weather an audio stream is needed it updates song.src to reflect the client url of the audio stream
# Does not depend on previous steps and runs independently
# If an audio stream can't be downloaded normally tries again with cookies enabled
def DownloadAudioStream(songId, song, audioStreamsDir):
    global SongDownloadRateLimit, SegmentDownloadMinDelay, SegmentDownloadMaxDelay
    ytdlpOptions = {
        "format": "bestaudio",
        "outtmpl": os.path.join(audioStreamsDir, f"{songId}.%(ext)s"),
        "nooverwrites": True,
        "force_overwrites": False,
        "continuedl": False,
        "abort_on_error": True,
        "ignoreerrors": False,
        "abort_on_unavailable_fragments": True,
        "noplaylist": True,
        "retries": 0,
        "fragment_retries": 0,
        "skip_unavailable_fragments": False,
        "sleep_interval": SegmentDownloadMinDelay,
        "max_sleep_interval": SegmentDownloadMaxDelay,
        "ratelimit": SongDownloadRateLimit,
    }
    targetUrls = [ song["srcUrl"] ]
    downloadFailed = False
    with yt_dlp.YoutubeDL(ytdlpOptions) as ytdlp:
        try:
            ytdlp.download(targetUrls)
        except:
            downloadFailed = True
    if downloadFailed:
        ytdlpOptions["cookiesfrombrowser"] = ("firefox",)
        with yt_dlp.YoutubeDL(ytdlpOptions) as ytdlp:
            ytdlp.download(targetUrls)
    for fileName in os.listdir(audioStreamsDir):
        filePath = os.path.abspath(os.path.join(audioStreamsDir, fileName))
        fileNameNoExt = os.path.splitext(fileName)[0]
        if fileNameNoExt == songId:
            song["src"] = PathToClientUrl(filePath)
            return
    raise Exception(f"Downloaded audio stream for song {songId} but the output file from ytdlp could not be located.")
def Module3():
    global Database, AudioStreamDownloadMinDelay, AudioStreamDownloadMaxDelay
    LoadDatabase(echo=True)
    
    print("Downloading audio stream for songs without an audio stream...")
    ChangeDir()
    audioStreamsDir = os.path.abspath("database/songs")
    os.makedirs(audioStreamsDir, exist_ok=True)

    existingFiles = {}
    for fileName in os.listdir(audioStreamsDir):
        filePath = os.path.join(audioStreamsDir, fileName)
        songId = os.path.splitext(fileName)[0]
        if not songId in Database:
            print(f"Warning: Audio stream exists for song {songId} at {filePath} but that song isn't in the database.")
        existingFiles[songId] = filePath

    audioStreamNeededSongIds = set()
    for songId in Database:
        if songId in existingFiles:
            Database[songId]["src"] = PathToClientUrl(existingFiles[songId])
            continue
        audioStreamNeededSongIds.add(songId)

    i = 0
    for songId in audioStreamNeededSongIds:
        print(f"Downloading audio stream for song {i} of {len(audioStreamNeededSongIds)}...")
        i += 1
        DownloadAudioStream(songId, Database[songId], audioStreamsDir)
        RandomSleep(AudioStreamDownloadMinDelay, AudioStreamDownloadMaxDelay)
    SaveDatabase(echo=True)

# Run extractor with error checking
try:
    # Fix new song data overwritting old songs in database
    # Only new songs should be added TODO
    """
    Phase0()

    Phase1()

    while True:
        didSomething = False
        if Phase2():
            didSomething = True
        if Phase3():
            didSomething = True
        if not didSomething:
            break

    Phase4()
    """

    Module2()

    Module3()

    print("All tasks completed successfully")
    sys.exit(0)
except KeyboardInterrupt:
    sys.exit(0)
except:
    raise