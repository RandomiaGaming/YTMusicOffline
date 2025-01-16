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

public sealed class PlaylistData
{
    public string PlaylistID = null;
    public string Title = null;
    public string Description = null;
    public List<VideoData> Videos = null;
}
public sealed class VideoData
{
    public string VideoID = null;
    public string Title = null;
    public string Description = null;
    public string ThumbnailUrl = null;
    public string ChannelID = null;
    public string ChannelTitle = null;
    public DateTime? UploadDate = null;
    public TimeSpan? ContentDuration = null;
}

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
        List<PlaylistData> playlists = EnumPlaylistIDs(ytService);
        for (int i = 0; i < playlists.Count; i++)
        {
            Console.WriteLine($"Enumerating videos in playlist {i + 1}/{playlists.Count}...");
            EnumVideoIDs(playlists[i], ytService);
            Console.WriteLine($"Enumerating video details for playlist {i + 1}/{playlists.Count}...");
            EnumVideoDetails(playlists[i], ytService);
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

    // Enumerates all PlaylistIDs on the current users account
    // The PlaylistData objects will have empty Videos arrays at this time
    private static List<PlaylistData> EnumPlaylistIDs(YouTubeService ytService)
    {
        // Prepare output list
        List<PlaylistData> output = new List<PlaylistData>();

        // Prepare for first request
        PlaylistsResource.ListRequest request = ytService.Playlists.List("snippet");
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
                PlaylistData newPlaylistData = new PlaylistData();
                newPlaylistData.PlaylistID = response.Items[i].Id;
                newPlaylistData.Title = response.Items[i].Snippet.Title;
                newPlaylistData.Description = response.Items[i].Snippet.Description;
                output.Add(newPlaylistData);
            }

            // Prepare for the next itteration
            request.PageToken = response.NextPageToken;
        }
        while (response.NextPageToken != null && response.NextPageToken != "");

        // Add special short code playlists to output
        PlaylistData likedMusicPlaylistData = new PlaylistData();
        likedMusicPlaylistData.PlaylistID = "LM";
        likedMusicPlaylistData.Title = "Liked Music";
        likedMusicPlaylistData.Description = null;
        output.Add(likedMusicPlaylistData);
        /*
        PlaylistData likedVideosPlaylistData = new PlaylistData();
        likedVideosPlaylistData.PlaylistID = "LL";
        likedVideosPlaylistData.Title = "Liked Videos";
        likedVideosPlaylistData.Description = null;
        output.Add(likedVideosPlaylistData);
        */
        /*
        PlaylistData watchLaterPlaylistData = new PlaylistData();
        watchLaterPlaylistData.PlaylistID = "WL";
        watchLaterPlaylistData.Title = "Watch Later";
        watchLaterPlaylistData.Description = null;
        output.Add(watchLaterPlaylistData);
        */

        // Return output
        return output;
    }

    // Enumerates all VideoIDs in a playlist
    // The VideoData objects will have only their VideoID set at this time
    private static void EnumVideoIDs(PlaylistData playlist, YouTubeService ytService)
    {
        // Prepare the videos list
        playlist.Videos = new List<VideoData>();

        // Prepare the first request
        PlaylistItemsResource.ListRequest request = ytService.PlaylistItems.List("snippet");
        request.PlaylistId = playlist.PlaylistID;
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
                VideoData newVideoData = new VideoData();
                newVideoData.VideoID = response.Items[i].Snippet.ResourceId.VideoId;
                playlist.Videos.Add(newVideoData);
            }

            // Prepare for the next itteration
            request.PageToken = response.NextPageToken;
        }
        while (response.NextPageToken != null && response.NextPageToken != "");
    }

    // Fills in all the details for all the VideoData objects in the Videos array of a PlaylistData object
    private static void EnumVideoDetails(PlaylistData playlist, YouTubeService ytService)
    {
        // This stores our progress through the videos in this playlist
        int index = 0;

        // Prepare the first request
        VideosResource.ListRequest request = ytService.Videos.List("snippet,contentDetails");
        request.MaxResults = 50; // 50 is the max allowed per query
        request.PageToken = null;
        VideoListResponse response = null;

        do
        {
            // Prepare this API request
            List<string> videoIDs = new List<string>();
            for (int i = 0; (i < request.MaxResults) && (index < playlist.Videos.Count); i++)
            {
                videoIDs.Add(playlist.Videos[index].VideoID);
                index++;
            }
            request.Id = videoIDs;

            // Execute the API request
            response = request.Execute();

            // Parse the results
            for (int i = 0; i < response.Items.Count; i++)
            {
                for (int j = 0; j < playlist.Videos.Count; j++)
                {
                    if (playlist.Videos[j].VideoID == response.Items[i].Id)
                    {
                        playlist.Videos[j].Title = response.Items[i].Snippet.Title;
                        playlist.Videos[j].Description = response.Items[i].Snippet.Description;
                        playlist.Videos[j].ThumbnailUrl = GetBestThumbnailUrl(response.Items[i].Snippet.Thumbnails);
                        playlist.Videos[j].ChannelID = response.Items[i].Snippet.ChannelId;
                        playlist.Videos[j].ChannelTitle = response.Items[i].Snippet.ChannelTitle;
                        playlist.Videos[j].UploadDate = ParseReleaseDate(response.Items[i].Snippet.PublishedAtRaw);
                        playlist.Videos[j].ContentDuration = ParseContentDuration(response.Items[i].ContentDetails.Duration);
                        break;
                    }
                }
            }
        }
        while (index < playlist.Videos.Count);
    }
    private static string GetBestThumbnailUrl(ThumbnailDetails thumbnailDetails)
    {
        // Create an array to store all the options for thumbnails
        Thumbnail[] thumbnails = new Thumbnail[] {
            thumbnailDetails.Default__,
            thumbnailDetails.Standard,
            thumbnailDetails.Medium,
            thumbnailDetails.High,
            thumbnailDetails.Maxres,
        };

        // Create a field to store the best thumbnail found so far
        string bestThumbnailUrl = null;
        long bestThumbnailSize = long.MinValue;

        // Loop over each thumbnail and check if it's better than what we found so far
        foreach (Thumbnail thumbnail in thumbnails)
        {
            if (thumbnail != null && thumbnail.Height * thumbnail.Width > bestThumbnailSize)
            {
                bestThumbnailUrl = thumbnail.Url;
                bestThumbnailSize = thumbnail.Height.Value * thumbnail.Width.Value;
            }
        }

        // Return the best thumbnail found so far or null if no thumbnails are availible
        return bestThumbnailUrl;
    }
    private static DateTime? ParseReleaseDate(string releaseDateRaw)
    {
        DateTime output;
        if (!DateTime.TryParse(releaseDateRaw, out output))
        {
            return null;
        }
        return output;
    }
    private static TimeSpan? ParseContentDuration(string contentDurationRaw)
    {
        try
        {
            // System.Xml.XmlConvert.ToTimeSpan can handle ISO 8601 durations
            return System.Xml.XmlConvert.ToTimeSpan(contentDurationRaw);
        }
        catch
        {
            return null;
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