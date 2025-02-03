using System;
using System.Collections.Generic;
using System.Diagnostics;
using Google.Apis.YouTube.v3.Data;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Linq;

public static class Program
{
    private const string _clientID = "";
    private const string _clientSecret = "";
    private const string _databaseFolderPath = "D:\\ImportantData\\Coding\\EzMusic\\Database\\";
    [STAThread]
    public static void Main()
    {
        try
        {
            EntryPoint();
            Console.WriteLine("All tasks completed successfully.");
            PressAnyKeyToExit();
        }
        catch (Exception ex)
        {
            ConsoleColor originalColor = Console.ForegroundColor;
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"ERROR: {ex.Message}");
            Console.ForegroundColor = originalColor;
            PressAnyKeyToExit();
        }
    }
    public static void EntryPoint()
    {
        YTAPIHelper.Init(_clientID, _clientSecret);

        #region Load playlists from json file or YouTube API if file does not exist
        List<Playlist> playlists = new List<Playlist>();
        {
            string playlistsJsonFilePath = Path.Combine(__databaseFolderPath, "Playlists.json");
            if (File.Exists(playlistsJsonFilePath))
            {
                Console.WriteLine($"Loading playlists from \"{playlistsJsonFilePath}\"...");
                playlists = GeneralHelper.LoadJson<List<Playlist>>(playlistsJsonFilePath);
            }
            else
            {
                Console.WriteLine("Enumerating playlists...");
                playlists = YTAPIHelper.EnumPlaylists(false, true);
                Console.WriteLine($"Saving playlists to \"{playlistsJsonFilePath}\"...");
                GeneralHelper.SaveJson(playlists, playlistsJsonFilePath);
            }
        }
        #endregion

        #region Load playlist items from json file or YouTube API if file does not exist
        List<PlaylistItem> playlistItems = new List<PlaylistItem>();
        {
            string playlistItemsJsonFilePath = Path.Combine(_databaseFolderPath, "PlaylistItems.json");
            if (File.Exists(playlistItemsJsonFilePath))
            {
                Console.WriteLine($"Loading playlist items from \"{playlistItemsJsonFilePath}\"...");
                playlistItems = GeneralHelper.LoadJson<List<PlaylistItem>>(playlistItemsJsonFilePath);
            }
            else
            {
                Console.WriteLine("Enumerating playlist items...");
                playlistItems = new List<PlaylistItem>();
                for (int i = 0; i < playlists.Count; i++)
                {
                    List<PlaylistItem> newPlaylistItems = YTAPIHelper.EnumPlaylistItems(playlists[i].Id);
                    playlistItems.AddRange(newPlaylistItems);
                }
                Console.WriteLine($"Saving playlist items to \"{playlistItemsJsonFilePath}\"...");
                GeneralHelper.SaveJson(playlistItems, playlistItemsJsonFilePath);
            }
        }
        #endregion

        List<Video> videos = new List<Video>();
        List<VideoRelocation> videoRelocations = new List<VideoRelocation>();
        Ghosts ghosts = new Ghosts();
        {
            #region Load videos from json file if file exists
            string videosJsonFilePath = Path.Combine(_databaseFolderPath, "Videos.json");
            if (File.Exists(videosJsonFilePath))
            {
                Console.WriteLine($"Loading videos from \"{videosJsonFilePath}\"...");
                videos = GeneralHelper.LoadJson<List<Video>>(videosJsonFilePath);
            }
            #endregion

            #region Load video relocations from json file if file exists
            string videoRelocationsJsonFilePath = Path.Combine(_databaseFolderPath, "VideoRelocations.json");
            if (File.Exists(videoRelocationsJsonFilePath))
            {
                Console.WriteLine($"Loading video relocations from \"{videoRelocationsJsonFilePath}\"...");
                videoRelocations = GeneralHelper.LoadJson<List<VideoRelocation>>(videoRelocationsJsonFilePath);
            }
            #endregion

            #region Load ghosts from json file if file exists
            string ghostsJsonFilePath = Path.Combine(_databaseFolderPath, "Ghosts.json");
            if (File.Exists(ghostsJsonFilePath))
            {
                Console.WriteLine($"Loading ghosts from \"{ghostsJsonFilePath}\"...");
                ghosts = GeneralHelper.LoadJson<Ghosts>(ghostsJsonFilePath);
            }
            #endregion

            while (true)
            {
                bool didSomething = false;

                #region Download videos from the YouTube API which haven't been downloaded already 
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
                    List<Video> newVideos = YTAPIHelper.EnumVideos(videoNeededVideoIDs);
                    videos.AddRange(newVideos);
                    foreach (Video newVideo in newVideos)
                    {
                        videoNeededVideoIDs.Remove(newVideo.Id);
                    }
                    ghosts.RemovedVideoIDs.AddRange(videoNeededVideoIDs);
                    Console.WriteLine($"Saving videos to \"{videosJsonFilePath}\"...");
                    GeneralHelper.SaveJson(videos, videosJsonFilePath);
                    Console.WriteLine($"Saving ghosts to \"{ghostsJsonFilePath}\"...");
                    GeneralHelper.SaveJson(ghosts, ghostsJsonFilePath);
                    didSomething = true;
                }
                #endregion

                #region WebScrape the video relocations which haven't been download already
                // Compute a list of video IDs we need relocations for
                List<string> relocationNeededVideoIDs = new List<string>();
                foreach (Video video in videos)
                {
                    if (YTParsingHelper.IsBlockedInUS(video))
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
                    GeneralHelper.SaveJson(videoRelocations, videoRelocationsJsonFilePath);
                    Console.WriteLine($"Saving ghosts to \"{ghostsJsonFilePath}\"...");
                    GeneralHelper.SaveJson(ghosts, ghostsJsonFilePath);
                    didSomething = true;
                }
                #endregion

                if (!didSomething)
                {
                    break;
                }
            }
        }

        #region Load music descriptions from json file or by parsing videos if file does not exist
        List<MusicDescription> musicDescriptions = new List<MusicDescription>();
        {
            string musicDescriptionsJsonFilePath = Path.Combine(_databaseFolderPath, "MusicDescriptions.json");
            if (File.Exists(musicDescriptionsJsonFilePath))
            {
                Console.WriteLine($"Loading music descriptions from \"{musicDescriptionsJsonFilePath}\"...");
                musicDescriptions = GeneralHelper.LoadJson<List<MusicDescription>>(musicDescriptionsJsonFilePath);
            }
            else
            {
                Console.WriteLine("Parsing music descriptions...");
                foreach (Video video in videos)
                {
                    MusicDescription newMusicDescription = YTParsingHelper.ParseMusicDescription(video.Snippet.Description, video.Id);
                    if (newMusicDescription != null)
                    {
                        musicDescriptions.Add(newMusicDescription);
                    }
                }
                Console.WriteLine($"Saving music descriptions to \"{musicDescriptionsJsonFilePath}\"...");
                GeneralHelper.SaveJson(musicDescriptions, musicDescriptionsJsonFilePath);
            }
        }
        #endregion

        #region Load songs from json file or by parsing database if file does not exist
        List<Song> songs = new List<Song>();
        {
            string songsJsonFilePath = Path.Combine(_databaseFolderPath, "Songs.json");
            if (File.Exists(songsJsonFilePath))
            {
                Console.WriteLine($"Loading songs from \"{songsJsonFilePath}\"...");
                songs = GeneralHelper.LoadJson<List<Song>>(songsJsonFilePath);
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
                GeneralHelper.SaveJson(songs, songsJsonFilePath);
            }
        }
        #endregion

        #region Download each song's thumbnail if it doesn't already exist
        {
            Console.WriteLine("Downloading thumbnails...");
            string thumbnailsFolderPath = Path.Combine(_databaseFolderPath, "RawThumbnails");
            if (!Directory.Exists(thumbnailsFolderPath))
            {
                Directory.CreateDirectory(thumbnailsFolderPath);
            }
            for (int i = 0; i < songs.Count; i++)
            {
                Song song = songs[i];
                string[] matchFiles = Directory.GetFiles(thumbnailsFolderPath, song.VideoID + ".*");
                if (matchFiles.Length > 0)
                {
                    continue;
                }
                Console.WriteLine($"Progress {i + 1} of {songs.Count} at {DateTime.Now}...");
                Video matchingVideo = null;
                foreach (Video video in videos)
                {
                    if (video.Id == song.VideoID)
                    {
                        matchingVideo = video;
                        break;
                    }
                }
                DownloadThumbnail(thumbnailsFolderPath, matchingVideo);
            }
        }
        #endregion

        #region Download each song if it doesn't already exist
        {
            Console.WriteLine("Downloading songs this will take a really long time...");
            string songsFolderPath = Path.Combine(_databaseFolderPath, "RawSongs");
            if (!Directory.Exists(songsFolderPath))
            {
                Directory.CreateDirectory(songsFolderPath);
            }
            string workingFolderPath = Path.Combine(_databaseFolderPath, "WorkingDirectory");
            if (!Directory.Exists(workingFolderPath))
            {
                Directory.CreateDirectory(workingFolderPath);
            }
            for (int i = 0; i < songs.Count; i++)
            {
                Song song = songs[i];
                string[] matchFiles = Directory.GetFiles(songsFolderPath, song.VideoID + ".*");
                if (matchFiles.Length == 1)
                {
                    string ext = Path.GetExtension(matchFiles[0]);
                    if (ext.ToLower() == ".log")
                    {
                        string log = File.ReadAllText(matchFiles[0]);
                        string[] logLines = log.Replace("\r\n", "\n").Split('\n');
                        foreach (string logLine in logLines)
                        {
                            if (logLine.StartsWith("ERROR: "))
                            {
                                if (logLine == $"ERROR: [youtube] {song.VideoID}: This video is only available to Music Premium members")
                                {
                                    // Only premium
                                }
                                else if (logLine.StartsWith($"ERROR: [youtube] {song.VideoID}: Sign in to confirm your age. This video may be inappropriate for some users"))
                                {

                                }
                                else
                                {
                                    // Other aaaaaah
                                }
                            }
                        }
                    }
                }
                else if (matchFiles.Length > 0)
                {
                    throw new Exception($"Da fuc. Check the rawsongs dir theres duplicates of video id {song.VideoID}.");
                }
                else
                {
                    Console.WriteLine($"Progress {i + 1} of {songs.Count} at {DateTime.Now}...");
                    YTDLPDownload(song.VideoID, workingFolderPath, songsFolderPath);
                    Thread.Sleep(1000 * RNG.Next(0, 15));
                }
            }
        }
        #endregion

        // TODO
        // Convert Thumbnails
        // Convert Videos
        // Auto Generate SongsLoader.js
    }
    public static void PressAnyKeyToExit()
    {
        Console.WriteLine();
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
    }
}