using System.Collections.Generic;
using Newtonsoft.Json;
using System.Text;
using System.IO;

public static class GeneralHelper
{
    public static List<string> Split(string value, string separator)
    {
        List<string> output = new List<string>();
        while (true)
        {
            int i = value.IndexOf(separator);
            if (i == -1)
            {
                output.Add(value);
                break;
            }
            else
            {
                output.Add(value.Substring(0, i));
                value = value.Substring(i + separator.Length);

                if (value.Length == 0)
                {
                    output.Add("");
                    break;
                }
            }
        }
        return output;
    }
    public static void SaveJson<T>(T obj, string jsonFilePath)
    {
        string json = JsonConvert.SerializeObject(obj, Formatting.Indented);
        File.WriteAllText(jsonFilePath, json, Encoding.UTF8);
    }
    public static T LoadJson<T>(string jsonFilePath)
    {
        string json = File.ReadAllText(jsonFilePath, Encoding.UTF8);
        return JsonConvert.DeserializeObject<T>(json);
    }
}