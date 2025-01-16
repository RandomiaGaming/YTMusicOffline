using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public static class BatchDownloader
{
    public static void RunThumbnails(string inputFilePath, string workingDirectory)
    {
        List<SongData> songs = SongDataParser.LoadData(inputFilePath);

        for (int i = 0; i < songs.Count; i++)
        {

        }
    }
}
