using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public static class VideoLauncher
{
    public static void Launch(string videoID)
    {
        Process.Start($"https://www.youtube.com/watch?v={videoID}");
    }
}