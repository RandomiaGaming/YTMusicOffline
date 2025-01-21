using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public sealed class VideoRelocation
{
    public string OriginalVideoID = null;
    public string NewVideoID = null;
}
public sealed class Ghosts
{
    public List<string> RemovedVideoIDs = new List<string>();
    public List<string> UnavailableVideoIDs = new List<string>();
}
public sealed class Song
{

}
public static class YTDataDownloader
{
    public static void Run(string clientID, string clientSecret, string databaseFolderPath)
    {
        YouTubeService ytService = null;

        // Load playlists from json file or YouTube API if file does not exist
        List<Playlist> playlists = new List<Playlist>();
        {
            string playlistsJsonFilePath = Path.Combine(databaseFolderPath, "Playlists.json");
            if (File.Exists(playlistsJsonFilePath))
            {
                Console.WriteLine($"Loading playlists from \"{playlistsJsonFilePath}\"...");
                playlists = Load<List<Playlist>>(playlistsJsonFilePath);
            }
            else
            {
                if (ytService == null)
                {
                    Console.WriteLine("Authenticating with YouTube API...");
                    ytService = AuthYTService(clientID, clientSecret, false);
                }
                Console.WriteLine("Enumerating playlists...");
                playlists = EnumMyPlaylists(ytService, false, true);
                Console.WriteLine($"Saving playlists to \"{playlistsJsonFilePath}\"...");
                Save(playlists, playlistsJsonFilePath);
            }
        }

        // Load playlist items from json file or YouTube API if file does not exist
        List<PlaylistItem> playlistItems = new List<PlaylistItem>();
        {
            string playlistItemsJsonFilePath = Path.Combine(databaseFolderPath, "PlaylistItems.json");
            if (File.Exists(playlistItemsJsonFilePath))
            {
                Console.WriteLine($"Loading playlistItems from \"{playlistItemsJsonFilePath}\"...");
                playlistItems = Load<List<PlaylistItem>>(playlistItemsJsonFilePath);
            }
            else
            {
                if (ytService == null)
                {
                    Console.WriteLine("Authenticating with YouTube API...");
                    ytService = AuthYTService(clientID, clientSecret, false);
                }
                Console.WriteLine("Enumerating playlistItems...");
                playlistItems = new List<PlaylistItem>();
                for (int i = 0; i < playlists.Count; i++)
                {
                    List<PlaylistItem> newPlaylistItems = EnumPlaylistItems(ytService, playlists[i].Id);
                    playlistItems.AddRange(newPlaylistItems);
                }
                Console.WriteLine($"Saving playlistItems to \"{playlistItemsJsonFilePath}\"...");
                Save(playlistItems, playlistItemsJsonFilePath);
            }
        }

        List<Video> videos = new List<Video>();
        List<VideoRelocation> videoRelocations = new List<VideoRelocation>();
        Ghosts ghosts = new Ghosts();
        {
            // Load videos from json file if file exists
            string videosJsonFilePath = Path.Combine(databaseFolderPath, "Videos.json");
            if (File.Exists(videosJsonFilePath))
            {
                Console.WriteLine($"Loading videos from \"{videosJsonFilePath}\"...");
                videos = Load<List<Video>>(videosJsonFilePath);
            }

            // Load video relocations from json file if file exists
            string videoRelocationsJsonFilePath = Path.Combine(databaseFolderPath, "VideoRelocations.json");
            if (File.Exists(videoRelocationsJsonFilePath))
            {
                Console.WriteLine($"Loading videoRelocations from \"{videoRelocationsJsonFilePath}\"...");
                videoRelocations = Load<List<VideoRelocation>>(videoRelocationsJsonFilePath);
            }

            // Load ghosts from json file if file exists
            string ghostsJsonFilePath = Path.Combine(databaseFolderPath, "Ghosts.json");
            if (File.Exists(ghostsJsonFilePath))
            {
                Console.WriteLine($"Loading ghosts from \"{ghostsJsonFilePath}\"...");
                ghosts = Load<Ghosts>(ghostsJsonFilePath);
            }

            // Run this loop until didSomething is false
            while (true)
            {
                bool didSomething = false;

                // Compute a list of video IDs we need videos for
                List<string> videoNeededVideoIDs = new List<string>();
                foreach (PlaylistItem playlistItem in playlistItems)
                {
                    videoNeededVideoIDs.Add(playlistItem.ContentDetails.VideoId);
                }
                foreach (VideoRelocation videoRelocation in videoRelocations)
                {
                    videoNeededVideoIDs.Add(videoRelocation.NewVideoID);
                }
                // Then remove duplicates and the ones we already did
                videoNeededVideoIDs = videoNeededVideoIDs.Distinct().ToList();
                foreach (Video video in videos)
                {
                    videoNeededVideoIDs.Remove(video.Id);
                }
                foreach (string removedVideoID in ghosts.RemovedVideoIDs)
                {
                    videoNeededVideoIDs.Remove(removedVideoID);
                }
                // Finally download the ones left in the todo list and save our progress if we made any
                if (videoNeededVideoIDs.Count > 0)
                {
                    if (ytService == null)
                    {
                        Console.WriteLine("Authenticating with YouTube API...");
                        ytService = AuthYTService(clientID, clientSecret, false);
                    }
                    List<Video> newVideos = EnumVideos(ytService, videoNeededVideoIDs);
                    videos.AddRange(newVideos);
                    foreach (Video newVideo in newVideos)
                    {
                        videoNeededVideoIDs.Remove(newVideo.Id);
                    }
                    ghosts.RemovedVideoIDs.AddRange(videoNeededVideoIDs);
                    Console.WriteLine($"Saving videos to \"{videosJsonFilePath}\"...");
                    Save(videos, videosJsonFilePath);
                    Console.WriteLine($"Saving ghosts to \"{ghostsJsonFilePath}\"...");
                    Save(ghosts, ghostsJsonFilePath);
                    didSomething = true;
                }

                // Compute a list of video IDs we need relocations for
                List<string> relocationNeededVideoIDs = new List<string>();
                foreach (Video video in videos)
                {
                    if ((video.ContentDetails.RegionRestriction != null
                        && video.ContentDetails.RegionRestriction.Blocked != null
                        && video.ContentDetails.RegionRestriction.Blocked.Contains("US"))
                        || (video.Status.PrivacyStatus != "public"
                        && video.Status.PrivacyStatus != "unlisted"))
                    {
                        relocationNeededVideoIDs.Add(video.Id);
                    }
                }
                // Then remove duplicates and the ones we already did
                relocationNeededVideoIDs = relocationNeededVideoIDs.Distinct().ToList();
                foreach (VideoRelocation videoRelocation in videoRelocations)
                {
                    relocationNeededVideoIDs.Remove(videoRelocation.OriginalVideoID);
                }
                foreach (string unavailableVideoID in ghosts.UnavailableVideoIDs)
                {
                    relocationNeededVideoIDs.Remove(unavailableVideoID);
                }
                // Finally download the ones left in the todo list and save our progress if we made any
                if (relocationNeededVideoIDs.Count > 0)
                {
                    foreach (string originalVideoID in relocationNeededVideoIDs)
                    {
                        string newVideoID = GetRelocatedVideoID(originalVideoID);
                        if (originalVideoID != newVideoID)
                        {
                            VideoRelocation newVideoRelocation = new VideoRelocation();
                            newVideoRelocation.OriginalVideoID = originalVideoID;
                            newVideoRelocation.NewVideoID = newVideoID;
                            videoRelocations.Add(newVideoRelocation);
                        }
                        else
                        {
                            ghosts.UnavailableVideoIDs.Add(originalVideoID);
                        }
                    }
                    Console.WriteLine($"Saving videoRelocations to \"{videoRelocationsJsonFilePath}\"...");
                    Save(videoRelocations, videoRelocationsJsonFilePath);
                    Console.WriteLine($"Saving ghosts to \"{ghostsJsonFilePath}\"...");
                    Save(ghosts, ghostsJsonFilePath);
                    didSomething = true;
                }

                if (!didSomething)
                {
                    break;
                }
            }
        }

        // Load songs from json file or by parsing videos if file does not exist
        List<Song> songs = new List<Song>();
        {
            string songsJsonFilePath = Path.Combine(databaseFolderPath, "Songs.json");
            if (File.Exists(songsJsonFilePath))
            {
                Console.WriteLine($"Loading songs from \"{songsJsonFilePath}\"...");
                songs = Load<List<Song>>(songsJsonFilePath);
            }
            else
            {
                Console.WriteLine("Parsing songs...");
                foreach (Video video in videos)
                {
                    Song newSong = ParseSong(video);
                    songs.Add(newSong);
                }
                Console.WriteLine($"Saving songs to \"{songsJsonFilePath}\"...");
                Save(songs, songsJsonFilePath);
            }
        }
    }

