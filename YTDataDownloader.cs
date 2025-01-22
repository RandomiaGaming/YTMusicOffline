using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
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
public sealed class MusicDescription
{
    public string VideoID = null;
    public string ProvidedBy = null;
    public string SongName = null;
    public string[] ArtistNames = null;
    public string AlbumName = null;
    public string[] PublishStatements = null;
    public DateTime? ReleasedOn = null;
    public Tuple<string, string>[] RoleNamePairs = null;
}
public sealed class Song
{
    public string VideoID = null;
    public string ThumbnailUrl = null;
    public string SongName = null;
    public string AlbumName = null;
    public string ArtistName = null;
    public string[] FeaturedArtistNames = null;
    public DateTime ReleaseDate = new DateTime();
}
public static class YTDataDownloader
{
    public static HttpClient ReusableHttpClient = CreateReusableHttpClient();
    public static HttpClient CreateReusableHttpClient()
    {
        HttpClient output = new HttpClient();
        string userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
        output.DefaultRequestHeaders.Add("User-Agent", userAgent);
        return output;
    }
    public static Random RNG = new Random((int)DateTime.Now.Ticks);
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
                Console.WriteLine($"Loading playlist items from \"{playlistItemsJsonFilePath}\"...");
                playlistItems = Load<List<PlaylistItem>>(playlistItemsJsonFilePath);
            }
            else
            {
                if (ytService == null)
                {
                    Console.WriteLine("Authenticating with YouTube API...");
                    ytService = AuthYTService(clientID, clientSecret, false);
                }
                Console.WriteLine("Enumerating playlist items...");
                playlistItems = new List<PlaylistItem>();
                for (int i = 0; i < playlists.Count; i++)
                {
                    List<PlaylistItem> newPlaylistItems = EnumPlaylistItems(ytService, playlists[i].Id);
                    playlistItems.AddRange(newPlaylistItems);
                }
                Console.WriteLine($"Saving playlist items to \"{playlistItemsJsonFilePath}\"...");
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
                Console.WriteLine($"Loading video relocations from \"{videoRelocationsJsonFilePath}\"...");
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
                    Console.WriteLine($"Saving video relocations to \"{videoRelocationsJsonFilePath}\"...");
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

        // Load music descriptions from json file or by parsing videos if file does not exist
        List<MusicDescription> musicDescriptions = new List<MusicDescription>();
        {
            string musicDescriptionsJsonFilePath = Path.Combine(databaseFolderPath, "MusicDescriptions.json");
            if (File.Exists(musicDescriptionsJsonFilePath))
            {
                Console.WriteLine($"Loading music descriptions from \"{musicDescriptionsJsonFilePath}\"...");
                musicDescriptions = Load<List<MusicDescription>>(musicDescriptionsJsonFilePath);
            }
            else
            {
                Console.WriteLine("Parsing music descriptions...");
                foreach (Video video in videos)
                {
                    MusicDescription newMusicDescription = ParseMusicDescription(video);
                    if (newMusicDescription != null)
                    {
                        musicDescriptions.Add(newMusicDescription);
                    }
                }
                Console.WriteLine($"Saving music descriptions to \"{musicDescriptionsJsonFilePath}\"...");
                Save(musicDescriptions, musicDescriptionsJsonFilePath);
            }
        }

        // Load songs from json file or by parsing database if file does not exist
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
                    if (ghosts.RemovedVideoIDs.Contains(video.Id))
                    {
                        continue;
                    }
                    if (ghosts.UnavailableVideoIDs.Contains(video.Id))
                    {
                        continue;
                    }
                    bool relocated = false;
                    foreach (VideoRelocation videoRelocation in videoRelocations)
                    {
                        if (videoRelocation.OriginalVideoID == video.Id)
                        {
                            relocated = true;
                            break;
                        }
                    }
                    if (relocated)
                    {
                        continue;
                    }
                    Song newSong = new Song();
                    newSong.VideoID = video.Id;
                    newSong.ThumbnailUrl = GetBestThumbnailUrl(video.Snippet.Thumbnails);
                    newSong.SongName = video.Snippet.Title;
                    newSong.AlbumName = "";
                    if (video.Snippet.ChannelTitle.EndsWith(" - Topic"))
                    {
                        newSong.ArtistName = video.Snippet.ChannelTitle.Substring(0, video.Snippet.ChannelTitle.Length - " - Topic".Length);
                    }
                    else
                    {
                        newSong.ArtistName = video.Snippet.ChannelTitle;
                    }
                    newSong.FeaturedArtistNames = new string[0];
                    newSong.ReleaseDate = (DateTime)ParseYTDate(video.Snippet.PublishedAtRaw);
                    foreach (MusicDescription musicDescription in musicDescriptions)
                    {
                        if (musicDescription.VideoID == video.Id)
                        {
                            if (musicDescription.SongName != null)
                            {
                                newSong.SongName = musicDescription.SongName;
                            }
                            if (musicDescription.AlbumName != null)
                            {
                                newSong.AlbumName = musicDescription.AlbumName;
                            }
                            if (musicDescription.ArtistNames != null && musicDescription.ArtistNames.Length > 0)
                            {
                                newSong.ArtistName = musicDescription.ArtistNames[0];
                                newSong.FeaturedArtistNames = new string[musicDescription.ArtistNames.Length - 1];
                                Array.Copy(musicDescription.ArtistNames, 1, newSong.FeaturedArtistNames, 0, newSong.FeaturedArtistNames.Length);
                            }
                            if (musicDescription.ReleasedOn != null)
                            {
                                newSong.ReleaseDate = (DateTime)musicDescription.ReleasedOn;
                            }
                            break;
                        }
                    }
                    songs.Add(newSong);
                }
                Console.WriteLine($"Saving songs to \"{songsJsonFilePath}\"...");
                Save(songs, songsJsonFilePath);
            }
        }

        // Download each song's thumbnail if it doesn't already exist
        {
            Console.WriteLine("Checking and downloading thumbnails...");
            string thumbnailFolderPath = Path.Combine(databaseFolderPath, "Thumbnails");
            if (!Directory.Exists(thumbnailFolderPath))
            {
                Directory.CreateDirectory(thumbnailFolderPath);
            }
            for (int i = 0; i < songs.Count; i++)
            {
                Song song = songs[i];
                string thumbnailFilePath = Path.Combine(thumbnailFolderPath, song.VideoID + ".png");
                if (File.Exists(thumbnailFilePath))
                {
                    continue;
                }
                Console.WriteLine($"Progress {i + 1} of {songs.Count} complete...");
                DownloadImageAsPng(song.ThumbnailUrl, thumbnailFilePath);
            }
        }

        // Download each song if it doesn't already exist
        {
            Console.WriteLine("Downloading songs this may take a really long time...");
            string songsFolderPath = Path.Combine(databaseFolderPath, "Songs");
            if (!Directory.Exists(songsFolderPath))
            {
                Directory.CreateDirectory(songsFolderPath);
            }
            string workingFolderPath = Path.Combine(databaseFolderPath, "WorkingDirectory");
            if (!Directory.Exists(workingFolderPath))
            {
                Directory.CreateDirectory(workingFolderPath);
            }
            for (int i = 0; i < songs.Count; i++)
            {
                Song song = songs[i];
                string[] matchFiles = Directory.GetFiles(songsFolderPath, song.VideoID + ".*");
                if (matchFiles.Length > 0)
                {
                    continue;
                }
                Console.WriteLine($"Progress {i + 1} of {songs.Count} at {DateTime.Now}...");
                YTDLPDownload(song.VideoID, workingFolderPath, songsFolderPath);
                if(i % 50 == 0)
                {
                    Console.WriteLine($"Sleeping for 15 minutes starting at {DateTime.Now}...");
                    Thread.Sleep(1000 * 60 * 15);
                }
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
        string musicUrl = $"https://music.youtube.com/watch?v={videoID}";
        string html = ReusableHttpClient.GetStringAsync(musicUrl).Result;
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

    // Parses data from an auto-generated YouTube music description
    // API COST: Free since it parses the description already downloaded previously
    public static MusicDescription ParseMusicDescription(Video video)
    {
        string videoDescription = video.Snippet.Description.Replace("\r\n", "\n");
        if (!videoDescription.EndsWith("\n\nAuto-generated by YouTube."))
        {
            return null;
        }

        // If present split the sections
        MusicDescription output = new MusicDescription();
        output.VideoID = video.Id;
        videoDescription = videoDescription.Substring(0, videoDescription.Length - "\n\nAuto-generated by YouTube.".Length);
        string[] sections = Split(videoDescription, "\n\n");
        int currentSection = 0;

        // Parse each section and skip sections which are not present
        if (ParseProvidedBy(currentSection < sections.Length ? sections[currentSection] : null, output))
        {
            currentSection++;
        }
        ParseSongAndArtist(currentSection < sections.Length ? sections[currentSection] : null, output);
        {
            currentSection++;
        }
        ParseAlbumName(currentSection < sections.Length ? sections[currentSection] : null, output);
        {
            currentSection++;
        }
        if (ParsePublishInfo(currentSection < sections.Length ? sections[currentSection] : null, output))
        {
            currentSection++;
        }
        if (ParseReleasedOn(currentSection < sections.Length ? sections[currentSection] : null, output))
        {
            currentSection++;
        }
        if (ParseRoleNamePairs(currentSection < sections.Length ? sections[currentSection] : null, output))
        {
            currentSection++;
        }

        // Check for errors
        if (currentSection != sections.Length)
        {
            throw new Exception("Parsing YTMusic auto generated description failed.");
        }

        return output;
    }
    public static bool ParseProvidedBy(string section, MusicDescription musicDescription)
    {
        if (section == null)
        {
            return false;
        }
        if (!section.StartsWith("Provided to YouTube by "))
        {
            return false;
        }
        string providedBy = section.Substring("Provided to YouTube by ".Length);
        if (providedBy == "")
        {
            return false;
        }
        if (providedBy.Contains("\n"))
        {
            return false;
        }
        musicDescription.ProvidedBy = providedBy;
        return true;
    }
    public static void ParseSongAndArtist(string section, MusicDescription musicDescription)
    {
        if (section == null)
        {
            throw new Exception("No value provided for required section SongAndArtist.");
        }
        string[] names = Split(section, " · ");
        if (names.Length < 2)
        {
            throw new Exception("Section SongAndArtist must contain at least 2 values.");
        }
        foreach (string name in names)
        {
            if (name == "")
            {
                throw new Exception("Name may not be empty.");
            }
            if (name.Contains("\n"))
            {
                throw new Exception("Name contained invalid characters.");
            }
        }
        musicDescription.SongName = names[0];
        musicDescription.ArtistNames = new string[names.Length - 1];
        Array.Copy(names, 1, musicDescription.ArtistNames, 0, musicDescription.ArtistNames.Length);
    }
    public static void ParseAlbumName(string section, MusicDescription musicDescription)
    {
        if (section == null)
        {
            throw new Exception("No value provided for required section AlbumName.");
        }
        string albumName = section;
        if (albumName == "")
        {
            throw new Exception("AlbumName may not be empty.");
        }
        if (albumName.Contains("\n"))
        {
            throw new Exception("AlbumName contained invalid characters.");
        }
        musicDescription.AlbumName = albumName;
    }
    public static bool ParsePublishInfo(string section, MusicDescription musicDescription)
    {
        if (section == null)
        {
            return false;
        }
        string[] publishStatements = Split(section, "\n");
        foreach (string publishStatement in publishStatements)
        {
            if (publishStatement == "")
            {
                return false;
            }
            if (!publishStatement.StartsWith("℗ "))
            {
                return false;
            }
            if (publishStatement.Contains("\n"))
            {
                return false;
            }
        }
        musicDescription.PublishStatements = publishStatements;
        return true;
    }
    public static bool ParseReleasedOn(string section, MusicDescription musicDescription)
    {
        if (section == null)
        {
            return false;
        }
        if (!section.StartsWith("Released on: "))
        {
            return false;
        }
        string releasedOnString = section.Substring("Released on: ".Length);
        if (releasedOnString == "")
        {
            return false;
        }
        if (releasedOnString.Contains("\n"))
        {
            return false;
        }
        DateTime releasedOn;
        if (!DateTime.TryParse(releasedOnString, out releasedOn))
        {
            return false;
        }
        musicDescription.ReleasedOn = releasedOn;
        return true;
    }
    public static bool ParseRoleNamePairs(string section, MusicDescription musicDescription)
    {
        if (section == null)
        {
            return false;
        }
        string[] roleNamePairs = Split(section, "\n");
        Tuple<string, string>[] roleNamePairsParsed = new Tuple<string, string>[roleNamePairs.Length];
        for (int i = 0; i < roleNamePairs.Length; i++)
        {
            string roleNamePair = roleNamePairs[i];
            int index = roleNamePair.IndexOf(": ");
            if (index == -1)
            {
                return false;
            }
            string role = roleNamePair.Substring(0, index);
            string name = roleNamePair.Substring(index + ": ".Length);
            if (role == "")
            {
                return false;
            }
            if (role.Contains("\n"))
            {
                return false;
            }
            if (name == "")
            {
                return false;
            }
            if (name.Contains("\n"))
            {
                return false;
            }
            Tuple<string, string> roleNamePairParsed = new Tuple<string, string>(role, name);
            roleNamePairsParsed[i] = roleNamePairParsed;
        }
        musicDescription.RoleNamePairs = roleNamePairsParsed;
        return true;
    }

    public static string[] Split(string value, string separator)
    {
        List<string> output = new List<string>();
        while (true)
        {
            int i = value.IndexOf(separator);
            if (i == -1)
            {
                output.Add(value);
                break;
            }
            else
            {
                output.Add(value.Substring(0, i));
                value = value.Substring(i + separator.Length);

                if (value.Length == 0)
                {
                    output.Add("");
                    break;
                }
            }
        }
        return output.ToArray();
    }

    public static DateTime? ParseYTDate(string releaseDateRaw)
    {
        DateTime output;
        if (!DateTime.TryParse(releaseDateRaw, out output))
        {
            return null;
        }
        return output;
    }
    public static TimeSpan? ParseYTDuration(string contentDurationRaw)
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

    public static void DownloadImageAsPng(string url, string filePath)
    {
        byte[] payload = ReusableHttpClient.GetByteArrayAsync(url).Result;
        MemoryStream payloadStream = new MemoryStream(payload);
        Bitmap output = new Bitmap(payloadStream);
        output.Save(filePath, ImageFormat.Png);
        output.Dispose();
        payloadStream.Dispose();
    }
    public static string GetBestThumbnailUrl(ThumbnailDetails thumbnails)
    {
        long bestSize = 0;
        string bestUrl = null;
        Thumbnail[] thumbnailList = new Thumbnail[5] {
            thumbnails.Default__,
            thumbnails.High,
            thumbnails.Maxres,
            thumbnails.Medium,
            thumbnails.Standard
        };
        foreach (Thumbnail thumbnail in thumbnailList)
        {
            if (thumbnail == null)
            {
                continue;
            }
            long size = (long)thumbnail.Width * (long)thumbnail.Height;
            if (size > bestSize)
            {
                bestUrl = thumbnail.Url;
                bestSize = size;
            }
        }
        return bestUrl;
    }

    public static void YTDLPDownload(string videoID, string workingFolderPath, string songsFolderPath)
    {
        if (Directory.GetFiles(workingFolderPath).Length != 0)
        {
            throw new Exception("Working folder was not empty.");
        }
        string command = $"D:\\ImportantData\\Utilities\\YTDLP\\yt-dlp.exe --force-overwrites --verbose --no-continue --format bestaudio --output {videoID}.%(ext)s https://www.youtube.com/watch?v={videoID} || (pause && exit /b 1)";
        ProcessStartInfo psi = new ProcessStartInfo();
        psi.WindowStyle = ProcessWindowStyle.Minimized;
        psi.WorkingDirectory = workingFolderPath;
        psi.FileName = "cmd.exe";
        psi.Arguments = $"/c {command}";
        psi.UseShellExecute = true;
        Process p = Process.Start(psi);
        p.WaitForExit();
        if (p.ExitCode != 0)
        {
            throw new Exception($"Error cmd.exe returned exit status code {p.ExitCode}.");
        }
        string[] filesInWorkingFolder = Directory.GetFiles(workingFolderPath);
        if (filesInWorkingFolder.Length != 1 || !filesInWorkingFolder[0].StartsWith(workingFolderPath + "\\" + videoID + "."))
        {
            throw new Exception("Something was wrong with the output in the working folder.");
        }
        string finalFilePath = Path.Combine(songsFolderPath, videoID + Path.GetExtension(filesInWorkingFolder[0]));
        File.Move(filesInWorkingFolder[0], finalFilePath);
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