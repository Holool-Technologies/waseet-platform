using System.Text.RegularExpressions;

namespace Infrastructure.Services;

public static class RegexPiiFilter
{
    private static readonly (Regex Pattern, string Replacement)[] Rules =
    [
        // Emails
        (new Regex(@"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
            RegexOptions.Compiled), "[EMAIL]"),

        // Phone numbers (international + local formats)
        (new Regex(@"(\+?\d[\d\s\-().]{7,}\d)",
            RegexOptions.Compiled), "[PHONE]"),

        // URLs / domains
        (new Regex(@"https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9\-]+\.(com|net|org|io|app|dev)[^\s]*",
            RegexOptions.Compiled | RegexOptions.IgnoreCase), "[LINK]"),

        // Social media handles
        (new Regex(@"@[a-zA-Z0-9_]{2,}",
            RegexOptions.Compiled), "[HANDLE]"),

        // WhatsApp / Telegram / contact requests (block entirely)
        (new Regex(@"\b(whatsapp|telegram|signal|wechat|skype|discord|linkedin|instagram|facebook)\b",
            RegexOptions.Compiled | RegexOptions.IgnoreCase), "[CONTACT_APP]"),
    ];

    private static readonly Regex[] BlockPatterns =
    [
        new Regex(@"\b(call me|contact me|reach me|message me|add me|find me|my number|my email|my profile)\b",
            RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"\b(off.?platform|outside|direct(ly)?|privately)\b",
            RegexOptions.Compiled | RegexOptions.IgnoreCase),
    ];

    public static (string Cleaned, bool PiiFound, bool ShouldBlock) Process(string input)
    {
        bool blocked = BlockPatterns.Any(p => p.IsMatch(input));
        bool piiFound = false;
        string result = input;

        foreach (var (pattern, replacement) in Rules)
        {
            if (pattern.IsMatch(result))
            {
                piiFound = true;
                result = pattern.Replace(result, replacement);
            }
        }

        return (result, piiFound, blocked);
    }
}