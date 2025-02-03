// Approved 02/03/2025

using System;
using System.Collections.Generic;
using Google.Apis.YouTube.v3.Data;

public static class YTParsingHelper
{
    public static bool IsBlockedInUS(Video video)
    {
        if (video == null)
        {
            throw new Exception("video cannot be null.");
        }

        if (video.ContentDetails != null)
        {
            if (video.ContentDetails.RegionRestriction != null)
            {
                if (video.ContentDetails.RegionRestriction.Blocked != null)
                {
                    if (video.ContentDetails.RegionRestriction.Blocked.Contains("US"))
                    {
                        return true;
                    }
                }

                if (video.ContentDetails.RegionRestriction.Allowed != null)
                {
                    if (!video.ContentDetails.RegionRestriction.Allowed.Contains("US"))
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    }
    public static bool IsAgeRestricted(Video video)
    {
        if (video == null)
        {
            throw new Exception("video cannot be null.");
        }

        if (video.ContentDetails.ContentRating != null)
        {
            if (video.ContentDetails.ContentRating.YtRating == "ytAgeRestricted")
            {
                return true;
            }
        }

        return false;
    }
    public static bool IsPrivate(Video video)
    {
        if (video == null)
        {
            throw new Exception("video cannot be null.");
        }

        if (video.Status != null)
        {
            if (video.Status.PrivacyStatus != "public" && video.Status.PrivacyStatus != "unlisted")
            {
                return true;
            }
        }

        return false;
    }
    public static bool IsMadeForKids(Video video)
    {
        if (video == null)
        {
            throw new Exception("video cannot be null.");
        }

        if (video.Status != null)
        {
            if (video.Status.SelfDeclaredMadeForKids == true || video.Status.MadeForKids == true)
            {
                return true;
            }
        }

        return false;
    }
    public static DateTime ParseDate(string rawDate)
    {
        if (rawDate == null || rawDate == "")
        {
            throw new Exception("rawDate cannot be null or empty.");
        }

        return DateTime.Parse(rawDate);
    }
    public static TimeSpan ParseDuration(string rawDuration)
    {
        if (rawDuration == null || rawDuration == "")
        {
            throw new Exception("rawDuration cannot be null or empty.");
        }

        // System.Xml.XmlConvert.ToTimeSpan can handle ISO 8601 durations
        return System.Xml.XmlConvert.ToTimeSpan(rawDuration);
    }
    public static Thumbnail GetBestThumbnail(ThumbnailDetails thumbnails)
    {
        if (thumbnails == null)
        {
            throw new Exception("thumbnails cannot be null.");
        }

        long bestSize = 0;
        Thumbnail best = null;
        Thumbnail[] thumbnailList = new Thumbnail[5] {
            thumbnails.Default__,
            thumbnails.High,
            thumbnails.Maxres,
            thumbnails.Medium,
            thumbnails.Standard
        };
        foreach (Thumbnail thumbnail in thumbnailList)
        {
            if (thumbnail == null)
            {
                continue;
            }
            long size = (long)thumbnail.Width * (long)thumbnail.Height;
            if (size > bestSize)
            {
                best = thumbnail;
                bestSize = size;
            }
        }
        return best;
    }
    public static MusicDescription ParseMusicDescription(string description, string videoID)
    {
        if (description == null || description == "")
        {
            throw new Exception("description cannot be null or empty.");
        }
        if (videoID == null || videoID == "")
        {
            throw new Exception("videoID cannot be null or empty.");
        }

        MusicDescription output = new MusicDescription();
        output.VideoID = videoID;
        description = description.Replace("\r\n", "\n");
        List<string> sections = GeneralHelper.Split(description, "\n\n");

        if (HelperParseProvidedBy(sections.Count > 0 ? sections[0] : null, output))
        {
            sections.RemoveAt(0);
        }
        HelperParseSongAndArtist(sections.Count > 0 ? sections[0] : null, output);
        {
            sections.RemoveAt(0);
        }
        HelperParseAlbumName(sections.Count > 0 ? sections[0] : null, output);
        {
            sections.RemoveAt(0);
        }
        if (HelperParsePublishInfo(sections.Count > 0 ? sections[0] : null, output))
        {
            sections.RemoveAt(0);
        }
        if (HelperParseReleasedOn(sections.Count > 0 ? sections[0] : null, output))
        {
            sections.RemoveAt(0);
        }
        if (HelperParseRoleNamePairs(sections.Count > 0 ? sections[0] : null, output))
        {
            sections.RemoveAt(0);
        }
        HelperParseAutoGenerated(sections.Count > 0 ? sections[0] : null, output);
        {
            sections.RemoveAt(0);
        }

        if (sections.Count != 0)
        {
            throw new Exception("Too many sections were present in the given music description are unknown.");
        }

        return output;
    }
    private static bool HelperParseProvidedBy(string section, MusicDescription musicDescription)
    {
        if (section == "" || section == null)
        {
            return false;
        }
        if (!section.StartsWith("Provided to YouTube by "))
        {
            return false;
        }
        string providedBy = section.Substring("Provided to YouTube by ".Length);
        if (providedBy == "")
        {
            return false;
        }
        if (providedBy.Contains("\n"))
        {
            return false;
        }
        musicDescription.ProvidedBy = providedBy;
        return true;
    }
    private static void HelperParseSongAndArtist(string section, MusicDescription musicDescription)
    {
        if (section == null || section == "")
        {
            throw new Exception("No value provided for required section SongAndArtist.");
        }
        List<string> names = GeneralHelper.Split(section, " · ");
        if (names.Count < 2)
        {
            throw new Exception("Section SongAndArtist must contain at least 2 values.");
        }
        foreach (string name in names)
        {
            if (name == null || name == "")
            {
                throw new Exception("Name may not be null or empty.");
            }
            if (name.Contains("\n") || name.Contains("·"))
            {
                throw new Exception("Name contained invalid characters.");
            }
        }
        musicDescription.SongName = names[0];
        musicDescription.ArtistNames = new List<string>();
        for (int i = 1; i < names.Count; i++)
        {
            musicDescription.ArtistNames.Add(names[i]);
        }
    }
    private static void HelperParseAlbumName(string section, MusicDescription musicDescription)
    {
        if (section == null || section == "")
        {
            throw new Exception("No value provided for required section AlbumName.");
        }
        string albumName = section;
        if (albumName == null || albumName == "")
        {
            throw new Exception("AlbumName may not be null or empty.");
        }
        if (albumName.Contains("\n"))
        {
            throw new Exception("AlbumName contained invalid characters.");
        }
        musicDescription.AlbumName = albumName;
    }
    private static bool HelperParsePublishInfo(string section, MusicDescription musicDescription)
    {
        if (section == "" || section == null)
        {
            return false;
        }
        List<string> publishStatements = GeneralHelper.Split(section, "\n");
        foreach (string publishStatement in publishStatements)
        {
            if (publishStatement == "")
            {
                return false;
            }
            if (!publishStatement.StartsWith("℗ "))
            {
                return false;
            }
            if (publishStatement.Contains("\n"))
            {
                return false;
            }
        }
        musicDescription.PublishStatements = publishStatements;
        return true;
    }
    private static bool HelperParseReleasedOn(string section, MusicDescription musicDescription)
    {
        if (section == "" || section == null)
        {
            return false;
        }
        if (!section.StartsWith("Released on: "))
        {
            return false;
        }
        string releasedOnString = section.Substring("Released on: ".Length);
        if (releasedOnString == "")
        {
            return false;
        }
        if (releasedOnString.Contains("\n"))
        {
            return false;
        }
        try
        {
            musicDescription.ReleasedOn = ParseDate(releasedOnString);
            return true;
        }
        catch
        {
            return false;
        }
    }
    private static bool HelperParseRoleNamePairs(string section, MusicDescription musicDescription)
    {
        if (section == null)
        {
            return false;
        }
        string[] roleNamePairs = Split(section, "\n");
        Tuple<string, string>[] roleNamePairsParsed = new Tuple<string, string>[roleNamePairs.Length];
        for (int i = 0; i < roleNamePairs.Length; i++)
        {
            string roleNamePair = roleNamePairs[i];
            int index = roleNamePair.IndexOf(": ");
            if (index == -1)
            {
                return false;
            }
            string role = roleNamePair.Substring(0, index);
            string name = roleNamePair.Substring(index + ": ".Length);
            if (role == "")
            {
                return false;
            }
            if (role.Contains("\n"))
            {
                return false;
            }
            if (name == "")
            {
                return false;
            }
            if (name.Contains("\n"))
            {
                return false;
            }
            Tuple<string, string> roleNamePairParsed = new Tuple<string, string>(role, name);
            roleNamePairsParsed[i] = roleNamePairParsed;
        }
        musicDescription.RoleNamePairs = roleNamePairsParsed;
        return true;
    }
    private static void HelperParseAutoGenerated(string section, MusicDescription musicDescription)
    {
        if (section == null || section == "")
        {
            throw new Exception("No value provided for required section AutoGenerated.");
        }
        if (section != "Auto-generated by YouTube.")
        {
            throw new Exception("Malformatted AutoGenerated section.");
        }
    }
}