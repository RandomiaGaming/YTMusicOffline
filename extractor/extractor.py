# User Settings


# Import builtins (part of python)
import json
import sys
import os
import subprocess

# Import pip dependencies
try:
    import googleapiclient
except:
    print(f"ERROR: Dependency google-api-python-client not found. Would you like to install it now? (y/n)")
    choice = input().lower()
    if choice == "y" or choice == "yes":
        print()            
        print(f"> python -m pip install google-api-python-client")
        errorCode = subprocess.run("python -m pip install google-api-python-client", env=os.environ.copy()).returncode
        print()
        if errorCode != 0:
           print(f"ERROR: python -m pip install google-api-python-client failed with error code {errorCode}.")
           sys.exit(1)
        import googleapiclient
    else:
        print(f"Execution cannot continue without required dependency google-api-python-client.")
        sys.exit(1)
try:
    import google_auth_oauthlib
except:
    print(f"ERROR: Dependency google-auth-oauthlib not found. Would you like to install it now? (y/n)")
    choice = input().lower()
    if choice == "y" or choice == "yes":
        print()            
        print(f"> python -m pip install google-auth-oauthlib")
        errorCode = subprocess.run("python -m pip install google-auth-oauthlib", env=os.environ.copy()).returncode
        print()
        if errorCode != 0:
           print(f"ERROR: python -m pip install google-auth-oauthlib failed with error code {errorCode}.")
           sys.exit(1)
        import google_auth_oauthlib
    else:
        print(f"Execution cannot continue without required dependency google-auth-oauthlib.")
        sys.exit(1)
try:
    import google_auth_httplib2
except:
    print(f"ERROR: Dependency google-auth-httplib2 not found. Would you like to install it now? (y/n)")
    choice = input().lower()
    if choice == "y" or choice == "yes":
        print()            
        print(f"> python -m pip install google-auth-httplib2")
        errorCode = subprocess.run("python -m pip install google-auth-httplib2", env=os.environ.copy()).returncode
        print()
        if errorCode != 0:
           print(f"ERROR: python -m pip install google-auth-httplib2 failed with error code {errorCode}.")
           sys.exit(1)
        import google_auth_httplib2
    else:
        print(f"Execution cannot continue without required dependency google-auth-httplib2.")
        sys.exit(1)

# Import submodules of pip packages not previously imported
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.errors
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# This function authenticates with the YouTube API and returns a YouTube API object.
# It also caches your token in extractor/user_secrets.json for later use.
def AuthApi():
    credentials = None

    userSecretsPath = "extractor/user_secrets.json"
    clientSecretsPath = "extractor/client_secrets.json"

    if os.path.exists(userSecretsPath):
        credentials = Credentials.from_authorized_user_file(userSecretsPath)
        if credentials.expired:
            credentials.refresh(Request())
        if not credentials.valid:
            credentials = None

    if credentials == None:
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
        flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(clientSecretsPath, [ "https://www.googleapis.com/auth/youtube.readonly" ])
        credentials = flow.run_local_server(port=0)

    userSecretsJson = credentials.to_json()
    with open(userSecretsPath, "w") as userSecretsFile: userSecretsFile.write(userSecretsJson)

    return googleapiclient.discovery.build("youtube", "v3", credentials=credentials)

def EnumMyPlaylists(youtubeApi, includeLikes=False, includeLikedMusic=False):
    output = []

    if includeLikedMusic:
        output.append("LM")
    if includeLikes:
        output.append("LL")

    request = youtubeApi.playlists().list(
        part="id",
        mine=True,
        maxResults=50
    )
    response = request.execute()
    for item in response.get("items", []):
        output.append(item["id"])

    while "nextPageToken" in response:
        request = youtubeApi.playlists().list(
            part="id",
            mine=True,
            maxResults=50,
            pageToken=response["nextPageToken"]
        )
        response = request.execute()
        for item in response.get("items", []):
            output.append(item["id"])
    
    return output

def EnumPlaylistContents(youtubeApi, playlistId):
    output = []

    request = youtubeApi.playlistItems().list(
        part="snippet",
        playlistId=playlistId,
        maxResults=50
    )
    response = request.execute()
    for item in response.get("items", []):
        output.append(item["snippet"]["resourceId"]["videoId"])

    while "nextPageToken" in response:
        request = youtubeApi.playlistItems().list(
            part="snippet",
            playlistId=playlistId,
            maxResults=50,
            pageToken=response["nextPageToken"]
        )
        response = request.execute()
        for item in response.get("items", []):
            output.append(item["snippet"]["resourceId"]["videoId"])
    
    return output

def LoadJsonFile(filePath, defaultJsonObject=None):
    if defaultJsonObject != None and not os.path.exists(filePath):
        return defaultJsonObject
    with open(filePath, "r", encoding="utf-8") as jsonFile:
        return json.load(jsonFile)

