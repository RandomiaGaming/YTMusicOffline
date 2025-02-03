using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;

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
    public static string ReadLayer(string text, int index)
    {
        // 0 means in parenthesis ()
        // 1 means in brackets []
        // 2 means in curly brackets {}
        // 3 means in single quotes ''
        // 4 means in double quotes ""
        // 5 means in back ticks ``
        // 6 means in an escape sequence \

        if (text == null || text == "")
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
    public static void DownloadThumbnail(string outputFolderPath, Video video)
    {
        string thumbnailUrl = GetBestThumbnailUrl(video.Snippet.Thumbnails);
        byte[] payload = ReusableHttpClient.GetByteArrayAsync(thumbnailUrl).Result;
        Uri thumbnailUri = new Uri(thumbnailUrl);
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