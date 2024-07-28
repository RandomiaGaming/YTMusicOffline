using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public static class DataOrganizer
{
    public static void LogUnliked()
    {
        YouTubeAPIHelper.VideoMeta[] likes = YouTubeAPIHelper.LoadData<YouTubeAPIHelper.VideoMeta[]>("C:\\Users\\RandomiaGaming\\Desktop\\YouTubeMusicData\\Likes.json");

        foreach(string playlistFile in Directory.GetFiles("C:\\Users\\RandomiaGaming\\Desktop\\YouTubeMusicData\\Playlists"))
        {
            YouTubeAPIHelper.VideoMeta[] videos = YouTubeAPIHelper.LoadData<YouTubeAPIHelper.VideoMeta[]>(playlistFile);

            foreach(var v in videos)
            {
                bool inLikes = false;

                foreach(var l in likes)
                {
                    if(v.VideoID == l.VideoID)
                    {
                        inLikes = true;
                        break;
                    }
                }

                if (!inLikes)
                {
                    VideoLauncher.Launch(v.VideoID);
                    Console.ReadLine();
                }
            }
        }
    }
}