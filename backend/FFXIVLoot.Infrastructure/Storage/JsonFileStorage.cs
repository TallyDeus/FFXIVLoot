using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.Json.Serialization;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Infrastructure.Storage;

/// <summary>
/// JSON converter for dictionaries with GearSlot enum keys
/// </summary>
public class GearSlotDictionaryConverter : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert)
    {
        if (!typeToConvert.IsGenericType)
            return false;

        var genericType = typeToConvert.GetGenericTypeDefinition();
        if (genericType != typeof(Dictionary<,>))
            return false;

        var keyType = typeToConvert.GetGenericArguments()[0];
        return keyType == typeof(GearSlot);
    }

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        var valueType = typeToConvert.GetGenericArguments()[1];
        var converterType = typeof(GearSlotDictionaryConverterInner<>).MakeGenericType(valueType);
        return (JsonConverter)Activator.CreateInstance(converterType)!;
    }

    private class GearSlotDictionaryConverterInner<TValue> : JsonConverter<Dictionary<GearSlot, TValue>>
    {
        public override Dictionary<GearSlot, TValue> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.StartObject)
                throw new JsonException();

            var dictionary = new Dictionary<GearSlot, TValue>();

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndObject)
                    return dictionary;

                if (reader.TokenType != JsonTokenType.PropertyName)
                    throw new JsonException();

                var propertyName = reader.GetString();
                if (!Enum.TryParse<GearSlot>(propertyName, true, out var key))
                    throw new JsonException($"Invalid GearSlot value: {propertyName}");

                reader.Read();
                var value = JsonSerializer.Deserialize<TValue>(ref reader, options);
                if (value != null)
                {
                    dictionary[key] = value;
                }
            }

            throw new JsonException();
        }

        public override void Write(Utf8JsonWriter writer, Dictionary<GearSlot, TValue> value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();

            foreach (var kvp in value)
            {
                writer.WritePropertyName(kvp.Key.ToString());
                JsonSerializer.Serialize(writer, kvp.Value, options);
            }

            writer.WriteEndObject();
        }
    }
}

/// <summary>
/// Generic JSON file storage utility for reading and writing JSON data
/// </summary>
public class JsonFileStorage
{
    private readonly string _filePath;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _fileLocks = new();
    private readonly SemaphoreSlim _lock;
    
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        IncludeFields = false,
        Converters = 
        { 
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase),
            new GearSlotDictionaryConverter() 
        }
    };

    /// <summary>
    /// Initializes a new instance of JsonFileStorage
    /// </summary>
    public JsonFileStorage(string filePath)
    {
        _filePath = Path.GetFullPath(filePath ?? throw new ArgumentNullException(nameof(filePath)));
        
        var directory = Path.GetDirectoryName(_filePath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }
        
        _lock = _fileLocks.GetOrAdd(_filePath, _ => new SemaphoreSlim(1, 1));
    }

    /// <summary>
    /// Reads data from the JSON file with file locking to prevent concurrent access issues
    /// </summary>
    public async Task<T?> ReadAsync<T>()
    {
        await _lock.WaitAsync();
        try
        {
            if (!File.Exists(_filePath))
            {
                return default;
            }

            var jsonContent = await File.ReadAllTextAsync(_filePath);
            if (string.IsNullOrWhiteSpace(jsonContent))
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(jsonContent, JsonOptions);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>
    /// Writes data to the JSON file with file locking to prevent concurrent access issues
    /// </summary>
    public async Task WriteAsync<T>(T data)
    {
        await _lock.WaitAsync();
        try
        {
            var jsonContent = JsonSerializer.Serialize(data, JsonOptions);
            
            var tempFilePath = _filePath + ".tmp";
            await File.WriteAllTextAsync(tempFilePath, jsonContent);
            
            File.Move(tempFilePath, _filePath, overwrite: true);
        }
        finally
        {
            _lock.Release();
        }
    }
}

