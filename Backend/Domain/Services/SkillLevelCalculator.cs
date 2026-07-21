using Domain.Enums;

namespace Waseet.Domain.Services;

/// <summary>
/// Pure domain logic — no DB access. Takes stats and returns
/// the correct skill level. Testable in isolation.
/// </summary>
public static class SkillLevelCalculator
{
    public record LevelRequirement(
        int MinCompleted,
        decimal MinSuccessRate,
        string Label,
        string LabelAr,
        string Emoji,
        string Color
    );

    public static readonly IReadOnlyDictionary<SkillLevel, LevelRequirement>
        Requirements = new Dictionary<SkillLevel, LevelRequirement>
        {
            [SkillLevel.Newcomer] = new(0, 0, "Newcomer", "مبتدئ", "🎯", "#6B7280"),
            [SkillLevel.Rising] = new(3, 70, "Rising", "صاعد", "⭐", "#F59E0B"),
            [SkillLevel.Professional] = new(10, 80, "Professional", "محترف", "💼", "#3B82F6"),
            [SkillLevel.Expert] = new(30, 85, "Expert", "خبير", "🏆", "#8B5CF6"),
            [SkillLevel.Elite] = new(75, 90, "Elite", "نخبة", "💎", "#06B6D4"),
            [SkillLevel.Legend] = new(150, 95, "Legend", "أسطورة", "👑", "#F59E0B"),
        };

    public static SkillLevel Calculate(int completed, decimal successRate)
    {
        // Evaluate from highest to lowest — return first match
        foreach (var level in Enum
            .GetValues<SkillLevel>()
            .OrderByDescending(l => (int)l))
        {
            var req = Requirements[level];
            if (completed >= req.MinCompleted
             && successRate >= req.MinSuccessRate)
                return level;
        }
        return SkillLevel.Newcomer;
    }

    public static LevelRequirement GetInfo(SkillLevel level)
        => Requirements[level];
}