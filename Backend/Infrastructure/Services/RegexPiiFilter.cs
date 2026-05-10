using System.Text.RegularExpressions;

namespace Infrastructure.Services;

/// <summary>
/// First-pass, zero-cost PII and social content filter using compiled regex.
/// Runs before every AI call — catches obvious cases instantly.
/// Handles both English and Arabic/Arabic-dialect content.
/// </summary>
public static class RegexPiiFilter
{
    // ── Replacement rules — applied in order ─────────────────────────────────

    private static readonly (Regex Pattern, string Replacement)[] RedactRules =
    [
        // Email addresses
        (Compile(@"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"), "[EMAIL]"),

        // International + local phone numbers
        // Matches: +966501234567, 00966501234567, 0501234567, (050) 123-4567
        (Compile(@"(\+|00)?[\d\s\-().]{7,}\d"), "[PHONE]"),

        // HTTP/HTTPS URLs
        (Compile(@"https?://[^\s\u0600-\u06FF]+"), "[LINK]"),

        // Bare domains: example.com, mysite.io, app.dev, etc.
        (Compile(
            @"\b[a-zA-Z0-9\-]+\.(com|net|org|io|app|dev|co|sa|ae|eg|online|site|web|me)\b",
            RegexOptions.IgnoreCase), "[LINK]"),

        // Social handles: @username (English and Arabic mixed)
        (Compile(@"@[\w\u0600-\u06FF]{2,}"), "[HANDLE]"),

        // Arabic phone patterns written as words/shortcuts
        // e.g. "تواصل معي على 0501234567" — the number part caught above
        // This catches numeric sequences of 8-15 digits (WhatsApp style)
        (Compile(@"\b\d{8,15}\b"), "[PHONE]"),
    ];

    // ── Hard-block patterns — message is blocked entirely if matched ──────────

    private static readonly Regex[] BlockPatterns =
    [
        // English off-platform intent
        Compile(@"\b(whatsapp|واتساب|واتس\s?اب|تيليجرام|telegram|signal|wechat|skype|discord|snapchat|سناب\s?شات|انستا\s?جرام|instagram|tiktok|تيك\s?توك|facebook|فيسبوك|twitter|تويتر|linkedin)\b",
            RegexOptions.IgnoreCase),

        // English contact requests
        Compile(@"\b(call me|contact me|reach me|message me|add me|find me|my number|my email|my profile|my account|hit me up|dm me|send me)\b",
            RegexOptions.IgnoreCase),

        // Arabic contact requests — including dialects
        Compile(@"(تواصل\s?معي|كلمني|ابعتلي|راسلني|ضيفني|اتصل\s?بي|رقمي|ايميلي|حسابي|على\s?الخاص|على\s?واتس|في\s?الواتس|على\s?التيليجرام|بره\s?المنصة|خارج\s?المنصة|خارج\s?الموقع|نكمل\s?بره|نتواصل\s?بره)"),

        // Off-platform continuation
        Compile(@"\b(off.?platform|outside\s+(this|the)\s+(app|site|platform)|contact\s+me\s+(directly|privately|outside))\b",
            RegexOptions.IgnoreCase),

        // Arabic off-platform continuation (Gulf, Egyptian, Levantine dialects)
        Compile(@"(نكمل\s?برا|نتفاهم\s?برا|اشتغل\s?معك\s?برا|نكتب\s?بره|نراسل\s?بره|نكلم\s?بعض\s?بره)"),
    ];

    // ── Social/greeting patterns — redact but don't block ────────────────────

    private static readonly (Regex Pattern, string Replacement)[] SocialRedactRules =
    [
        // Arabic religious phrases (السلام عليكم، بسم الله، etc.)
        (Compile(@"(السلام\s?عليكم|وعليكم\s?السلام|بسم\s?الله|الله\s?يبارك|بارك\s?الله|إن\s?شاء\s?الله\s*،|ما\s?شاء\s?الله\s*،|جزاك\s?الله|أهلاً\s?وسهلاً|مرحباً\s?بك|أهلاً\s?بك)"),
         ""),

        // Arabic name patterns — "أنا [name]", "اسمي [name]", "معك [name]"
        (Compile(@"(أنا\s+\w+|اسمي\s+\w+|معك\s+\w+|هذا\s+\w+\s+من|أخوك\s+\w+|صديقك\s+\w+)"),
         "[IDENTITY]"),

        // English name self-introduction
        (Compile(@"\b(my name is|i am|i'm|this is|it's me,?)\s+[A-Z][a-z]+\b"),
         "[IDENTITY]"),

        // Flirting / compliments (Arabic)
        (Compile(@"(انت\s?جميل|انتي\s?جميلة|احبك|بحبك|يسعدني\s?التعامل\s?معك\s?شخصياً|شخصيتك\s?حلوة|ودي\s?اعرفك)"),
         ""),

        // Greetings (English)
        (Compile(@"\b(hi there|hey there|hello there|good morning|good evening|good night|hope you are well|hope this finds you)\b",
            RegexOptions.IgnoreCase), ""),
    ];

    // ── Public API ────────────────────────────────────────────────────────────

    public record FilterResult(
        string Cleaned,
        bool PiiFound,
        bool ShouldBlock,
        string BlockReason
    );

    /// <summary>
    /// Runs all regex rules against the input.
    /// Returns cleaned text, whether PII was found, and whether to block entirely.
    /// </summary>
    public static FilterResult Process(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return new FilterResult(input, false, false, string.Empty);

        // 1. Check block patterns first — if matched, entire message is blocked
        foreach (var pattern in BlockPatterns)
        {
            if (pattern.IsMatch(input))
            {
                return new FilterResult(
                    "[Message blocked — off-platform or contact attempt detected]",
                    true,
                    true,
                    "Off-platform contact or social identity exchange attempt detected."
                );
            }
        }

        bool piiFound = false;
        string result = input;

        // 2. Apply social/greeting redaction (strip but don't block)
        foreach (var (pattern, replacement) in SocialRedactRules)
        {
            if (pattern.IsMatch(result))
            {
                piiFound = true;
                result = pattern.Replace(result, replacement);
            }
        }

        // 3. Apply PII redaction rules
        foreach (var (pattern, replacement) in RedactRules)
        {
            if (pattern.IsMatch(result))
            {
                piiFound = true;
                result = pattern.Replace(result, replacement);
            }
        }

        // 4. Clean up extra whitespace left by removals
        result = Regex.Replace(result.Trim(), @"\s{2,}", " ");

        return new FilterResult(result, piiFound, false, string.Empty);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Regex Compile(string pattern,
        RegexOptions extra = RegexOptions.None) =>
        new(pattern,
            RegexOptions.Compiled | RegexOptions.Multiline | extra,
            TimeSpan.FromMilliseconds(200));  // prevent ReDoS
}