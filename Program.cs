using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.IO;

public static class Program
{
    private static string clientID = "";
    private static string clientSecret = "";
    [STAThread]
    public static void Main()
    {
        try
        {
            string desktopFolderPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string ytDataDownloaderPath = Path.Combine(desktopFolderPath, "YTVideos.json");
            string songDataParserPath = Path.Combine(desktopFolderPath, "YTMusicSongs.json");
            //YTDataDownloader.Run(clientID, clientSecret, ytDataDownloaderPath);
            //SongDataParser.Run(ytDataDownloaderPath, songDataParserPath);

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