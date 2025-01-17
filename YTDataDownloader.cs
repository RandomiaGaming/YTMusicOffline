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

public sealed class AltVideoIDPair
{
    public string BlockedPrimaryVideoID;
    public string UnblockedAlternateVideoID;
}
public static class YTDataDownloader
{
    public static void Run(string clientID, string clientSecret, string playlistsJsonFilePath, string playlistItemsJsonFilePath, string videosJsonFilePath, string altVideoIDPairsJsonFilePath)
    {
        YouTubeService ytService = null;

        List<Playlist> playlists;
        if (!File.Exists(playlistItemsJsonFilePath))
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
        else
        {
            Console.WriteLine($"Loading playlists from \"{playlistsJsonFilePath}\"...");
            playlists = Load<List<Playlist>>(playlistsJsonFilePath);
        }

        List<PlaylistItem> playlistItems;
        if (!File.Exists(playlistItemsJsonFilePath))
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
                Console.WriteLine($"Progress {i + 1}/{playlists.Count}...");
                playlistItems.AddRange(EnumPlaylistItems(ytService, playlists[i].Id));
            }
            Console.WriteLine($"Saving playlistItems to \"{playlistItemsJsonFilePath}\"...");
            Save(playlistItems, playlistItemsJsonFilePath);
        }
        else
        {
            Console.WriteLine($"Loading playlistItems from \"{playlistItemsJsonFilePath}\"...");
            playlistItems = Load<List<PlaylistItem>>(playlistItemsJsonFilePath);
        }

        List<Video> videos;
        if (!File.Exists(videosJsonFilePath))
        {
            if (ytService == null)
            {
                Console.WriteLine("Authenticating with YouTube API...");
                ytService = AuthYTService(clientID, clientSecret, false);
            }

            // Compute unique videoIDs...
            List<string> videoIDs = new List<string>();
            foreach (PlaylistItem playlistItem in playlistItems)
            {
                videoIDs.Add(playlistItem.ContentDetails.VideoId);
            }
            videoIDs = videoIDs.Distinct().ToList();

            Console.WriteLine("Enumerating videos...");
            videos = EnumVideos(ytService, videoIDs);
            Console.WriteLine($"Saving videos to \"{videosJsonFilePath}\"...");
            Save(videos, videosJsonFilePath);
        }
        else
        {
            Console.WriteLine($"Loading videos from \"{videosJsonFilePath}\"...");
            videos = Load<List<Video>>(videosJsonFilePath);
        }

        List<AltVideoIDPair> altVideoIDPairs;
        if (!File.Exists(altVideoIDPairsJsonFilePath))
        {
            altVideoIDPairs = new List<AltVideoIDPair>();

            foreach (Video video in videos)
            {
                if (video.ContentDetails.RegionRestriction != null
                    && video.ContentDetails.RegionRestriction.Blocked != null
                    && video.ContentDetails.RegionRestriction.Blocked.Count == 249
                    && video.Status.PrivacyStatus == "unlisted")
                {
                    string unblockedID = GetUnblockedVideoID(video.Id);
                    AltVideoIDPair newAltVideoIDPair = new AltVideoIDPair();
                    newAltVideoIDPair.BlockedPrimaryVideoID = video.Id;
                    newAltVideoIDPair.UnblockedAlternateVideoID = unblockedID;
                    altVideoIDPairs.Add(newAltVideoIDPair);
                }
            }

            Console.WriteLine($"Saving AltVideoIDPairs to \"{altVideoIDPairsJsonFilePath}\"...");
            Save(altVideoIDPairs, altVideoIDPairsJsonFilePath);
        }
        else
        {
            Console.WriteLine($"Loading AltVideoIDPairs from \"{altVideoIDPairsJsonFilePath}\"...");
            altVideoIDPairs = Load<List<AltVideoIDPair>>(altVideoIDPairsJsonFilePath);
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

    // Gets the unblocked VideoID for weird songs that are blocked in all countries
    // API COST: Free since this method uses webscraping (don't get banned though)
    public static string GetUnblockedVideoID(string originalVideoID)
    {
        // Don't forget to update your user agent every once in awhile
        // You can dump the user agent in chrome by searching google for "What is my user agent"
        // or running navigator.userAgent in the Chrome dev tools console
        string userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
        string musicUrl = $"https://music.youtube.com/watch?v={originalVideoID}";

        HttpClient client = new HttpClient();
        client.DefaultRequestHeaders.Add("User-Agent", userAgent);

        string html = client.GetStringAsync(musicUrl).Result;

        int ytcfgsetIndex = html.IndexOf("ytcfg.set");
        string json1 = ReadLayer(html, ytcfgsetIndex + "ytcfg.set".Length + 1);
        JObject jobj1 = JObject.Parse(json1);
        if (jobj1.TryGetValue("INITIAL_ENDPOINT", out JToken initialEndpoint))
        {
            string json2 = initialEndpoint.Value<string>();
            JObject jobj2 = JObject.Parse(json2);
            if (jobj2.TryGetValue("watchEndpoint", out JToken watchEndpoint))
            {
                if (watchEndpoint.Value<JObject>().TryGetValue("videoId", out JToken videoID))
                {
                    return videoID.Value<string>();
                }
            }
        }

        throw new Exception("Failed to get unblocked video id.");
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