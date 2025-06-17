using System.Collections.Generic;
using System;

public sealed class VideoRelocation
{
    public string OriginalVideoID = null;
    public string NewVideoID = null;
}
public sealed class Ghosts
{
    public List<string> RemovedVideoIDs = new List<string>();
    public List<string> UnavailableVideoIDs = new List<string>();
}
public sealed class Song
{
    public string VideoID = null;
    public string SongName = null;
    public string AlbumName = null;
    public string ArtistName = null;
    public List<string> FeaturedArtistNames = null;
    public DateTime ReleaseDate = new DateTime();
}
public sealed class MusicDescription
{
    public string VideoID = null;
    public string ProvidedBy = null;
    public string SongName = null;
    public List<string> ArtistNames = null;
    public string AlbumName = null;
    public List<string> PublishStatements = null;
    public DateTime? ReleasedOn = null;
    public List<Tuple<string, string>> RoleNamePairs = null;
}