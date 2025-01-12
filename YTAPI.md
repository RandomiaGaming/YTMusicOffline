# Setting Up Google Cloud
To get started go to https://console.cloud.google.com/ and sign in.
Next create a new project. IMPORTANT: Make sure you expand the hidden option and set the project id as this cannot be changed later.
Then search for YouTube Data API v3 and press enable.
Next return to https://console.cloud.google.com/ make sure your project is selected in the upper left and then press dashboard.
Expand the hamburger menu and press APIs & Services then select OAuth consent screen.
Select external and fill out the other info. Don't forget to add yourself as a test user when prompted.
Next on the left press Credentials and then Create Credentials then OAuth Client ID.
When creating your credentials make sure to set the application type to desktop app.
Make sure to write down the client ID and client secret.

# Setting Up C#
First open Visual Studio and create a new .NetFramework project. (.NetFramework version 4.6.2 or greater required.)
Then go to Tools>NuGet Package Manager>Manage NuGet Packages for Solution...
Under browse search for and install the latest version of Google.Apis.YouTube.v3.
Then you can authenticate with this function using the client id and secret you got before.
private static YouTubeService AuthYTService(string clientID, string clientSecret, bool clearCache = false)
{
    if (clearCache)
    {
        IDataStore dataStore = new FileDataStore(GoogleWebAuthorizationBroker.Folder);
        dataStore.ClearAsync().Wait();
    }
    ClientSecrets clientSecrets = new ClientSecrets();
    clientSecrets.ClientId = clientID;
    clientSecrets.ClientSecret = clientSecret;
    Task<UserCredential> authorize = GoogleWebAuthorizationBroker.AuthorizeAsync(clientSecrets, new string[1] { YouTubeService.Scope.YoutubeReadonly }, "user", CancellationToken.None, null, null);
    authorize.Wait();
    UserCredential userCredential = authorize.Result;
    BaseClientService.Initializer initializer = new BaseClientService.Initializer();
    initializer.HttpClientInitializer = userCredential;
    YouTubeService youtubeService = new YouTubeService(initializer);
    return youtubeService;
}

# Testing APIs From Your Browser
Okie so now we have a hello world C# app that can link with the YouTube API but it does nothing.
To make our app more intresting we can read the documentation at https://developers.google.com/youtube/v3/docs
Look at some samples at https://developers.google.com/youtube/v3/code_samples/dotnet
Or use my favorite feature which is the API explorer.
It's very confusing to get to the API explorer since the main link is broken.
I got to it by going to Samples>Use cases and code samples and then pressing the </> next to an API endpoint.
Don't forget to make it fullscreen and then you can test apis and see what data they return.

# Documentation
Don't forget you can click on Refrence and then select and API endpoint from the left and scroll down to see what
each of the parameters does and all possible values for each parameter. It even includes all possible errors.
It also show's quota costs for each API!

# Data We Can And Cannot Get