    // Authenticates with the YouTube API and returns a YouTubeService
    // API COST: Free I think. Maybe 1?
    public static YouTubeService AuthYTService(string clientID, string clientSecret, bool clearCache)
    {
        if (clearCache)
        {
            IDataStore dataStore = new FileDataStore(GoogleWebAuthorizationBroker.Folder);
            dataStore.ClearAsync().Wait();
        }
        ClientSecrets clientSecrets = new ClientSecrets();
        clientSecrets.ClientId = clientID;
        clientSecrets.ClientSecret = clientSecret;
        Task<UserCredential> authorize = GoogleWebAuthorizationBroker.AuthorizeAsync(clientSecrets, new string[1] { YouTubeService.Scope.YoutubeReadonly }, "user", CancellationToken.None, null, null);
        authorize.Wait();
        UserCredential userCredential = authorize.Result;
        BaseClientService.Initializer initializer = new BaseClientService.Initializer();
        initializer.HttpClientInitializer = userCredential;
        YouTubeService youtubeService = new YouTubeService(initializer);
        return youtubeService;
    }

    // Enumerates the metadata of all playlists on the current users account
    // API COST: ceil(numOfPlaylists / 50) "Plus 1 if includeLikesList or includeMusicLikes is true"
    public static List<Playlist> EnumMyPlaylists(YouTubeService ytService, bool includeLikesList, bool includeLikedMusic)
    {
        // NOTE:
        // The Watch Later (WL) playlist cannot be enumerated with the API.
        // Sadly it always returns an empty playlist.

        // Prepare output list
        List<Playlist> playlists = new List<Playlist>();

        // Prepare for first request
        PlaylistsResource.ListRequest request = ytService.Playlists.List("contentDetails,id,localizations,player,snippet,status");
        request.Mine = true;
        request.MaxResults = 50; // 50 is the max results allowed per query
        request.PageToken = null;
        PlaylistListResponse response = null;

        do
        {
            // Execute the API request
            response = request.Execute();

            // Parse the results
            for (int i = 0; i < response.Items.Count; i++)
            {
                playlists.Add(response.Items[i]);
            }

            // Prepare for the next itteration
            request.PageToken = response.NextPageToken;
        }
        while (response.NextPageToken != null && response.NextPageToken != "");

        if (includeLikesList || includeLikedMusic)
        {
            // Prepare the request
            request.Mine = null;
            request.PageToken = null;
            if (includeLikesList && includeLikedMusic)
            {
                request.Id = new string[] { "LL", "LM" };
            }
            else if (includeLikesList)
            {
                request.Id = new string[] { "LL" };
            }
            else if (includeLikedMusic)
            {
                request.Id = new string[] { "LM" };
            }
            request.MaxResults = 50; // 50 is the max results allowed per query
            request.PageToken = null;

            // Execute the API request
            response = request.Execute();

            // Parse the results
            for (int i = 0; i < response.Items.Count; i++)
            {
                playlists.Add(response.Items[i]);
            }
        }

        // Return output
        return playlists;
    }

