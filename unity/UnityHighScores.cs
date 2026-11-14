using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class UnityHighScores : MonoBehaviour
{
    [SerializeField] private string apiBaseUrl = "http://localhost:3000/api";

    [Serializable]
    public class Score
    {
        public string username;
        public int points;
        public long timestamp;
        public int placement;
    }

    [Serializable]
    public class ScoreList { public Score[] scores; }

    [Serializable]
    public class PlacementResponse
    {
        public bool found;
        public Score player;
        public int estimatedPlacement;
        public Score[] scores;
    }

    [Serializable]
    private class AddRequest { public string username; public int points; public long timestamp; }

    public IEnumerator GetHighScores(Action<ScoreList> onSuccess, Action<string> onError)
    {
        yield return Get("/high-scores", json => onSuccess?.Invoke(JsonUtility.FromJson<ScoreList>(json)), onError);
    }

    // Send the same timestamp returned from AddHighScore. Points are used only when it is not found.
    public IEnumerator GetMyPlacement(long timestamp, int points, Action<PlacementResponse> onSuccess, Action<string> onError)
    {
        string route = "/my-placement?timestamp=" + timestamp + "&points=" + points;
        yield return Get(route, json => onSuccess?.Invoke(JsonUtility.FromJson<PlacementResponse>(json)), onError);
    }

    public IEnumerator AddHighScore(string username, int points, long timestamp, Action<string> onSuccess, Action<string> onError)
    {
        var data = new AddRequest { username = username, points = points, timestamp = timestamp };
        string json = JsonUtility.ToJson(data);
        using (var request = new UnityWebRequest(apiBaseUrl.TrimEnd('/') + "/high-scores", "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success)
                onError?.Invoke(request.downloadHandler.text);
            else
                onSuccess?.Invoke(request.downloadHandler.text);
        }
    }

    // Use milliseconds since Unix epoch, not seconds.
    public static long GetTimestampMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    private IEnumerator Get(string route, Action<string> onSuccess, Action<string> onError)
    {
        using (var request = UnityWebRequest.Get(apiBaseUrl.TrimEnd('/') + route))
        {
            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success)
                onError?.Invoke(request.downloadHandler.text);
            else
                onSuccess?.Invoke(request.downloadHandler.text);
        }
    }
}
