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
            //YTDataDownloader.Run(clientID, clientSecret);
            //SongDataParser.Run();
            string desktopFolderPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string outputFilePath = Path.Combine(desktopFolderPath, "YTMusicSongData.json");
            List<SongData> songs = SongDataParser.LoadData(outputFilePath);
            Random rng = new Random((int)DateTime.Now.Ticks);
            while (true)
            {
                Process.Start($"https://music.youtube.com/watch?v={songs[rng.Next(0, songs.Count)].VideoID}");
                Console.WriteLine("All tasks completed successfully.");
                PressAnyKeyToExit();
            }
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