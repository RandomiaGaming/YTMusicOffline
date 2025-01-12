using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

public static class YTDataDownloader
{
    // NOTE
    // The max amount of information we can request about a video is:
    // snippet,contentDetails,fileDetails,player,processingDetails,recordingDetails,statistics,status,suggestions,topicDetails
    // But for other people's videos the max amount is:
    // snippet,contentDetails,player,recordingDetails,statistics,status,topicDetails
    public static void Run(string clientID, string clientSecret)
    {
        Console.WriteLine("Authenticating with YouTube API...");
        YouTubeService ytService = AuthYTService(clientID, clientSecret);
        Console.WriteLine("Enumerating playlists...");
        List<PlaylistData> playlists = EnumPlaylists(ytService);
        for (int i = 0; i < playlists.Count; i++)
        {
            Console.WriteLine($"Enumerating videos in playlist {i + 1}/{playlists.Count}...");
            EnumVideos(playlists[i], ytService);
        }
        string desktopFolderPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        string outputFilePath = Path.Combine(desktopFolderPath, "YTDataDownload.json");
        Console.WriteLine($"Saving output to \"{outputFilePath}\"...");
        SaveData(playlists, outputFilePath);
    }

    // Authenticates with the youtube api and returns a youtube service
    private static YouTubeService AuthYTService(string clientID, string clientSecret, bool clearCache = false)
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

    public sealed class PlaylistData
    {
        public string PlaylistID = null;
        public string PlaylistTitle = null;
        public string PlaylistDescription = null;
        public List<VideoData> Videos = null;
        public override string ToString()
        {
            if (Videos is null)
            {
                return $"PlaylistData(\"{PlaylistID}\", \"{PlaylistTitle}\", \"{PlaylistDescription}\", null)";
            }
            return $"PlaylistData(\"{PlaylistID}\", \"{PlaylistTitle}\", \"{PlaylistDescription}\", {Videos.Count})";
        }
        public PlaylistData(string playlistID, string playlistTitle, string playlistDescription)
        {
            PlaylistID = playlistID;
            PlaylistTitle = playlistTitle;
            PlaylistDescription = playlistDescription;
        }
    }
    // Enumerates all playlists on the current users account
    // The playlist videos will be empty at this step
    private static List<PlaylistData> EnumPlaylists(YouTubeService youTubeService)
    {
        List<PlaylistData> output = new List<PlaylistData>();
        PlaylistsResource.ListRequest request = youTubeService.Playlists.List("snippet");
        request.Mine = true;
        request.MaxResults = 50; // 50 is the max results allowed per query

        request.PageToken = null;
        PlaylistListResponse response = request.Execute();
        for (int i = 0; i < response.Items.Count; i++)
        {
            output.Add(new PlaylistData(response.Items[i].Id, response.Items[i].Snippet.Title, response.Items[i].Snippet.Description));
        }

        while (response.NextPageToken != null)
        {
            request.PageToken = response.NextPageToken;
            response = request.Execute();
            for (int i = 0; i < response.Items.Count; i++)
            {
                output.Add(new PlaylistData(response.Items[i].Id, response.Items[i].Snippet.Title, response.Items[i].Snippet.Description));
            }
        }

        //output.Add(new PlaylistData("LL", "Liked Videos", ""));
        output.Add(new PlaylistData("LM", "Liked Music", ""));
        //output.Add(new PlaylistData("WL", "Watch Later", ""));
        return output;
    }

    public sealed class VideoData
    {
        public string VideoID = null;
        public string VideoTitle = null;
        public string VideoDescription = null;
        public string ChannelID = null;
        public string ChannelTitle = null;
        //release date
        public override string ToString()
        {
            return $"VideoData(\"{VideoID}\", \"{VideoTitle}\", \"{VideoDescription}\", \"{ChannelID}\", \"{ChannelTitle}\")";
        }
        public VideoData(string videoID, string videoTitle, string videoDescription, string channelID, string channelTitle)
        {
            VideoID = videoID;
            VideoTitle = videoTitle;
            VideoDescription = videoDescription;
            ChannelID = channelID;
            ChannelTitle = channelTitle;
        }
    }
    // Enumerates all videos in a playlist and populates the playlist videos list
    private static void EnumVideos(PlaylistData playlist, YouTubeService youTubeService)
    {
        playlist.Videos = new List<VideoData>();
        PlaylistItemsResource.ListRequest request = youTubeService.PlaylistItems.List("snippet");
        request.PlaylistId = playlist.PlaylistID;
        // 50 is the max allowed per query
        request.MaxResults = 50;

        request.PageToken = null;
        PlaylistItemListResponse response = request.Execute();
        for (int i = 0; i < response.Items.Count; i++)
        {
            playlist.Videos.Add(new VideoData(response.Items[i].Snippet.ResourceId.VideoId, response.Items[i].Snippet.Title, response.Items[i].Snippet.Description, response.Items[i].Snippet.VideoOwnerChannelId, response.Items[i].Snippet.VideoOwnerChannelTitle));
        }

        while (response.NextPageToken != null)
        {
            request.PageToken = response.NextPageToken;
            response = request.Execute();
            for (int i = 0; i < response.Items.Count; i++)
            {
                playlist.Videos.Add(new VideoData(response.Items[i].Snippet.ResourceId.VideoId, response.Items[i].Snippet.Title, response.Items[i].Snippet.Description, response.Items[i].Snippet.VideoOwnerChannelId, response.Items[i].Snippet.VideoOwnerChannelTitle));
            }
        }
    }

    private static void SaveData(List<PlaylistData> data, string filePath)
    {
        string json = JsonConvert.SerializeObject(data, Formatting.Indented);
        File.WriteAllText(filePath, json);
    }
    public static List<PlaylistData> LoadData(string filePath)
    {
        string json = File.ReadAllText(filePath);
        return JsonConvert.DeserializeObject<List<PlaylistData>>(json);
    }
}