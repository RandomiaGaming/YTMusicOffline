using System.Diagnostics;
using System.IO;
using System;
using System.Net.Http;
using Google.Apis.YouTube.v3.Data;
using Newtonsoft.Json.Linq;

public static class YTScrapper
{
    private static HttpClient _httpClient = HelperInitHttpClient();
    private static HttpClient HelperInitHttpClient()
    {
        // NOTE:
        // To dump your user agent run the following in the chrome developer console:
        // console.log(navigator.userAgent);

        HttpClient output = new HttpClient();
        string userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
        output.DefaultRequestHeaders.Add("User-Agent", userAgent);
        return output;
    }
    public static string GetRelocatedVideoID(string originalVdeoID)
    {
        string musicUrl = $"https://music.youtube.com/watch?v={originalVdeoID}";
        string html = _httpClient.GetStringAsync(musicUrl).Result;
        int ytcfgsetIndex = html.IndexOf("ytcfg.set");
        string json1 = GeneralHelper.ReadLayer(html, ytcfgsetIndex + "ytcfg.set".Length + 1);
        JObject jobj1 = JObject.Parse(json1);
        JToken initialEndpoint = jobj1.GetValue("INITIAL_ENDPOINT");
        string json2 = initialEndpoint.Value<string>();
        JObject jobj2 = JObject.Parse(json2);
        JToken watchEndpoint = jobj2.GetValue("watchEndpoint");
        JToken relocatedVideoID = watchEndpoint.Value<JObject>().GetValue("videoId");
        return relocatedVideoID.Value<string>();
    }
    public static void DownloadThumbnail(string outputFolderPath, Video video)
    {
        Thumbnail thumbnail = YTParsingHelper.GetBestThumbnail(video.Snippet.Thumbnails);
        byte[] payload = _httpClient.GetByteArrayAsync(thumbnail.Url).Result;
        Uri thumbnailUri = new Uri(thumbnail.Url);
        string ext = Path.GetExtension(thumbnailUri.AbsolutePath);
        string outputFilePath = Path.Combine(outputFolderPath, video.Id + ext);
        File.WriteAllBytes(outputFilePath, payload);
    }
    public static void YTDLPDownload(string videoID, string workingFolderPath, string songsFolderPath)
    {
        if (Directory.GetFiles(workingFolderPath).Length != 0)
        {
            throw new Exception("Working folder was not empty.");
        }
        string command = $"D:\\ImportantData\\Utilities\\YTDLP\\yt-dlp.exe --limit-rate 1.0M --sleep-interval 0 --max-sleep-interval 3 --abort-on-error --abort-on-unavailable-fragments --force-overwrites --no-continue --verbose --format bestaudio --output {videoID}.%(ext)s https://www.youtube.com/watch?v={videoID} 1>ytdlp.log 2>&1 & exit /b %%ErrorLevel%%";
        ProcessStartInfo psi = new ProcessStartInfo();
        psi.WindowStyle = ProcessWindowStyle.Hidden;
        psi.WorkingDirectory = workingFolderPath;
        psi.FileName = "cmd.exe";
        psi.Arguments = $"/c {command}";
        psi.UseShellExecute = true;
        Process p = Process.Start(psi);
        p.WaitForExit();
        if (p.ExitCode != 0)
        {
            File.Move(Path.Combine(workingFolderPath, "ytdlp.log"), Path.Combine(songsFolderPath, videoID + ".log"));
            ConsoleColor originalColor = Console.ForegroundColor;
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"An error occured while downloading videoID \"{videoID}\" the log has been moved to the output folder!");
            Console.ForegroundColor = originalColor;
        }
        else
        {
            File.Delete(Path.Combine(workingFolderPath, "ytdlp.log"));
            string[] filesInWorkingFolder = Directory.GetFiles(workingFolderPath);
            if (filesInWorkingFolder.Length != 1 || !filesInWorkingFolder[0].StartsWith(workingFolderPath + "\\" + videoID + "."))
            {
                throw new Exception("Something was wrong with the output in the working folder.");
            }
            string finalFilePath = Path.Combine(songsFolderPath, videoID + Path.GetExtension(filesInWorkingFolder[0]));
            File.Move(filesInWorkingFolder[0], finalFilePath);
        }
    }
}