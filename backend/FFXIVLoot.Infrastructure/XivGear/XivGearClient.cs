using System.Text.Json;
using System.Text.RegularExpressions;
using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;
using FFXIVLoot.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace FFXIVLoot.Infrastructure.XivGear;

/// <summary>
/// Client for interacting with the xivgear API to import best-in-slot lists
/// </summary>
public class XivGearClient : IXivGearClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<XivGearClient>? _logger;
    private const string XivGearApiBaseUrl = "https://api.xivgear.app";
    private const string XivGearDataBaseUrl = "https://data.xivgear.app";
    private readonly Dictionary<int, string> _itemNameCache = new();
    private Dictionary<string, ItemType>? _slotTypeMap = null;

    /// <summary>
    /// Initializes a new instance of the XivGearClient
    /// </summary>
    public XivGearClient(HttpClient httpClient, ILogger<XivGearClient>? logger = null)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _logger = logger;
        _httpClient.BaseAddress = new Uri(XivGearApiBaseUrl);
    }

    /// <summary>
    /// Imports a best-in-slot list from a xivgear link
    /// </summary>
    public async Task<List<GearItem>> ImportBiSFromLinkAsync(string xivGearLink)
    {
        if (string.IsNullOrWhiteSpace(xivGearLink))
        {
            throw new ArgumentException("XivGear link cannot be null or empty", nameof(xivGearLink));
        }

        string jsonContent;
        string? job = null;
        Dictionary<int, (string name, ItemType type)>? itemInfoFromHtml = null;

        try
        {
            itemInfoFromHtml = await ParseItemInfoFromHtmlAsync(xivGearLink);
            _logger?.LogInformation("Parsed {Count} items from HTML", itemInfoFromHtml?.Count ?? 0);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to parse HTML, falling back to API method");
        }

        var bisInfo = ExtractBisInfoFromLink(xivGearLink);
        if (bisInfo != null)
        {
            var response = await _httpClient.GetAsync($"/fulldata/bis/{bisInfo.Job}/{bisInfo.Type}");
            response.EnsureSuccessStatusCode();
            jsonContent = await response.Content.ReadAsStringAsync();
            job = bisInfo.Job;
        }
        else
        {
            var setId = ExtractSetIdFromLink(xivGearLink);
            if (string.IsNullOrEmpty(setId))
            {
                throw new ArgumentException("Invalid xivgear link format. Expected format: ?page=sl|{setId} or ?page=bis|{job}|{type}", nameof(xivGearLink));
            }

            var response = await _httpClient.GetAsync($"/shortlink/{setId}");
            response.EnsureSuccessStatusCode();
            jsonContent = await response.Content.ReadAsStringAsync();
            
            using (var doc = JsonDocument.Parse(jsonContent))
            {
                if (doc.RootElement.TryGetProperty("job", out var jobElement))
                {
                    job = jobElement.GetString();
                }
            }
        }

        if (itemInfoFromHtml != null && itemInfoFromHtml.Count > 0)
        {
            foreach (var kvp in itemInfoFromHtml)
            {
                _itemNameCache[kvp.Key] = kvp.Value.name;
            }
        }
        
        if (!string.IsNullOrEmpty(job))
        {
            await LoadItemNamesAsync(job);
        }

        var gearItems = await ParseXivGearResponseAsync(jsonContent, itemInfoFromHtml);

        return gearItems;
    }

    /// <summary>
    /// Extracts BiS information from a xivgear link
    /// </summary>
    private static BisLinkInfo? ExtractBisInfoFromLink(string link)
    {
        var match = Regex.Match(link, @"[?&]page=bis\|([^|&]+)\|([^&]+)", RegexOptions.IgnoreCase);
        if (match.Success && match.Groups.Count >= 3)
        {
            return new BisLinkInfo
            {
                Job = match.Groups[1].Value.ToLowerInvariant(),
                Type = match.Groups[2].Value.ToLowerInvariant()
            };
        }
        return null;
    }

    /// <summary>
    /// Extracts the set ID from a xivgear link
    /// </summary>
    private static string? ExtractSetIdFromLink(string link)
    {
        var match = Regex.Match(link, @"[?&]page=sl\|([a-f0-9\-]+)", RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : null;
    }

    /// <summary>
    /// Information extracted from a bis| format link
    /// </summary>
    private class BisLinkInfo
    {
        public string Job { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    /// <summary>
    /// Loads item names from xivgear's item data endpoint
    /// </summary>
    private async Task LoadItemNamesAsync(string job)
    {
        try
        {
            using var dataClient = new HttpClient();
            dataClient.BaseAddress = new Uri(XivGearDataBaseUrl);
            dataClient.Timeout = TimeSpan.FromSeconds(30); // Large file, may take time

            var response = await dataClient.GetAsync($"/Items?job={job}");
            if (!response.IsSuccessStatusCode)
            {
                return; // If we can't load item names, we'll use placeholders
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(jsonContent);
            var root = document.RootElement;

            if (root.TryGetProperty("items", out var itemsElement) && itemsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in itemsElement.EnumerateArray())
                {
                    if (item.TryGetProperty("rowId", out var rowIdElement) && 
                        item.TryGetProperty("name", out var nameElement))
                    {
                        var itemId = rowIdElement.GetInt32();
                        var itemName = nameElement.GetString();
                        
                        if (itemId > 0 && !string.IsNullOrEmpty(itemName))
                        {
                            _itemNameCache[itemId] = itemName;
                        }
                    }
                }
            }
        }
        catch
        {
        }
    }

    /// <summary>
    /// Parses HTML from xivgear page to extract item names and types
    /// </summary>
    private async Task<Dictionary<int, (string name, ItemType type)>> ParseItemInfoFromHtmlAsync(string xivGearLink)
    {
        var itemInfo = new Dictionary<int, (string name, ItemType type)>();
        
        try
        {
            using var htmlClient = new HttpClient();
            htmlClient.Timeout = TimeSpan.FromSeconds(30);
            htmlClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            
            var response = await htmlClient.GetAsync(xivGearLink);
            response.EnsureSuccessStatusCode();
            var htmlContent = await response.Content.ReadAsStringAsync();
            
            _logger?.LogInformation("Fetched HTML content, length: {Length}", htmlContent.Length);
            
            // First, try to find slot type patterns directly in the HTML text
            // Look for patterns like "Body: i790 Aug. Tome" or "Feet: i790 Raid"
            var slotTypeMap = new Dictionary<string, ItemType>();
            var slotNames = new[] { "Weapon", "Head", "Body", "Hand", "Legs", "Feet", "Ears", "Neck", "Wrist", "Ring" };
            
            foreach (var slotName in slotNames)
            {
                // Look for exact pattern: "SlotName: i{any_number} Aug. Tome" or "SlotName: i{any_number} Raid"
                // \d+ matches any number of digits (i790, i800, i900, etc.)
                // Match variations: "Aug. Tome", "Aug Tome", "Augmented Tome", "Raid"
                var slotPattern = $@"{slotName}\s*:\s*i\d+\s+(Aug\.?\s*Tome|Augmented\s*Tome|Raid)";
                var slotMatch = Regex.Match(htmlContent, slotPattern, RegexOptions.IgnoreCase);
                
                if (slotMatch.Success && slotMatch.Groups.Count >= 2)
                {
                    var typeText = slotMatch.Groups[1].Value.ToLowerInvariant();
                    var itemType = typeText.Contains("tome") || typeText.Contains("aug")
                        ? ItemType.AugTome
                        : ItemType.Raid;
                    
                    slotTypeMap[slotName] = itemType;
                    _logger?.LogInformation("Found slot type from HTML: {Slot}={ItemType} (matched: {TypeText})", slotName, itemType, slotMatch.Groups[1].Value);
                }
                else
                {
                    // Try a more flexible pattern - maybe there's whitespace or different formatting
                    var flexiblePattern = $@"{slotName}[^:]*:\s*i\d+\s+(Aug\.?\s*Tome|Augmented\s*Tome|Raid)";
                    var flexibleMatch = Regex.Match(htmlContent, flexiblePattern, RegexOptions.IgnoreCase);
                    if (flexibleMatch.Success && flexibleMatch.Groups.Count >= 2)
                    {
                        var typeText = flexibleMatch.Groups[1].Value.ToLowerInvariant();
                        var itemType = typeText.Contains("tome") || typeText.Contains("aug")
                            ? ItemType.AugTome
                            : ItemType.Raid;
                        
                        slotTypeMap[slotName] = itemType;
                        _logger?.LogInformation("Found slot type from HTML (flexible): {Slot}={ItemType} (matched: {TypeText})", slotName, itemType, flexibleMatch.Groups[1].Value);
                    }
                }
            }
            
            if (slotTypeMap.Count > 0)
            {
                _slotTypeMap = slotTypeMap;
                _logger?.LogInformation("Found {Count} slot type mappings from HTML", slotTypeMap.Count);
            }
            else
            {
                // Log a sample of the HTML to see what we're working with
                var sampleLength = Math.Min(500, htmlContent.Length);
                var htmlSample = htmlContent.Substring(0, sampleLength);
                _logger?.LogWarning("No slot type mappings found. HTML sample (first {Length} chars): {Sample}", sampleLength, htmlSample);
                
                // Try to find any occurrence of "Aug. Tome" or "Raid" in the HTML
                var augTomeMatches = Regex.Matches(htmlContent, @"Aug\.?\s*Tome", RegexOptions.IgnoreCase);
                var raidMatches = Regex.Matches(htmlContent, @"\bRaid\b", RegexOptions.IgnoreCase);
                _logger?.LogInformation("Found {AugCount} 'Aug Tome' matches and {RaidCount} 'Raid' matches in HTML", augTomeMatches.Count, raidMatches.Count);
            }
            
            // xivgear is a React app, so data is likely in script tags
            // Look for embedded JSON data in script tags
            var scriptPattern = @"<script[^>]*>([\s\S]*?)</script>";
            var scriptMatches = Regex.Matches(htmlContent, scriptPattern, RegexOptions.IgnoreCase);
            
            _logger?.LogInformation("Found {Count} script tags", scriptMatches.Count);
            
            foreach (Match scriptMatch in scriptMatches)
            {
                var scriptContent = scriptMatch.Groups[1].Value;
                
                // Look for JSON data structures that might contain item information
                // Try to find patterns like: "id": 12345, "name": "...", "source": "..."
                // or item arrays with type information
                
                // Pattern 1: Look for item objects with id, name, and source/type
                var itemObjectPattern = @"""id""\s*:\s*(\d+)[\s\S]*?""name""\s*:\s*""([^""]+)""[\s\S]*?""(?:source|type|itemType)""\s*:\s*""([^""]+)""";
                var itemMatches = Regex.Matches(scriptContent, itemObjectPattern, RegexOptions.IgnoreCase);
                
                foreach (Match match in itemMatches)
                {
                    if (match.Groups.Count >= 4)
                    {
                        try
                        {
                            var itemId = int.Parse(match.Groups[1].Value);
                            var itemName = match.Groups[2].Value;
                            var itemTypeStr = match.Groups[3].Value.ToLowerInvariant();
                            
                            var itemType = itemTypeStr.Contains("tome") || itemTypeStr.Contains("augmented") || itemTypeStr.Contains("tomestone")
                                ? ItemType.AugTome 
                                : ItemType.Raid;
                            
                            itemInfo[itemId] = (itemName, itemType);
                            _logger?.LogInformation("Found item from script: Id={ItemId}, Name={ItemName}, Type={ItemType}", itemId, itemName, itemType);
                        }
                        catch
                        {
                            // Skip invalid matches
                        }
                    }
                }
            }
            
            
            // Pattern 3: Try to find item data in data attributes or React props
            // Look for data-item-id, data-item-name, etc.
            var dataAttrPattern = @"data-item-id=""(\d+)""[^>]*data-item-name=""([^""]+)""[^>]*data-item-type=""([^""]+)""";
            var dataMatches = Regex.Matches(htmlContent, dataAttrPattern, RegexOptions.IgnoreCase);
            
            foreach (Match match in dataMatches)
            {
                if (match.Groups.Count >= 4)
                {
                    try
                    {
                        var itemId = int.Parse(match.Groups[1].Value);
                        var itemName = match.Groups[2].Value;
                        var itemTypeStr = match.Groups[3].Value.ToLowerInvariant();
                        
                        var itemType = itemTypeStr.Contains("tome") || itemTypeStr.Contains("augmented")
                            ? ItemType.AugTome 
                            : ItemType.Raid;
                        
                        itemInfo[itemId] = (itemName, itemType);
                        _logger?.LogInformation("Found item from data attributes: Id={ItemId}, Name={ItemName}, Type={ItemType}", itemId, itemName, itemType);
                    }
                    catch
                    {
                        // Skip invalid matches
                    }
                }
            }
            
            _logger?.LogInformation("Total items parsed from HTML: {Count}", itemInfo.Count);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error parsing HTML from xivgear page");
        }
        
        return itemInfo;
    }

    /// <summary>
    /// Parses the JSON response from xivgear API and maps it to GearItem entities
    /// </summary>
    private async Task<List<GearItem>> ParseXivGearResponseAsync(string jsonContent, Dictionary<int, (string name, ItemType type)>? itemInfoFromHtml = null)
    {
        var gearItems = new List<GearItem>();

        try
        {
            using var document = JsonDocument.Parse(jsonContent);
            var root = document.RootElement;

            JsonElement itemsElement;

            // Check if response has a "sets" array (shortlink format)
            if (root.TryGetProperty("sets", out var setsElement) && setsElement.ValueKind == JsonValueKind.Array)
            {
                // Find the first non-separator set (the actual gear set)
                JsonElement? targetSet = null;
                foreach (var set in setsElement.EnumerateArray())
                {
                    if (set.TryGetProperty("isSeparator", out var isSeparator) && isSeparator.GetBoolean())
                    {
                        continue;
                    }

                    if (set.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Object)
                    {
                        targetSet = set;
                        break;
                    }
                }

                if (!targetSet.HasValue)
                {
                    throw new InvalidOperationException("No valid gear set found in xivgear response");
                }

                itemsElement = targetSet.Value.GetProperty("items");
            }
            // Check if response has "items" directly at root (BiS endpoint format)
            else if (root.TryGetProperty("items", out var rootItems) && rootItems.ValueKind == JsonValueKind.Object)
            {
                itemsElement = rootItems;
            }
            else
            {
                throw new InvalidOperationException("Invalid xivgear response: neither 'sets' array nor 'items' object found");
            }

            gearItems.AddRange(await ParseGearSetAsync(itemsElement, itemInfoFromHtml));
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException("Failed to parse xivgear API response", ex);
        }

        return gearItems;
    }

    /// <summary>
    /// Parses gear set data from JSON element
    /// </summary>
    private async Task<List<GearItem>> ParseGearSetAsync(JsonElement itemsElement, Dictionary<int, (string name, ItemType type)>? itemInfoFromHtml = null)
    {
        var gearItems = new List<GearItem>();

        // Map of xivgear slot names to our GearSlot enum
        var slotMapping = new Dictionary<string, GearSlot>(StringComparer.OrdinalIgnoreCase)
        {
            { "Weapon", GearSlot.Weapon },
            { "Head", GearSlot.Head },
            { "Body", GearSlot.Body },
            { "Hand", GearSlot.Hand },
            { "Legs", GearSlot.Legs },
            { "Feet", GearSlot.Feet },
            { "Ears", GearSlot.Ears },
            { "Neck", GearSlot.Neck },
            { "Wrist", GearSlot.Wrist },
            { "RingRight", GearSlot.RightRing },
            { "RingLeft", GearSlot.LeftRing }
        };

        // Iterate through gear slots in the items object
        foreach (var property in itemsElement.EnumerateObject())
        {
            var slotName = property.Name;
            var slotElement = property.Value;

            if (slotMapping.TryGetValue(slotName, out var gearSlot) && slotElement.ValueKind == JsonValueKind.Object)
            {
                var gearItem = await ParseGearItemAsync(slotElement, gearSlot, itemInfoFromHtml);
                if (gearItem != null)
                {
                    gearItems.Add(gearItem);
                }
            }
        }

        return gearItems;
    }

    /// <summary>
    /// Parses a single gear item from JSON element
    /// </summary>
    private async Task<GearItem?> ParseGearItemAsync(JsonElement itemElement, GearSlot slot, Dictionary<int, (string name, ItemType type)>? itemInfoFromHtml = null)
    {
        if (itemElement.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        // Get item ID from the item element
        if (!itemElement.TryGetProperty("id", out var idElement))
        {
            return null;
        }

        var itemId = idElement.GetInt32();
        if (itemId == 0)
        {
            return null;
        }

        // Get item name and type - prioritize HTML data if available
        string itemName;
        ItemType itemType;
        
        // Check if we have item info from HTML parsing
        if (itemInfoFromHtml != null && itemInfoFromHtml.TryGetValue(itemId, out var htmlInfo))
        {
            itemName = htmlInfo.name;
            itemType = htmlInfo.type;
            _logger?.LogInformation("Using HTML data: Slot={Slot}, ItemId={ItemId}, ItemName={ItemName}, ItemType={ItemType}", 
                slot, itemId, itemName, itemType);
        }
        // Check if we have slot-to-type mapping from HTML
        else if (_slotTypeMap != null)
        {
            var slotName = slot switch
            {
                GearSlot.Weapon => "Weapon",
                GearSlot.Head => "Head",
                GearSlot.Body => "Body",
                GearSlot.Hand => "Hand",
                GearSlot.Legs => "Legs",
                GearSlot.Feet => "Feet",
                GearSlot.Ears => "Ears",
                GearSlot.Neck => "Neck",
                GearSlot.Wrist => "Wrist",
                GearSlot.RightRing => "Ring",
                GearSlot.LeftRing => "Ring",
                _ => null
            };
            
            if (slotName != null && _slotTypeMap.TryGetValue(slotName, out var slotType))
            {
                itemName = _itemNameCache.TryGetValue(itemId, out var cachedName) 
                    ? cachedName 
                    : $"Item {itemId}";
                itemType = slotType;
                _logger?.LogInformation("Using slot type mapping from HTML: Slot={Slot}, ItemId={ItemId}, ItemName={ItemName}, ItemType={ItemType}", 
                    slot, itemId, itemName, itemType);
            }
            else
            {
                // Fall through to default logic
                itemName = _itemNameCache.TryGetValue(itemId, out var cachedName) 
                    ? cachedName 
                    : $"Item {itemId}";
                itemType = ItemType.Raid; // Will be determined below
            }
        }
        else
        {
            // Fallback to cache or placeholder
            itemName = _itemNameCache.TryGetValue(itemId, out var cachedName) 
                ? cachedName 
                : $"Item {itemId}";

            // Log item details for debugging
            _logger?.LogInformation("Parsing item: Slot={Slot}, ItemId={ItemId}, ItemName={ItemName}", slot, itemId, itemName);
            
            // Log all properties of the item element for debugging
            var itemProperties = new Dictionary<string, string>();
            foreach (var prop in itemElement.EnumerateObject())
            {
                itemProperties[prop.Name] = prop.Value.ToString();
            }
            _logger?.LogInformation("Item properties: {Properties}", string.Join(", ", itemProperties.Select(kvp => $"{kvp.Key}={kvp.Value}")));

            // Try to determine item type from API response properties first
            itemType = ItemType.Raid; // Default
            
            // Check for source property
            if (itemElement.TryGetProperty("source", out var sourceElement))
            {
                var source = sourceElement.GetString()?.ToLowerInvariant() ?? "";
                _logger?.LogInformation("Found source property: {Source}", source);
                if (source.Contains("tome") || source.Contains("tomestone") || source.Contains("augmented"))
                {
                    itemType = ItemType.AugTome;
                }
                else if (source.Contains("raid") || source.Contains("savage"))
                {
                    itemType = ItemType.Raid;
                }
            }
            
            // Check for itemCategory or similar properties that might indicate source
            if (itemType == ItemType.Raid && itemElement.TryGetProperty("itemCategory", out var categoryElement))
            {
                var category = categoryElement.GetString()?.ToLowerInvariant() ?? "";
                _logger?.LogInformation("Found itemCategory property: {Category}", category);
                if (category.Contains("tome") || category.Contains("tomestone"))
                {
                    itemType = ItemType.AugTome;
                }
            }
            
            // Check all properties for any indication of tome/raid source
            if (itemType == ItemType.Raid)
            {
                foreach (var prop in itemElement.EnumerateObject())
                {
                    var propValue = prop.Value.ToString().ToLowerInvariant();
                    if (propValue.Contains("tome") || propValue.Contains("tomestone") || propValue.Contains("augmented"))
                    {
                        _logger?.LogInformation("Found tome indicator in property {PropertyName}: {PropertyValue}", prop.Name, propValue);
                        itemType = ItemType.AugTome;
                        break;
                    }
                }
            }
            
            // If source not available, determine from item name
            // This is the fallback method - check item name patterns
            if (itemType == ItemType.Raid && !string.IsNullOrEmpty(itemName) && itemName != $"Item {itemId}")
            {
                var detectedType = DetermineItemType(itemName);
                _logger?.LogInformation("Determined type from item name '{ItemName}': {DetectedType}", itemName, detectedType);
                itemType = detectedType;
            }
            
            _logger?.LogInformation("Final item type for slot {Slot}: {ItemType}", slot, itemType);
        }

        return new GearItem
        {
            Slot = slot,
            ItemName = itemName,
            ItemType = itemType,
            IsAcquired = false,
            UpgradeMaterialAcquired = false
        };
    }

    /// <summary>
    /// Determines if an item is Raid or Augmented Tome based on its name
    /// </summary>
    private static ItemType DetermineItemType(string itemName)
    {
        if (string.IsNullOrEmpty(itemName))
        {
            return ItemType.Raid; // Default
        }

        var nameLower = itemName.ToLowerInvariant();
        
        // Check for augmented tome indicators - comprehensive patterns
        // Common tome gear prefixes: Augmented, Credendum, Diadochos, Rinascita, etc.
        // Also check for common tome suffixes and patterns
        if (nameLower.Contains("augmented") || 
            nameLower.Contains("aug.") || 
            nameLower.Contains("aug ") ||
            nameLower.Contains("tome") ||
            nameLower.Contains("tomestone") ||
            nameLower.Contains("credendum") ||
            nameLower.Contains("diadochos") ||
            nameLower.Contains("rinascita") ||
            nameLower.Contains("asphodelos") ||
            nameLower.Contains("radiant") ||
            nameLower.Contains("cryptlurker") ||
            nameLower.Contains("edenmorn") ||
            nameLower.Contains("law's order") ||
            nameLower.Contains("law order") ||
            nameLower.Contains("exarchic") ||
            nameLower.Contains("crystarium") ||
            nameLower.Contains("scaevan"))
        {
            return ItemType.AugTome;
        }

        // Check for raid indicators - comprehensive patterns
        // Common raid gear prefixes: Grand Champion's, Babyface Champion's, Savage, etc.
        if (nameLower.Contains("grand champion") || 
            nameLower.Contains("babyface champion") ||
            nameLower.Contains("savage") ||
            nameLower.Contains("champion's") ||
            nameLower.Contains("champions") ||
            nameLower.Contains("ultima") ||
            nameLower.Contains("dreadwyrm") ||
            nameLower.Contains("alexandrian") ||
            nameLower.Contains("midan") ||
            nameLower.Contains("genesis"))
        {
            return ItemType.Raid;
        }

        // Default to Raid if uncertain (but this should be rare with improved detection)
        return ItemType.Raid;
    }
}
