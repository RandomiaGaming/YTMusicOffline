using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public static class SongDataParser
{
    public static void Run()
    {

    }

    public sealed class SongData
    {
        public string VideoID;
        public string SongName;
        public string AlbumName;
        public ulong ReleasedDate;
        public string[] ArtistNames;
    }
}