// Approved 02/03/2025

using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

public static class YTAPIHelper
{
    private static bool _initCalled = false;
    private static string _clientID = null;
    private static string _clientSecret = null;
    public static void Init(string clientID, string clientSecret)
    {
        if (_initCalled)
        {
            throw new Exception("YTAPIHelper.Init has already been called.");
        }
        if (clientID == null || clientID == "")
        {
            throw new Exception("clientID may not be null or empty.");
        }
        if (clientSecret == null || clientSecret == "")
        {
            throw new Exception("clientSecret may not be null or empty.");
        }
        _clientID = clientID;
        _clientSecret = clientSecret;
        _initCalled = true;
    }
    public static void ClearCache()
    {
        IDataStore dataStore = new FileDataStore(GoogleWebAuthorizationBroker.Folder);
        dataStore.ClearAsync().GetAwaiter().GetResult();
    }
    private static bool _authCalled = false;
    private static YouTubeService _ytService = null;
    private static void HelperRequireAuth(string functionName)
    {
        if (!_initCalled)
        {
            throw new Exception($"YTAPIHelper.Init must be called before {functionName}.");
        }
        if (!_authCalled)
        {
            ClientSecrets clientSecrets = new ClientSecrets();
            clientSecrets.ClientId = _clientID;
            clientSecrets.ClientSecret = _clientSecret;

            Task<UserCredential> authorize = GoogleWebAuthorizationBroker.AuthorizeAsync(clientSecrets, new string[1] { YouTubeService.Scope.YoutubeReadonly }, "user", CancellationToken.None, null, null);
            UserCredential userCredential = authorize.GetAwaiter().GetResult();

            BaseClientService.Initializer initializer = new BaseClientService.Initializer();
            initializer.HttpClientInitializer = userCredential;

            _ytService = new YouTubeService(initializer);

            _authCalled = true;
        }
    }
    public static List<Playlist> EnumPlaylists(bool includeLikesList, bool includeLikedMusic)
    {
        // API COST:
        // ceil(numOfPlaylists / 50) "Plus 1 if includeLikesList or includeMusicLikes is true"
        
        // NKOWN ISSUE:
        // The Watch Later (WL) playlist cannot be enumerated with the API.
        // It always returns an empty playlist.

        HelperRequireAuth("EnumPlaylists");

        List<Playlist> playlists = new List<Playlist>();

        PlaylistsResource.ListRequest request = _ytService.Playlists.List("contentDetails,id,localizations,player,snippet,status");
        request.Mine = true;
        request.MaxResults = 50;
        request.PageToken = null;
        PlaylistListResponse response = null;

        do
        {
            response = request.Execute();

            for (int i = 0; i < response.Items.Count; i++)
            {
                playlists.Add(response.Items[i]);
            }

            request.PageToken = response.NextPageToken;
        }
        while (response.NextPageToken != null && response.NextPageToken != "");

        if (includeLikesList || includeLikedMusic)
        {
            request.Mine = null;
            request.PageToken = null;
            List<string> playlistIDs = new List<string>();
            if (includeLikesList)
            {
                playlistIDs.Add("LL");
            }
            if (includeLikedMusic)
            {
                playlistIDs.Add("LM");
            }
            request.Id = playlistIDs.ToArray();

            response = request.Execute();

            for (int i = 0; i < response.Items.Count; i++)
            {
                playlists.Add(response.Items[i]);
            }
        }

        return playlists;
    }
    public static List<PlaylistItem> EnumPlaylistItems(string playlistID)
    {
        // API COST:
        // ceil(numOfVideos / 50)
        
        if (playlistID == null || playlistID == "")
        {
            throw new Exception("playlistID may not be null or empty.");
        }

        HelperRequireAuth("EnumPlaylistItems");

        List<PlaylistItem> playlistItems = new List<PlaylistItem>();

        PlaylistItemsResource.ListRequest request = _ytService.PlaylistItems.List("contentDetails,id,snippet,status");
        request.PlaylistId = playlistID;
        request.MaxResults = 50;
        request.PageToken = null;
        PlaylistItemListResponse response = null;

        do
        {
            response = request.Execute();

            for (int i = 0; i < response.Items.Count; i++)
            {
                playlistItems.Add(response.Items[i]);
            }

            request.PageToken = response.NextPageToken;
        }
        while (response.NextPageToken != null && response.NextPageToken != "");

        return playlistItems;
    }
    public static List<Video> EnumVideos(List<string> videoIDs)
    {
        // API COST:
        // ceil(numOfVideos / 50)

        if (videoIDs == null || videoIDs.Count == 0)
        {
            throw new Exception("videoIDs cannot be null or empty.");
        }
        foreach (string videoID in videoIDs)
        {
            if (videoID == null || videoID == "")
            {
                throw new Exception("videoIDs cannot contain null or empty strings.");
            }
        }

        HelperRequireAuth("EnumVideos");

        int index = 0;
        List<Video> output = new List<Video>();

        VideosResource.ListRequest request = _ytService.Videos.List("contentDetails,id,liveStreamingDetails,localizations,paidProductPlacementDetails,player,recordingDetails,snippet,statistics,status,topicDetails");
        request.MaxResults = 50;
        request.PageToken = null;
        VideoListResponse response = null;

        do
        {
            List<string> nextVideoIDs = new List<string>();
            for (int i = 0; (i < request.MaxResults) && (index < videoIDs.Count); i++)
            {
                nextVideoIDs.Add(videoIDs[index]);
                index++;
            }
            request.Id = nextVideoIDs;

            response = request.Execute();

            for (int i = 0; i < response.Items.Count; i++)
            {
                output.Add(response.Items[i]);
            }
        }
        while (index < videoIDs.Count);

        return output;
    }
}