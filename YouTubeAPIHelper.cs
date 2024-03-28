using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Threading;

public static class YouTubeAPIHelper
{
    public static YouTubeService AuthYouTubeService()
    {
        Console.Write("Please enter your ClientID: ");
        string clientID = Console.ReadLine();

        Console.Write("Please enter your ClientSecret: ");
        string clientSecret = Console.ReadLine();

        Console.Write("Please enter your ApplicationName: ");
        string applicationName = Console.ReadLine();

        return AuthYouTubeService(clientID, clientSecret, applicationName);
    }
    public static YouTubeService AuthYouTubeService(string clientID, string clientSecret, string applicationName, bool echo = true)
    {
        if (echo) Console.WriteLine("Authenticating with YouTube Data API v3...");

        try
        {
            ClientSecrets clientSecrets = new ClientSecrets();
            clientSecrets.ClientId = clientID;
            clientSecrets.ClientSecret = clientSecret;

            string[] scopes = new string[1] { YouTubeService.Scope.YoutubeReadonly };
            string user = "user";

            UserCredential userCredential = GoogleWebAuthorizationBroker.AuthorizeAsync(clientSecrets, scopes, user, CancellationToken.None).Result;

            BaseClientService.Initializer initializer = new BaseClientService.Initializer();

            initializer.HttpClientInitializer = userCredential;
            initializer.ApplicationName = applicationName;

            YouTubeService youtubeService = new YouTubeService(initializer);

            if (echo) Console.WriteLine("Authentication successful.");

            return youtubeService;
        }
        catch (Exception ex)
        {
            if (echo) Console.WriteLine($"Authentication failed due to error \"{ex.Message}\".");
            return null;
        }
    }

    // Output: Stores several files containing metadata about the users playlists and likes to the outputDirectory.
    // Query Cost: (PlaylistCount / 50) + (PlaylistLength / 50 foreach playlist)
    public static void ExportYouTubeMusicData(YouTubeService youTubeService, string outputDirectory)
    {
        // Trim trailing backslash if present in outputDirectory.
        if (outputDirectory.EndsWith("\\"))
        {
            outputDirectory = outputDirectory.Substring(0, outputDirectory.Length - 1);
        }

        string playlistsFolder = $"{outputDirectory}\\Playlists";
        Directory.CreateDirectory(playlistsFolder);

        PlaylistMeta[] playlists = DownloadPlaylists(youTubeService, "UCw5RjEHFoSDk433jursVulQ");
        SaveData(playlists, $"{outputDirectory}\\Playlists.json");

        VideoMeta[] musicLikes = DownloadVideos(youTubeService, "LM");
        SaveData(musicLikes, $"{outputDirectory}\\Likes.json");

        for (int i = 0; i < playlists.Length; i++)
        {
            VideoMeta[] playlistVideos = DownloadVideos(youTubeService, playlists[i].PlaylistID);
            SaveData(playlistVideos, $"{playlistsFolder}\\{playlists[i].PlaylistID}.json");
        }
    }

    public struct VideoMeta
    {
        public string VideoID;
        public string VideoTitle;
        public string VideoDescription;
        public string UploaderChannelID;
        public string UploaderChannelTitle;
    }

    // Output: An array containing basic information about the videos in a specified playlist.
    // Query Cost: PlaylistLength / 50
    // Note: Works for any YouTube playlist both public and private of any size large or small.
    // Note: Works for YouTube Music playlists as well.
    // Note: Use playlist ID "LL" for YouTube likes and "LM" for YouTube Music likes.
    public static VideoMeta[] DownloadVideos(YouTubeService youTubeService, string playlistID, bool echo = true)
    {
        if (echo) Console.WriteLine($"Downloading metadata for all videos in playlist \"{playlistID}\"...");

        // Set up our request and run the first one.
        PlaylistItemsResource.ListRequest request = youTubeService.PlaylistItems.List("snippet");
        request.PlaylistId = playlistID;
        request.MaxResults = 50; // 50 is the max allowed. 1 query used is used regardless so might as well make the most of it.
        request.PageToken = null;
        PlaylistItemListResponse response = request.Execute();

        // Use the result from the first request to figure out how many likes there are.
        int totalVideos = (int)response.PageInfo.TotalResults;
        int completedVideos = 0;
        VideoMeta[] output = new VideoMeta[totalVideos];

        // Save the first few likes we downloaded into the output array.
        for (int i = 0; i < response.Items.Count; i++)
        {
            output[completedVideos + i].VideoID = response.Items[i].Snippet.ResourceId.VideoId;
            output[completedVideos + i].VideoTitle = response.Items[i].Snippet.Title;
            output[completedVideos + i].VideoDescription = response.Items[i].Snippet.Description;
            output[completedVideos + i].UploaderChannelID = response.Items[i].Snippet.VideoOwnerChannelId;
            output[completedVideos + i].UploaderChannelTitle = response.Items[i].Snippet.VideoOwnerChannelTitle;
        }
        completedVideos += response.Items.Count;

        if (echo) Console.WriteLine($"Downloaded {completedVideos} of {totalVideos} videos.");

        // As long as there are more pages of likes to download keep going.
        while (response.NextPageToken != null)
        {
            // Download the next page by reusing the first request.
            request.PageToken = response.NextPageToken;
            response = request.Execute();

            // Save the videoIDs we downloaded from this page to the output array.
            for (int i = 0; i < response.Items.Count; i++)
            {
                output[completedVideos + i].VideoID = response.Items[i].Snippet.ResourceId.VideoId;
                output[completedVideos + i].VideoTitle = response.Items[i].Snippet.Title;
                output[completedVideos + i].VideoDescription = response.Items[i].Snippet.Description;
                output[completedVideos + i].UploaderChannelID = response.Items[i].Snippet.VideoOwnerChannelId;
                output[completedVideos + i].UploaderChannelTitle = response.Items[i].Snippet.VideoOwnerChannelTitle;
            }
            completedVideos += response.Items.Count;

            if (echo) Console.WriteLine($"Downloaded {completedVideos} of {totalVideos} videos.");
        }

        if (echo) Console.WriteLine($"Downloaded metadata for all videos in playlist \"{playlistID}\"!");

        // Finally return the output.
        return output;
    }

