using Domain.Enums;
using Waseet.Domain.Entities;

namespace Waseet.Domain.Services;

public static class BadgeCalculator
{
    public record BadgeDefinition(
        BadgeType Type,
        string Label,
        string LabelAr,
        string Emoji,
        string Description,
        string DescriptionAr
    );

    public static readonly IReadOnlyDictionary<BadgeType, BadgeDefinition>
        Definitions = new Dictionary<BadgeType, BadgeDefinition>
        {
            [BadgeType.FastDelivery] = new(
            BadgeType.FastDelivery,
            "Fast Delivery", "تسليم سريع", "⚡",
            "Delivered work 2+ days before the deadline",
            "سلّم العمل قبل الموعد النهائي بيومين أو أكثر"),

            [BadgeType.HundredJobs] = new(
            BadgeType.HundredJobs,
            "100 Jobs", "١٠٠ مهمة", "🎖",
            "Completed 100 tasks on the platform",
            "أتمّ ١٠٠ مهمة على المنصة"),

            [BadgeType.ClientFavorite] = new(
            BadgeType.ClientFavorite,
            "Client Favorite", "مفضل العملاء", "❤️",
            "5+ clients came back for repeat work",
            "عاد ٥ عملاء أو أكثر للعمل معه مجدداً"),

            [BadgeType.ThirtyDaysOnTime] = new(
            BadgeType.ThirtyDaysOnTime,
            "30 Days Without Late Delivery", "٣٠ يوماً بلا تأخير", "📅",
            "30 consecutive on-time deliveries",
            "٣٠ تسليماً متتالياً في الموعد"),

            [BadgeType.ConsistentPerformer] = new(
            BadgeType.ConsistentPerformer,
            "Consistent Performer", "أداء ثابت", "📊",
            "10+ tasks completed with zero disputes",
            "أتمّ ١٠+ مهام بدون أي نزاعات"),

            [BadgeType.TrustedProfessional] = new(
            BadgeType.TrustedProfessional,
            "Trusted Professional", "محترف موثوق", "🛡",
            "50+ tasks with 95%+ success rate",
            "٥٠+ مهمة بمعدل نجاح ٩٥٪ أو أكثر"),

            [BadgeType.HundredPercentSuccess] = new(
            BadgeType.HundredPercentSuccess,
            "100% Success Rate", "معدل نجاح ١٠٠٪", "🎯",
            "20+ tasks with a perfect success rate",
            "٢٠+ مهمة بمعدل نجاح مثالي"),

            [BadgeType.GreatClient] = new(
            BadgeType.GreatClient,
            "Great Client", "عميل ممتاز", "🌟",
            "10+ completed tasks with low dispute rate",
            "١٠+ مهام مكتملة بمعدل نزاع منخفض"),

            [BadgeType.FastPayer] = new(
            BadgeType.FastPayer,
            "Fast Payer", "دفع سريع", "💳",
            "Releases payments within 2 days on average",
            "يحرر المدفوعات خلال يومين في المتوسط"),

            [BadgeType.FairDisputeHistory] = new(
            BadgeType.FairDisputeHistory,
            "Fair Dispute History", "نزاعات نزيهة", "⚖",
            "Opened disputes but maintained fairness",
            "فتح نزاعات مع الحفاظ على النزاهة"),
        };

    /// <summary>
    /// Given current stats, return which badges should be earned.
    /// Called after every completed delivery.
    /// </summary>
    public static IEnumerable<BadgeType> ComputeEarnedBadges(
        FreelancerStats stats)
    {
        var earned = new List<BadgeType>();

        if (stats.EarlyDeliveries >= 1)
            earned.Add(BadgeType.FastDelivery);

        if (stats.TasksCompleted >= 100)
            earned.Add(BadgeType.HundredJobs);

        if (stats.RepeatClientsCount >= 5)
            earned.Add(BadgeType.ClientFavorite);

        if (stats.ConsecutiveOnTime >= 30)
            earned.Add(BadgeType.ThirtyDaysOnTime);

        if (stats.TasksCompleted >= 10 && stats.TotalDisputes == 0)
            earned.Add(BadgeType.ConsistentPerformer);

        if (stats.TasksCompleted >= 50 && stats.SuccessRate >= 95)
            earned.Add(BadgeType.TrustedProfessional);

        if (stats.TasksCompleted >= 20 && stats.SuccessRate == 100)
            earned.Add(BadgeType.HundredPercentSuccess);

        return earned;
    }

    public static IEnumerable<BadgeType> ComputeClientBadges(
        ClientStats stats)
    {
        var earned = new List<BadgeType>();

        var disputeRate = stats.TasksCompleted > 0
            ? (decimal)stats.DisputesOpened / stats.TasksCompleted * 100
            : 0;

        if (stats.TasksCompleted >= 10 && disputeRate < 5)
            earned.Add(BadgeType.GreatClient);

        if (stats.AvgPaymentDays <= 2 && stats.TasksCompleted >= 5)
            earned.Add(BadgeType.FastPayer);

        if (stats.DisputesOpened > 0 && stats.DisputesWon == 0)
            earned.Add(BadgeType.FairDisputeHistory);

        return earned;
    }
}