def SaveJsonFile(jsonObject, filePath):
    with open(filePath, "w", encoding="utf-8") as jsonFile:
        json.dump(jsonObject, jsonFile, indent=4, ensure_ascii=True)

SongDatabase = None
VideoDatabase = None
VideoAnomalyDatabase = None
def LoadDatabases():
    global SongDatabase
    global VideoDatabase
    global VideoAnomalyDatabase

    if SongDatabase != None or VideoDatabase != None or VideoAnomalyDatabase != None:
        raise Exception("Databases have already been loaded. Refusing to overwrite and lose data.")
    
    database = LoadJsonFile("database/database.json", {})
    videoDatabase = LoadJsonFile("database/video_database.json", {})
    videoAnomalyDatabase = LoadJsonFile("database/video_anomaly_database.json", { "RemovedVideoIds": [], "UnavailableVideoIds": [], "RelocatedVideoIds": {} })
    videoAnomalyDatabase["RemovedVideoIds"] = set(videoAnomalyDatabase["RemovedVideoIds"])
    videoAnomalyDatabase["UnavailableVideoIds"] = set(videoAnomalyDatabase["UnavailableVideoIds"])

    videoInfoNeeded = []
    for videoId in myVideos:
        if not videoId in videoDatabase:
            videoInfoNeeded.append(videoId)
    
    GetVideoInfo(videoDatabase, videoInfoNeeded)

def SaveDatabases():
    global SongDatabase
    global VideoDatabase
    global VideoAnomalyDatabase

    if SongDatabase == None or VideoDatabase == None or VideoAnomalyDatabase == None:
        raise Exception("Some databases haven't been loaded. Refusing to overwrite on disk copies and lose data.")

    VideoAnomalyDatabaseFormatted = VideoAnomalyDatabase
    VideoAnomalyDatabaseFormatted["RemovedVideoIds"] = list(VideoAnomalyDatabaseFormatted["RemovedVideoIds"])
    VideoAnomalyDatabaseFormatted["UnavailableVideoIds"] = list(VideoAnomalyDatabaseFormatted["UnavailableVideoIds"])
    SaveJsonFile(SongDatabase, "database/database.json")
    SaveJsonFile(VideoDatabase, "database/video_database.json")
    SaveJsonFile(VideoAnomalyDatabaseFormatted, "database/video_anomaly_database.json")

def GetVideoInfo(videoDatabase, videoIds):


# Run extractor with error checking
try:
    extractorDir = os.path.dirname(os.path.abspath(sys.argv[0]))
    ytMusicOfflineDir = os.path.dirname(extractorDir)
    os.chdir(ytMusicOfflineDir)

    print("Authenticating with YouTube API...")
    youtubeApi = AuthApi()

    print("Gathering your liked songs and songs from your playlists...")
    myPlaylists = EnumMyPlaylists(youtubeApi, includeLikedMusic=True)
    myPlaylistContents = []
    for i in range(len(myPlaylists)):
        print(f"Fetching playlist contents {i} of {len(myPlaylists)}")
        myPlaylistContents.append(EnumPlaylistContents(youtubeApi, myPlaylists[i]))
    myVideos = list(set(item for sublist in myPlaylistContents for item in sublist))

    print("Gathering video info about videos not yet in the video database...")
    database = LoadJsonFile("database/database.json", {})
    videoDatabase = LoadJsonFile("database/video_database.json", {})
    videoAnomalyDatabase = LoadJsonFile("database/video_anomaly_database.json", { "RemovedVideoIds": [], "UnavailableVideoIds": [], "RelocatedVideoIds": {} })
    videoAnomalyDatabase["RemovedVideoIds"] = set(videoAnomalyDatabase["RemovedVideoIds"])
    videoAnomalyDatabase["UnavailableVideoIds"] = set(videoAnomalyDatabase["UnavailableVideoIds"])

    videoInfoNeeded = []
    for videoId in myVideos:
        if not videoId in videoDatabase:
            videoInfoNeeded.append(videoId)
    
    GetVideoInfo(videoDatabase, videoInfoNeeded)

    videoAnomalyDatabase["RemovedVideoIds"] = list(videoAnomalyDatabase["RemovedVideoIds"])
    videoAnomalyDatabase["UnavailableVideoIds"] = list(videoAnomalyDatabase["UnavailableVideoIds"])
    SaveJsonFile(database, "database/database2.json")
    SaveJsonFile(videoDatabase, "database/video_database.json")
    SaveJsonFile(videoAnomalyDatabase, "database/video_anomaly_database.json")

    # Compare with local db
    # Get info for new video ids never seen before

except KeyboardInterrupt:
    sys.exit(0)
except:
    raise