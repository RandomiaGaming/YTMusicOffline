using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;

public static class BatchDownloader
{
    public static void RunThumbnails(string inputFilePath, string workingDirectory)
    {
        // Create WorkingDirectory/Thumbnails folder
        string thumbnailsFolderPath = Path.Combine(workingDirectory, "Thumbnails");
        if (!Directory.Exists(thumbnailsFolderPath))
        {
            Directory.CreateDirectory(thumbnailsFolderPath);
        }

        // Load list of songs from input file
        List<SongData> songs = SongDataParser.LoadData(inputFilePath);

        // Load YTThumbnailDownload.bat
        Assembly assembly = typeof(BatchDownloader).Assembly;
        Stream thumbnailDownloadStream = assembly.GetManifestResourceStream("YTMusicHelper.YTThumbnailDownload.bat");
        StreamReader thumbnailDownloadStreamReader = new StreamReader(thumbnailDownloadStream);
        string thumbnailDownload = thumbnailDownloadStreamReader.ReadToEnd();
        thumbnailDownloadStreamReader.Dispose();
        thumbnailDownloadStream.Dispose();

        // Calculate YTThumbnailDownload.bat file path
        string thumbnailDownloadPath = Path.Combine(workingDirectory, "YTThumbnailDownload.bat");

        for (int i = 0; i < songs.Count; i++)
        {
            if (!File.Exists(Path.Combine(workingDirectory, "Thumbnails", songs[i].VideoID + ".png")) && songs[i].VideoID != "Fa36lLGbfw8")
            {
                Console.WriteLine($"Downloading thumbnails {i}/{songs.Count}...");

                string customBat = thumbnailDownload.Replace("{VIDEOID}", songs[i].VideoID).Replace("{THUMBNAILURL}", songs[i].ThumbnailUrl);
                File.WriteAllText(thumbnailDownloadPath, customBat);

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd";
                psi.Arguments = "/C YTThumbnailDownload.bat";
                psi.WorkingDirectory = workingDirectory;

                Process p = Process.Start(psi);
                p.WaitForExit();
                if (p.ExitCode != 0)
                {
                    throw new Exception($"YTThumbnailDownload.bat failed with exit code {p.ExitCode}.");
                }
            }
        }
    }
}