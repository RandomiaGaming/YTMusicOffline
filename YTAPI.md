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
https://developers.google.com/youtube/v3/code_samples/code_snippets

# Documentation
Don't forget you can click on Refrence and then select and API endpoint from the left and scroll down to see what
each of the parameters does and all possible values for each parameter. It even includes all possible errors.
It also show's quota costs for each API!

# YouTube Music Auto-Generated Descriptions
All songs on YouTube music are actually just videos.
You can convert from a song to a video by pressing share and then copying the video id.
This id will look something like https://music.youtube.com/watch?v=Ws2gU9A-vsw&si=gmhvuAIvuqS57o1o
where the part between ?v= and &si= is the video id. So in this case the id is "Ws2gU9A-vsw".
Note that the rules of URL variable encoding can be used to extract this information.
Once you have the video ID of a song simply go to https://www.youtube.com/watch?v=Ws2gU9A-vsw
but replace "Ws2gU9A-vsw" with your actual video id.
From here you can see how YouTube music works under the hood.
Each YouTube music artist is given a topic channel which will look like ArtistName - Topic.
It is easy enough to check if a song was uploaded by one of these auto generated artist topic channels
by simply removing the " - Topic" suffix if present.
To extract data from the description note that YouTube music auto generates a description with several
key peices of information about the given song.
These peices of information are split into sections and key value pairs.
Each section is separated with a double newline so "\n\n".
Note that all auto generated YouTube music descriptions use Unix line endings not Windows so prepare for \n not \r\n.
Next we have the sections. In order from first to last we have:

Section 0: Provided By Section
Example: "Provided to YouTube by The Orchard Enterprises"
Format: Starts with the text "Provided to YouTube by " then the name of the primary record label.
MultiLine: False
Optional: True

Section 1: Song And Artist Name Section
Example: "SLOW DANCING IN THE DARK · Joji · George Miller · Patrick Wimberly"
Format: An array of strings separated by the string " · ".
The array always contains at least 2 elements with element 0 being the song name and element 1 being the primary artist name.
Additional elements represent other secondary artists who worked on this song.
Empty strings are not premitted in this array.
MultiLine: False
Optional: False

Section 2: Album Name Section
Example: "BALLADS 1"
Format: Simply contains the album name in raw text.
MultiLine: False
Optional: False

Section 3: Publish Info Section
Example: "℗ 2011 M83 Recording Inc. under exclusive license to Mute for North America. All rights reserved.\n℗ 2011 Naive|M83 Recording Inc\n℗ M83 Recording Inc / naïve"
Format: Contains multiple lines which all begin with the string "℗ " then publishing information.
There is a reason to the madness but I don't really care about this info enough to parse it completely.
Suffice it to say it's usually in the form "℗ {PublishingNotes}{; or ,} ℗ {Year} {Publisher}".
MultiLine: True
Optional: True

Section 4: Released On Section
Example: "Released on: 2018-10-26"
Format: Starts with the string "Released on: " followed by a date in the form "yyyy-mm-dd".
MultiLine: False
Optional: True

Section 5: Name And Role Section
Example: "Producer: Joji\nProducer: Patrick Wimberly\nMastering Engineer: Chris Athens\nMusic  Publisher: George Miller - 88rising Publishing / Kobalt Songs Music Publishing (ASCAP)\nMusic  Publisher: Patrick Wimberly - Jonathan Patrick Wimberly Publishing(SESAC)/Kobalt Group Music Publishing (SESAC)"
Format: Split into lines separated by "\n" with no empty lines.
Each line is in the form "{Role}: {Name}".
Note that names can be the names of companies not just individuals.
Bro I'm high key pressed at YouTube music rn. What in the actual formatting fuck is this "Producer: Dirty Rush: Konrad Grela / Gregor Es: Grzegorz Surzyn".
MultiLine: True
Optional: True

Section 6: Auto-generated Tagline Section
Example: "Auto-generated by YouTube."
Format: Contains the exact text "Auto-generated by YouTube.".
This marks the video description as a YouTube music auto-generated description instead of a normal user inputted video description.
MultiLine: False
Optional: False

# Unavailible YTMusic videos
Some youtube music videos are unavailible when you try to download them.
This likely has to do with some weirdness with how youtube license songs for youtube music.
But don't worry we can still listen to and download these songs.
We can tell we have one of these weird videos in multiple ways:
1. It fails to download with the error video unavailible.
2. It shows as blocked in every country in the metadata.
3. It has videos.items[0].contentDetails.licensedContent == false
Because it is marked as blocked in all countries when we try to watch the video from youtube.com
it won't work, but if we navigate to music.youtube.com instead it suddenly works like magic.
So how does this happen?
Well under the hood youtube music swaps out the video id to a new one which isn't blocked anymore.
We can actually see this happen in the url bar.
So how do we get this non-blocked url from a blocked one.
First use the command below to download the html:
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" https://music.youtube.com/watch?v={VIDEOIDHERE} > ytmusic.html
Then parse through the html for strings starting with "ytcfg.set(" and read until the matching end parenthese.
There may be multiple matches and we want them all.
These strings are json strings which must be parsed.
Once parsed we should look through the json objects we found searching for one with an INITIAL_ENDPOINT field.
The INITIAL_ENDPOINT field contains another json string which must be parsed into another json object.
From there we can extract the value of initialEndpoint.watchEndpoint.videoId to get the video id of the non-blocked video.