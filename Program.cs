using System;
using System.Diagnostics;

public static class Program
{
    [STAThread]
    public static void Main()
    {
        try
        {
            string clientID = "";
            string clientSecret = "";
            string playlistsJsonFilePath = "D:\\ImportantData\\Coding\\YTMusicHelper\\Database - IMPORTANT\\Playlists.json";
            string playlistItemsJsonFilePath = "D:\\ImportantData\\Coding\\YTMusicHelper\\Database - IMPORTANT\\PlaylistItems.json";
            string videosJsonFilePath = "D:\\ImportantData\\Coding\\YTMusicHelper\\Database - IMPORTANT\\Videos.json";
            string altVideoIDPairsJsonFilePath = "D:\\ImportantData\\Coding\\YTMusicHelper\\Database - IMPORTANT\\AltVideoIDPairs.json";
            YTDataDownloader.Run(clientID, clientSecret, playlistsJsonFilePath, playlistItemsJsonFilePath, videosJsonFilePath, altVideoIDPairsJsonFilePath);

            //string ytMusicSongsFilePath = "D:\\ImportantData\\Coding\\YTMusicHelper\\Database - IMPORTANT\\Songs.json";
            //SongDataParser.Run(ytVideosDotJsonPath, ytMusicSongsDotJsonPath);

            //string workingDirectoryFolderPath = "D:\\ImportantData\\Coding\\YTMusicHelper\\Database - IMPORTANT\\WorkingDirectory";
            //BatchDownloader.RunThumbnails(ytMusicSongsDotJsonPath, workingDirectoryPath);
            
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