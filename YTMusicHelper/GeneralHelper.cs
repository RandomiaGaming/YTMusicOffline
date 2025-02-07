using System.Collections.Generic;
using Newtonsoft.Json;
using System.Text;
using System.IO;
using System.Linq;
using System;
using System.Threading;

public static class GeneralHelper
{
    private static Random _rng = new Random((int)DateTime.Now.Ticks);
    public static void RandomSleep(int minSeconds, int maxSeconds)
    {
        Thread.Sleep(_rng.Next(minSeconds, maxSeconds + 1) * 1000);
    }
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
    public static string ReadLayer(string value, int startIndex)
    {
        // 0 means in parenthesis ()
        // 1 means in brackets []
        // 2 means in curly brackets {}
        // 3 means in single quotes ''
        // 4 means in double quotes ""
        // 5 means in back ticks ``
        // 6 means in an escape sequence \

        if (value == null || value == "")
        {
            throw new Exception("value cannot be null or empty.");
        }
        if (startIndex < 0 || startIndex >= value.Length)
        {
            throw new Exception("startIndex must be within the bounds of the string.");
        }
        char firstChar = value[startIndex];
        if (!"([{\'\"`".Contains(value[startIndex]))
        {
            throw new Exception("startIndex must point to the beginning of a section.");
        }

        List<byte> contextStack = new List<byte>();
        int index = startIndex;
        while (true)
        {
            if (index >= value.Length)
            {
                throw new Exception("Unexpected end to string encountered.");
            }

            if (contextStack.Count > 0 && contextStack[contextStack.Count - 1] == 6)
            {
                contextStack.RemoveAt(contextStack.Count - 1);
                continue;
            }

            char c = value[startIndex];
            switch (c)
            {
                case '(':
                    contextStack.Add(0);
                    break;
                case '[':
                    contextStack.Add(1);
                    break;
                case '{':
                    contextStack.Add(2);
                    break;
                case ')':
                    if (contextStack[contextStack.Count - 1] == 0)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return value.Substring(index, (startIndex - index) + 1);
                        }
                    }
                    else
                    {
                        throw new Exception("Closing parenthesis was unexpected at this time.");
                    }
                    break;
                case ']':
                    if (contextStack[contextStack.Count - 1] == 1)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return value.Substring(index, (startIndex - index) + 1);
                        }
                    }
                    else
                    {
                        throw new Exception("Closing bracket was unexpected at this time.");
                    }
                    break;
                case '}':
                    if (contextStack[contextStack.Count - 1] == 2)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return value.Substring(index, (startIndex - index) + 1);
                        }
                    }
                    else
                    {
                        throw new Exception("Closing curly bracket was unexpected at this time.");
                    }
                    break;
                case '\'':
                    if (contextStack[contextStack.Count - 1] == 3)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return value.Substring(index, (startIndex - index) + 1);
                        }
                    }
                    else
                    {
                        contextStack.Add(3);
                    }
                    break;
                case '\"':
                    if (contextStack[contextStack.Count - 1] == 4)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return value.Substring(index, (startIndex - index) + 1);
                        }
                    }
                    else
                    {
                        contextStack.Add(4);
                    }
                    break;
                case '`':
                    if (contextStack[contextStack.Count - 1] == 5)
                    {
                        contextStack.RemoveAt(contextStack.Count - 1);
                        if (contextStack.Count == 0)
                        {
                            return value.Substring(index, (startIndex - index) + 1);
                        }
                    }
                    else
                    {
                        contextStack.Add(5);
                    }
                    break;
                case '\\':
                    contextStack.Add(6);
                    break;
            }

            startIndex++;
        }
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