    public struct PlaylistMeta
    {
        public string PlaylistID;
        public string PlaylistTitle;
        public string PlaylistDescription;
        public int PlaylistLength;
        public string OwnerChannelID;
        public string OwnerChannelTitle;
    }

    // Output: An array containing basic information about the playlists created by a specified channel.
    // Query Cost: PlaylistCount / 50
    public static PlaylistMeta[] DownloadPlaylists(YouTubeService youTubeService, string channelID, bool echo = true)
    {
        if (echo) Console.WriteLine($"Downloading metadata for all playlists by channel \"{channelID}\"...");

        // Set up our request and run the first one.
        // ContentDetails required to get playlist lengths. Note this does not increase query cost.
        PlaylistsResource.ListRequest request = youTubeService.Playlists.List("snippet,contentDetails");
        request.ChannelId = channelID;
        request.MaxResults = 50; // 50 is the max allowed. 1 query used is used regardless so might as well make the most of it.
        request.PageToken = null;
        PlaylistListResponse response = request.Execute();

        // Use the result from the first request to figure out how many likes there are.
        int totalPlaylists = (int)response.PageInfo.TotalResults;
        int completedPlaylists = 0;
        PlaylistMeta[] output = new PlaylistMeta[totalPlaylists];

        // Save the first few likes we downloaded into the output array.
        for (int i = 0; i < response.Items.Count; i++)
        {
            output[completedPlaylists + i].PlaylistID = response.Items[i].Id;
            output[completedPlaylists + i].PlaylistTitle = response.Items[i].Snippet.Title;
            output[completedPlaylists + i].PlaylistDescription = response.Items[i].Snippet.Description;
            output[completedPlaylists + i].PlaylistLength = (int)response.Items[i].ContentDetails.ItemCount;
            output[completedPlaylists + i].OwnerChannelID = response.Items[i].Snippet.ChannelId;
            output[completedPlaylists + i].OwnerChannelTitle = response.Items[i].Snippet.ChannelTitle;
        }
        completedPlaylists += response.Items.Count;

        if (echo) Console.WriteLine($"Downloaded {completedPlaylists} of {totalPlaylists} playlists.");

        // As long as there are more pages of likes to download keep going.
        while (response.NextPageToken != null)
        {
            // Download the next page by reusing the first request.
            request.PageToken = response.NextPageToken;
            response = request.Execute();

            // Save the videoIDs we downloaded from this page to the output array.
            for (int i = 0; i < response.Items.Count; i++)
            {
                output[completedPlaylists + i].PlaylistID = response.Items[i].Id;
                output[completedPlaylists + i].PlaylistTitle = response.Items[i].Snippet.Title;
                output[completedPlaylists + i].PlaylistDescription = response.Items[i].Snippet.Description;
                output[completedPlaylists + i].PlaylistLength = (int)response.Items[i].ContentDetails.ItemCount;
                output[completedPlaylists + i].OwnerChannelID = response.Items[i].Snippet.ChannelId;
                output[completedPlaylists + i].OwnerChannelTitle = response.Items[i].Snippet.ChannelTitle;
            }
            completedPlaylists += response.Items.Count;

            if (echo) Console.WriteLine($"Downloaded {completedPlaylists} of {totalPlaylists} playlists.");
        }

        if (echo) Console.WriteLine($"Downloaded metadata for all playlists by channel \"{channelID}\"!");

        // Finally return the output.
        return output;
    }

    public static void SaveData<T>(T data, string filePath)
    {
        string json = JsonConvert.SerializeObject(data, Formatting.Indented);
        File.WriteAllText(filePath, json);
    }

    public static T LoadData<T>(string filePath)
    {
        string json = File.ReadAllText(filePath);
        return JsonConvert.DeserializeObject<T>(json);
    }

    public struct PlaylistData
    {
        public PlaylistMeta Meta;
        public VideoMeta[] Videos;
    }
}