    // Enumerates all VideoIDs in a playlist
    // API COST: ceil(numOfVideos / 50)
    public static List<PlaylistItem> EnumPlaylistItems(YouTubeService ytService, string playlistID)
    {
        // Prepare output list
        List<PlaylistItem> playlistItems = new List<PlaylistItem>();

        // Prepare the first request
        PlaylistItemsResource.ListRequest request = ytService.PlaylistItems.List("contentDetails,id,snippet,status");
        request.PlaylistId = playlistID;
        request.MaxResults = 50; // 50 is the max allowed per query
        request.PageToken = null;
        PlaylistItemListResponse response = null;

        do
        {
            // Execute the API request
            response = request.Execute();

            // Parse the results
            for (int i = 0; i < response.Items.Count; i++)
            {
                playlistItems.Add(response.Items[i]);
            }

            // Prepare for the next itteration
            request.PageToken = response.NextPageToken;
        }
        while (response.NextPageToken != null && response.NextPageToken != "");

        // Return output
        return playlistItems;
    }

    // Enumerates the metadata of a bunch of videos by their VideoIDs
    // API COST: ceil(numOfVideos / 50)
    public static List<Video> EnumVideos(YouTubeService ytService, List<string> videoIDs)
    {
        // Prepare output list and current index
        int index = 0;
        List<Video> output = new List<Video>();

        // Prepare the first request
        VideosResource.ListRequest request = ytService.Videos.List("contentDetails,id,liveStreamingDetails,localizations,paidProductPlacementDetails,player,recordingDetails,snippet,statistics,status,topicDetails");
        request.MaxResults = 50; // 50 is the max allowed per query
        request.PageToken = null;
        VideoListResponse response = null;

        do
        {
            // Prepare this API request
            List<string> nextVideoIDs = new List<string>();
            for (int i = 0; (i < request.MaxResults) && (index < videoIDs.Count); i++)
            {
                nextVideoIDs.Add(videoIDs[index]);
                index++;
            }
            request.Id = nextVideoIDs;

            // Execute the API request
            response = request.Execute();

            // Parse the results
            for (int i = 0; i < response.Items.Count; i++)
            {
                output.Add(response.Items[i]);
            }
        }
        while (index < videoIDs.Count);

        // Return output
        return output;
    }

