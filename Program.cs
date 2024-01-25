using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Policy;
using System.Threading;
using static YTMusicHelper.VideoInfoDownloader;

namespace YTMusicHelper
{
    //Downloads a list of video IDs from a playlist
    public static class PlaylistDownloader
    {
        public static void Mainio()
        {
            Config.Load();

            try
            {

                if (Config.DownloadComplete)
                {
                    Console.WriteLine("It looks like this playlist has already been downloaded.");
                    goto PressAnyKeyToExit;
                }

                if (Config.ClientID is "")
                {
                    Console.Write("Please enter your ClientID: ");
                    Config.ClientID = Console.ReadLine();
                }

                if (Config.ClientSecret is "")
                {
                    Console.Write("Please enter your ClientSecret: ");
                    Config.ClientSecret = Console.ReadLine();
                }

                if (Config.ApplicationName is "")
                {
                    Console.Write("Please enter your ApplicationName: ");
                    Config.ApplicationName = Console.ReadLine();
                }

                Console.WriteLine("Authenticating with YouTube Data API v3...");

                try
                {
                    ClientSecrets clientSecrets = new ClientSecrets();
                    clientSecrets.ClientId = Config.ClientID;
                    clientSecrets.ClientSecret = Config.ClientSecret;

                    string[] scopes = new string[1] { YouTubeService.Scope.YoutubeReadonly };

                    UserCredential credential = GoogleWebAuthorizationBroker.AuthorizeAsync(clientSecrets, scopes, "user", System.Threading.CancellationToken.None).Result;

                    BaseClientService.Initializer baseClientServiceInitializer = new BaseClientService.Initializer();

                    baseClientServiceInitializer.HttpClientInitializer = credential;
                    baseClientServiceInitializer.ApplicationName = Config.ApplicationName;

                    YouTubeService youtubeService = new YouTubeService(baseClientServiceInitializer);

                    Console.WriteLine("Authentication successful.");

                    if (Config.PlaylistID is "")
                    {
                        Console.Write("Please enter your PlaylistID: ");
                        Config.PlaylistID = Console.ReadLine();
                    }

                    Console.WriteLine("Downloading playlist...");

                    while (true)
                    {
                        try
                        {
                            var request = youtubeService.PlaylistItems.List("snippet");
                            request.PlaylistId = Config.PlaylistID;
                            request.MaxResults = 50;
                            request.PageToken = Config.NextPageToken;

                            var response = request.Execute();

                            foreach (var playlistItem in response.Items)
                            {
                                Config.PlaylistVideoIDs.Add(playlistItem.Snippet.ResourceId.VideoId);
                            }

                            Console.WriteLine($"Downloaded page {Config.NextPageToken}.");

                            if (response.NextPageToken is null)
                            {
                                Config.DownloadComplete = true;
                                break;
                            }
                            else
                            {
                                Config.NextPageToken = response.NextPageToken;
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Unable to download playlist due to error: {ex.Message}.");
                            goto PressAnyKeyToExit;
                        }
                    }

                    Console.WriteLine("Successfully downloaded playlist.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Authentication failed due to error: {ex.Message}.");
                    goto PressAnyKeyToExit;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General error: {ex.Message}.");
            }

        PressAnyKeyToExit:
            Config.Save();

            Console.WriteLine("Press any key to exit...");
            Stopwatch bufferConsumeStopwatch = Stopwatch.StartNew();
            while (true)
            {
                Console.ReadKey(true);
                if (bufferConsumeStopwatch.ElapsedMilliseconds > 1000)
                {
                    break;
                }
            }
            Environment.Exit(0);
        }
        public static class Config
        {
            #region Public Const Variables
            public const string ConfigFileName = "PlaylistDownloaderConfig.json";
            #endregion
            #region Public Static Variables
            public static string ClientID
            {
                get
                {
                    return CurrentConfigData.ClientID;
                }
                set
                {
                    CurrentConfigData.ClientID = value;
                }
            }
            public static string ClientSecret
            {
                get
                {
                    return CurrentConfigData.ClientSecret;
                }
                set
                {
                    CurrentConfigData.ClientSecret = value;
                }
            }
            public static string PlaylistID
            {
                get
                {
                    return CurrentConfigData.PlaylistID;
                }
                set
                {
                    CurrentConfigData.PlaylistID = value;
                }
            }
            public static string ApplicationName
            {
                get
                {
                    return CurrentConfigData.ApplicationName;
                }
                set
                {
                    CurrentConfigData.ApplicationName = value;
                }
            }
            public static bool DownloadComplete
            {
                get
                {
                    return CurrentConfigData.DownloadComplete;
                }
                set
                {
                    CurrentConfigData.DownloadComplete = value;
                }
            }
            public static string NextPageToken
            {
                get
                {
                    return CurrentConfigData.NextPageToken;
                }
                set
                {
                    CurrentConfigData.NextPageToken = value;
                }
            }
            public static List<string> PlaylistVideoIDs
            {
                get
                {
                    return CurrentConfigData.PlaylistVideoIDs;
                }
                set
                {
                    CurrentConfigData.PlaylistVideoIDs = value;
                }
            }
            #endregion
            #region Private Static Variables
            private static ConfigData CurrentConfigData = new ConfigData();
            #endregion
            #region Private Sub-Classes
            private sealed class ConfigData
            {
                public string ClientID = "";
                public string ClientSecret = "";
                public string PlaylistID = "";
                public string ApplicationName = "";
                public bool DownloadComplete = false;
                public string NextPageToken = "";
                public List<string> PlaylistVideoIDs = new List<string>();
            }
            #endregion
            #region Public Static Methods
            public static void Load()
            {
                CurrentConfigData = new ConfigData();

                if (File.Exists(ConfigFileName))
                {
                    string json = File.ReadAllText(ConfigFileName);

                    CurrentConfigData = Newtonsoft.Json.JsonConvert.DeserializeObject<ConfigData>(json);
                }
            }
            public static void Save()
            {
                string json = Newtonsoft.Json.JsonConvert.SerializeObject(CurrentConfigData);

                File.WriteAllText(ConfigFileName, json);
            }
            #endregion
        }
    }
    //Gets the title, and description for all the video IDs downloaded by PlaylistDownloader.
    public static class VideoInfoDownloader
    {
        public static void Mainio()
        {
            Config.Load();

            try
            {

                if (!Config.LoadedFromPlaylistDownloader)
                {
                    Console.WriteLine("Loading data from PlaylistDownloader.");

                    PlaylistDownloader.Config.Load();

                    Config.ClientID = PlaylistDownloader.Config.ClientID;
                    Config.ClientSecret = PlaylistDownloader.Config.ClientSecret;
                    Config.ApplicationName = PlaylistDownloader.Config.ApplicationName;

                    Config.VideoIDsInQue = new List<string>(PlaylistDownloader.Config.PlaylistVideoIDs);

                    Config.LoadedFromPlaylistDownloader = true;

                    Console.WriteLine("Successfully loaded data from PlaylistDownloader.");
                }

                if (Config.VideoIDsInQue.Count is 0)
                {
                    Console.WriteLine("It looks like this task has already been completed.");
                    goto PressAnyKeyToExit;
                }

                Console.WriteLine("Authenticating with YouTube Data API v3...");

                try
                {
                    ClientSecrets clientSecrets = new ClientSecrets();
                    clientSecrets.ClientId = Config.ClientID;
                    clientSecrets.ClientSecret = Config.ClientSecret;

                    string[] scopes = new string[1] { YouTubeService.Scope.YoutubeReadonly };

                    UserCredential credential = GoogleWebAuthorizationBroker.AuthorizeAsync(clientSecrets, scopes, "user", System.Threading.CancellationToken.None).Result;

                    BaseClientService.Initializer baseClientServiceInitializer = new BaseClientService.Initializer();

                    baseClientServiceInitializer.HttpClientInitializer = credential;
                    baseClientServiceInitializer.ApplicationName = Config.ApplicationName;

                    YouTubeService youtubeService = new YouTubeService(baseClientServiceInitializer);

                    Console.WriteLine("Authentication successful.");

                    Console.WriteLine("Downloading video info...");

                    while (!(Config.VideoIDsInQue.Count is 0))
                    {
                        VideoInfo videoInfo = new VideoInfo();
                        videoInfo.VideoID = Config.VideoIDsInQue[0];

                        var request = youtubeService.Videos.List("snippet");
                        request.Id = videoInfo.VideoID;

                        var response = request.Execute();

                        if (!(response.Items.Count is 1))
                        {
                            throw new Exception($"Unable to download video with id {videoInfo.VideoID}");
                        }

                        Video video = response.Items[0];

                        videoInfo.VideoTitle = video.Snippet.Title;
                        videoInfo.VideoDescription = video.Snippet.Description;

                        Config.ExtractedVideoInfo.Add(videoInfo);

                        Config.VideoIDsInQue.RemoveAt(0);

                        Console.WriteLine($"Downloaded video with id {videoInfo.VideoID}.");
                    }

                    Console.WriteLine("Successfully downloaded video info.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Authentication failed due to error: {ex.Message}.");
                    goto PressAnyKeyToExit;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General error: {ex.Message}.");
            }

        PressAnyKeyToExit:
            Config.Save();

            Console.WriteLine("Press any key to exit...");
            Stopwatch bufferConsumeStopwatch = Stopwatch.StartNew();
            while (true)
            {
                Console.ReadKey(true);
                if (bufferConsumeStopwatch.ElapsedMilliseconds > 1000)
                {
                    break;
                }
            }
            Environment.Exit(0);
        }
        public sealed class VideoInfo
        {
            public string VideoID = "";
            public string VideoTitle = "";
            public string VideoDescription = "";
        }
        public static class Config
        {
            #region Public Const Variables
            public const string ConfigFileName = "VideoInfoDownloaderConfig.json";
            #endregion
            #region Public Static Variables
            public static bool LoadedFromPlaylistDownloader
            {
                get
                {
                    return CurrentConfigData.LoadedFromPlaylistDownloader;
                }
                set
                {
                    CurrentConfigData.LoadedFromPlaylistDownloader = value;
                }
            }
            public static string ClientID
            {
                get
                {
                    return CurrentConfigData.ClientID;
                }
                set
                {
                    CurrentConfigData.ClientID = value;
                }
            }
            public static string ClientSecret
            {
                get
                {
                    return CurrentConfigData.ClientSecret;
                }
                set
                {
                    CurrentConfigData.ClientSecret = value;
                }
            }
            public static string ApplicationName
            {
                get
                {
                    return CurrentConfigData.ApplicationName;
                }
                set
                {
                    CurrentConfigData.ApplicationName = value;
                }
            }
            public static List<string> VideoIDsInQue
            {
                get
                {
                    return CurrentConfigData.VideoIDsInQue;
                }
                set
                {
                    CurrentConfigData.VideoIDsInQue = value;
                }
            }
            public static List<VideoInfo> ExtractedVideoInfo
            {
                get
                {
                    return CurrentConfigData.ExtractedVideoInfo;
                }
                set
                {
                    CurrentConfigData.ExtractedVideoInfo = value;
                }
            }
            #endregion
            #region Private Static Variables
            private static ConfigData CurrentConfigData = new ConfigData();
            #endregion
            #region Private Sub-Classes
            private sealed class ConfigData
            {
                public bool LoadedFromPlaylistDownloader = false;
                public string ClientID = "";
                public string ClientSecret = "";
                public string ApplicationName = "";
                public List<string> VideoIDsInQue = new List<string>();
                public List<VideoInfo> ExtractedVideoInfo = new List<VideoInfo>();
            }
            #endregion
            #region Public Static Methods
            public static void Load()
            {
                CurrentConfigData = new ConfigData();

                if (File.Exists(ConfigFileName))
                {
                    string json = File.ReadAllText(ConfigFileName);

                    CurrentConfigData = Newtonsoft.Json.JsonConvert.DeserializeObject<ConfigData>(json);
                }
            }
            public static void Save()
            {
                string json = Newtonsoft.Json.JsonConvert.SerializeObject(CurrentConfigData);

                File.WriteAllText(ConfigFileName, json);
            }
            #endregion
        }
    }
    //Gets the song name, album name, and artist name based on the information provided by VideoInfoDownloader
    public static class SongInfoHelper
    {
        public static void Mainio()
        {
            VideoInfoDownloader.Config.Load();
            VideoInfo[] videoInfo = VideoInfoDownloader.Config.ExtractedVideoInfo.ToArray();

            Config.SongInfoDatabase = new List<SongInfo>(videoInfo.Length);

            foreach (VideoInfo video in videoInfo)
            {
                try
                {
                    SongInfo song = new SongInfo();
                    song.VideoID = video.VideoID;
                    song.VideoTitle = video.VideoTitle;
                    song.VideoDescription = video.VideoDescription;

                    if (!song.VideoDescription.EndsWith("\n\nAuto-generated by YouTube."))
                    {
                        Console.WriteLine($"Song with id {song.VideoID} features a custom description which cannot be parsed.");
                    }
                    else
                    {
                        string[] videoDescriptionLines = song.VideoDescription.Replace("\r\n", "\n").Replace("\n\n", "\n").Split('\n');
                        int nameArtistLineIndex = -1;
                        for (int i = 0; i < videoDescriptionLines.Length; i++)
                        {
                            if (videoDescriptionLines[i].Contains(" · "))
                            {
                                nameArtistLineIndex = i;
                                break;
                            }
                        }
                        if (nameArtistLineIndex is -1)
                        {
                            Console.WriteLine($"Unable to parse song with id {song.VideoID} due to missing seporator.");
                        }
                        else
                        {
                            string nameArtistLine = videoDescriptionLines[nameArtistLineIndex];
                            string[] nameArtistLines = nameArtistLine.Replace(" · ", "·").Split('·');
                            song.SongName = nameArtistLines[0];
                            song.SongArtists = new List<string>(nameArtistLines.Length - 1);
                            for (int i = 1; i < nameArtistLines.Length; i++)
                            {
                                song.SongArtists.Add(nameArtistLines[i]);
                            }
                            if (nameArtistLineIndex + 1 < videoDescriptionLines.Length)
                            {
                                song.SongAlbum = videoDescriptionLines[nameArtistLineIndex + 1];
                            }
                            else
                            {
                                Console.WriteLine($"Unable to parse album from song with id {song.VideoID}.");
                            }
                        }
                    }

                    Config.SongInfoDatabase.Add(song);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Unable to parse song with id {video.VideoID} due to error {ex.Message}.");
                }
            }

        PressAnyKeyToExit:
            Config.Save();

            Console.WriteLine("Press any key to exit...");
            Stopwatch bufferConsumeStopwatch = Stopwatch.StartNew();
            while (true)
            {
                Console.ReadKey(true);
                if (bufferConsumeStopwatch.ElapsedMilliseconds > 1000)
                {
                    break;
                }
            }
            Environment.Exit(0);
        }
        public sealed class SongInfo
        {
            public string SongName = "";
            public string SongAlbum = "";
            public List<string> SongArtists = new List<string>();
            public string VideoTitle = "";
            public string VideoDescription = "";
            public string VideoID = "";
        }
        public static class Config
        {
            #region Public Const Variables
            public const string ConfigFileName = "SongInfoConfig.json";
            #endregion
            #region Public Static Variables
            public static List<SongInfo> SongInfoDatabase
            {
                get
                {
                    return CurrentConfigData.SongInfoDatabase;
                }
                set
                {
                    CurrentConfigData.SongInfoDatabase = value;
                }
            }
            #endregion
            #region Private Static Variables
            private static ConfigData CurrentConfigData = new ConfigData();
            #endregion
            #region Private Sub-Classes
            private sealed class ConfigData
            {
                public List<SongInfo> SongInfoDatabase = new List<SongInfo>();
            }
            #endregion
            #region Public Static Methods
            public static void Load()
            {
                CurrentConfigData = new ConfigData();

                if (File.Exists(ConfigFileName))
                {
                    string json = File.ReadAllText(ConfigFileName);

                    CurrentConfigData = Newtonsoft.Json.JsonConvert.DeserializeObject<ConfigData>(json);
                }
            }
            public static void Save()
            {
                string json = Newtonsoft.Json.JsonConvert.SerializeObject(CurrentConfigData);

                File.WriteAllText(ConfigFileName, json);
            }
            #endregion
        }
    }
    //Gets a list of all unique albums and the video IDs they contain.
    public static class AlbumInfoHelper
    {
        public static void Mainio()
        {
            Console.WriteLine("Loading song database from SongInfoHelper...");

            SongInfoHelper.Config.Load();

            List<SongInfoHelper.SongInfo> songInfoDatabase = SongInfoHelper.Config.SongInfoDatabase;

            Console.WriteLine("Loaded song database from SongInfoHelper.");

            Config.AlbumInfoDatabase = new List<AlbumInfo>();

            foreach (SongInfoHelper.SongInfo song in songInfoDatabase)
            {
                try
                {
                    bool createNewAlbum = true;

                    foreach (AlbumInfo album in Config.AlbumInfoDatabase)
                    {
                        if (album.AlbumName == song.SongAlbum)
                        {
                            List<string> overlaps = Overlaps(album.AlbumArtists, song.SongArtists);

                            if (overlaps.Count > 0)
                            {
                                album.Songs.Add(song);
                                album.AlbumArtists = overlaps;
                                createNewAlbum = false;
                                break;
                            }
                        }
                    }

                    if (createNewAlbum)
                    {
                        AlbumInfo newAlbum = new AlbumInfo();

                        newAlbum.AlbumName = song.SongAlbum;
                        newAlbum.AlbumArtists = new List<string>(song.SongArtists);
                        newAlbum.Songs.Add(song);

                        Config.AlbumInfoDatabase.Add(newAlbum);
                    }

                    Console.WriteLine($"Processed song with id {song.VideoID}.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Unable to parse song with id {song.VideoID} due to error {ex.Message}.");
                }
            }

        PressAnyKeyToExit:
            Config.Save();

            Console.WriteLine("Press any key to exit...");
            Stopwatch bufferConsumeStopwatch = Stopwatch.StartNew();
            while (true)
            {
                Console.ReadKey(true);
                if (bufferConsumeStopwatch.ElapsedMilliseconds > 1000)
                {
                    break;
                }
            }
            Environment.Exit(0);
        }
        public sealed class AlbumInfo
        {
            public string AlbumName = "";
            public List<string> AlbumArtists = new List<string>();
            public List<SongInfoHelper.SongInfo> Songs = new List<SongInfoHelper.SongInfo>();
        }
        private static List<string> Overlaps(List<string> listA, List<string> listB)
        {
            List<string> output = new List<string>();

            if (listB.Count < listA.Count)
            {
                List<string> temp = listA;
                listA = listB;
                listB = temp;
            }

            foreach (string sA in listA)
            {
                foreach (string sB in listB)
                {
                    if (sA == sB)
                    {
                        output.Add(sA);
                        break;
                    }
                }
            }

            return output;
        }
        public static class Config
        {
            #region Public Const Variables
            public const string ConfigFileName = "AlbumInfoConfig.json";
            #endregion
            #region Public Static Variables
            public static List<AlbumInfo> AlbumInfoDatabase
            {
                get
                {
                    return CurrentConfigData.AlbumInfoDatabase;
                }
                set
                {
                    CurrentConfigData.AlbumInfoDatabase = value;
                }
            }
            #endregion
            #region Private Static Variables
            private static ConfigData CurrentConfigData = new ConfigData();
            #endregion
            #region Private Sub-Classes
            private sealed class ConfigData
            {
                public List<AlbumInfo> AlbumInfoDatabase = new List<AlbumInfo>();
            }
            #endregion
            #region Public Static Methods
            public static void Load()
            {
                CurrentConfigData = new ConfigData();

                if (File.Exists(ConfigFileName))
                {
                    string json = File.ReadAllText(ConfigFileName);

                    CurrentConfigData = Newtonsoft.Json.JsonConvert.DeserializeObject<ConfigData>(json);
                }
            }
            public static void Save()
            {
                string json = Newtonsoft.Json.JsonConvert.SerializeObject(CurrentConfigData);

                File.WriteAllText(ConfigFileName, json);
            }
            #endregion
        }
    }
    //Gets the album covers for youtube music albums.
    public static class AlbumCoverScraper
    {
        public static void Main()
        {
            Console.WriteLine("Loading album database from AlbumInfoHelper...");

            AlbumInfoHelper.Config.Load();

            List<AlbumInfoHelper.AlbumInfo> albumInfoDatabase = new List<AlbumInfoHelper.AlbumInfo>(AlbumInfoHelper.Config.AlbumInfoDatabase);

            Console.WriteLine("Loaded album database from AlbumInfoHelper.");

            Config.AlbumCoverInfoDatabase = new List<AlbumCoverInfo>();

            Console.WriteLine("Downloading album covers...");

            if (!Directory.Exists("AlbumCovers"))
            {
                Directory.CreateDirectory("AlbumCovers");
            }

            WebClient client = new WebClient();
            client.Headers.Add("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36");
            client.Headers.Add("Referer", "https://www.youtube.com/");

            foreach (AlbumInfoHelper.AlbumInfo album in albumInfoDatabase)
            {
                try
                {
                    AlbumCoverInfo albumCoverInfo = new AlbumCoverInfo();
                    albumCoverInfo.AlbumName = album.AlbumName;
                    albumCoverInfo.AlbumArtists = new List<string>(album.AlbumArtists);
                    albumCoverInfo.AlbumCoverSourceVideoID = album.Songs[0].VideoID;

                    if (!File.Exists($"AlbumCovers\\{albumCoverInfo.AlbumCoverSourceVideoID}.jpg"))
                    {
                        client.DownloadFile($"https://i.ytimg.com/vi/{albumCoverInfo.AlbumCoverSourceVideoID}/hqdefault.jpg", $"AlbumCovers\\{albumCoverInfo.AlbumCoverSourceVideoID}.jpg");

                        Thread.Sleep(500);
                    }

                    if (album.AlbumArtists.Count > 0)
                    {
                        Console.WriteLine($"Processed album {album.AlbumName} by {album.AlbumArtists[0]}.");
                    }
                    else
                    {
                        Console.WriteLine($"Processed album {album.AlbumName} by null.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Unable to process album {album.AlbumName} due to error {ex.Message}.");
                }
            }

            client.Dispose();

        PressAnyKeyToExit:
            Config.Save();

            Console.WriteLine("Press any key to exit...");
            Stopwatch bufferConsumeStopwatch = Stopwatch.StartNew();
            while (true)
            {
                Console.ReadKey(true);
                if (bufferConsumeStopwatch.ElapsedMilliseconds > 1000)
                {
                    break;
                }
            }
            Environment.Exit(0);
        }
        public sealed class AlbumCoverInfo
        {
            public string AlbumName = "";
            public List<string> AlbumArtists = new List<string>();
            public string AlbumCoverSourceVideoID = "";
        }
        public static class Config
        {
            #region Public Const Variables
            public const string ConfigFileName = "AlbumCoverInfoConfig.json";
            #endregion
            #region Public Static Variables
            public static List<AlbumCoverInfo> AlbumCoverInfoDatabase
            {
                get
                {
                    return CurrentConfigData.AlbumCoverInfoDatabase;
                }
                set
                {
                    CurrentConfigData.AlbumCoverInfoDatabase = value;
                }
            }
            #endregion
            #region Private Static Variables
            private static ConfigData CurrentConfigData = new ConfigData();
            #endregion
            #region Private Sub-Classes
            private sealed class ConfigData
            {
                public List<AlbumCoverInfo> AlbumCoverInfoDatabase = new List<AlbumCoverInfo>();
            }
            #endregion
            #region Public Static Methods
            public static void Load()
            {
                CurrentConfigData = new ConfigData();

                if (File.Exists(ConfigFileName))
                {
                    string json = File.ReadAllText(ConfigFileName);

                    CurrentConfigData = Newtonsoft.Json.JsonConvert.DeserializeObject<ConfigData>(json);
                }
            }
            public static void Save()
            {
                string json = Newtonsoft.Json.JsonConvert.SerializeObject(CurrentConfigData);

                File.WriteAllText(ConfigFileName, json);
            }
            #endregion
        }
    }
}