    // For youtube music songs which have been relocated returns the new VideoID
    // For normal videos simply returns originalVideoID
    // API COST: Free since this method uses webscraping (don't get banned though)
    public static string GetRelocatedVideoID(string videoID)
    {
        // Don't forget to update your user agent every once in awhile
        // You can dump the user agent in chrome by searching google for "What is my user agent"
        // or running navigator.userAgent in the Chrome dev tools console
        string userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
        string musicUrl = $"https://music.youtube.com/watch?v={videoID}";
        HttpClient client = new HttpClient();
        client.DefaultRequestHeaders.Add("User-Agent", userAgent);
        string html = client.GetStringAsync(musicUrl).Result;
        int ytcfgsetIndex = html.IndexOf("ytcfg.set");
        string json1 = ReadLayer(html, ytcfgsetIndex + "ytcfg.set".Length + 1);
        JObject jobj1 = JObject.Parse(json1);
        JToken initialEndpoint = jobj1.GetValue("INITIAL_ENDPOINT");
        string json2 = initialEndpoint.Value<string>();
        JObject jobj2 = JObject.Parse(json2);
        JToken watchEndpoint = jobj2.GetValue("watchEndpoint");
        JToken relocatedVideoID = watchEndpoint.Value<JObject>().GetValue("videoId");
        return relocatedVideoID.Value<string>();
    }
    // Given a string like "Super Long (string [with {nested \"quotes\"}]) and shi"
    // It can successfully pull out one layer of the nesting at a time.
    // For example if startIndex pointed to the first open bracket "["
    // it would return "with {nested \"quotes\"}"
    public static string ReadLayer(string text, int index)
    {
        // 0 means in parenthesis ()
        // 1 means in brackets []
        // 2 means in curly brackets {}
        // 3 means in single quotes ''
        // 4 means in double quotes ""
        // 5 means in back ticks ``
        // 6 means in an escape sequence \

        if (text is null || text == "")
        {
            throw new Exception("text cannot be null or empty.");
        }
        if (index < 0 || index >= text.Length)
        {
            throw new Exception("index must be within the bounds of the string.");
        }
        char firstChar = text[index];
        if (!"([{\'\"`".Contains(text[index]))
        {
            throw new Exception("index must point to the beginning of a section.");
        }

        List<byte> contextStack = new List<byte>();
        int startIndex = index;
        while (true)
        {
            if (index >= text.Length)
            {
                throw new Exception("Unexpected end to string encountered.");
            }

            if (contextStack.Count > 0 && contextStack[contextStack.Count - 1] == 6)
            {
                contextStack.RemoveAt(contextStack.Count - 1);
                continue;
            }

            char c = text[index];
            switch (c)
            {
                case '(':
                    contextStack.Add(0);
                    break;
                case '[':
                    contextStack.Add(1);
                    break;
                case '{':
                    contextStack.Add(2);
                    break;
                case ')':
                    if (contextStack[contextStack.Count - 1] == 0)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return text.Substring(startIndex, (index - startIndex) + 1);
                        }
                    }
                    else
                    {
                        throw new Exception("Closing parenthesis was unexpected at this time.");
                    }
                    break;
                case ']':
                    if (contextStack[contextStack.Count - 1] == 1)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return text.Substring(startIndex, (index - startIndex) + 1);
                        }
                    }
                    else
                    {
                        throw new Exception("Closing bracket was unexpected at this time.");
                    }
                    break;
                case '}':
                    if (contextStack[contextStack.Count - 1] == 2)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return text.Substring(startIndex, (index - startIndex) + 1);
                        }
                    }
                    else
                    {
                        throw new Exception("Closing curly bracket was unexpected at this time.");
                    }
                    break;
                case '\'':
                    if (contextStack[contextStack.Count - 1] == 3)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return text.Substring(startIndex, (index - startIndex) + 1);
                        }
                    }
                    else
                    {
                        contextStack.Add(3);
                    }
                    break;
                case '\"':
                    if (contextStack[contextStack.Count - 1] == 4)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return text.Substring(startIndex, (index - startIndex) + 1);
                        }
                    }
                    else
                    {
                        contextStack.Add(4);
                    }
                    break;
                case '`':
                    if (contextStack[contextStack.Count - 1] == 5)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return text.Substring(startIndex, (index - startIndex) + 1);
                        }
                    }
                    else
                    {
                        contextStack.Add(5);
                    }
                    break;
                case '\\':
                    contextStack.Add(6);
                    break;
            }

            index++;
        }
    }

    // Parses song data from an auto-generated YouTube music description
    // API COST: Free since it parses the description already downloaded previously
    public static Song ParseSong(Video video)
    {

    }

    public static void Save<T>(T obj, string jsonFilePath)
    {
        string json = JsonConvert.SerializeObject(obj, Formatting.Indented);
        File.WriteAllText(jsonFilePath, json);
    }
    public static T Load<T>(string jsonFilePath)
    {
        string json = File.ReadAllText(jsonFilePath);
        return JsonConvert.DeserializeObject<T>(json);
    }
}