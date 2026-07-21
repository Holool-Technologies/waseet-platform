namespace Domain.Enums;

public enum UserRole { Client = 1, Freelancer = 2, Admin = 99 }
public enum TaskStatus { Open = 0, Bidding = 1, Active = 2, Completed = 3, Disputed = 4, Delivered = 5, Cancelled = 6  }

public enum ProposalStatus { Pending = 0, Accepted = 1, Rejected = 2 }
public enum EscrowStatus
{
    Held = 0,
    Released = 1,
    Refunded = 2,
    Disputed = 3
}
public enum TaskCategory
{
    Other = 0,
    ProgrammingDevelopment = 1,
    DesignCreative = 2,
    WritingTranslation = 3,
    MarketingSales = 4,
    VideoAnimation = 5,
    Audio = 6,
    DataScience = 7,
    BusinessConsulting = 8,
    AdminSupport = 9
}
public enum PortfolioStatus { Pending = 0, Approved = 1, Rejected = 2 }

public enum TaskApprovalStatus { PendingApproval = 0, Approved = 1, Rejected = 2 }

public enum NotificationType
{
    TaskApproved = 3, TaskRejected = 4,
    ProposalAwarded = 5,
    PortfolioApproved = 6, PortfolioRejected = 7,
    NewMessage = 8, NewProposal = 9
}

public enum DeliveryStatus
{
    AwaitingReview = 0,
    RevisionRequested = 1,
    Accepted = 2,
    AutoReleased = 3,
    Disputed = 4
}
public enum RevisionStatus
{
    Open = 0,
    Resolved = 1   // freelancer submitted a new delivery
}
public enum DisputeStatus
{
    Open = 0,
    UnderAdminReview = 1,
    Resolved = 2
}

public enum DisputeResolution
{
    FavorFreelancer = 0,  // release escrow to freelancer
    FavorClient = 1   // refund escrow to client
}

public enum SkillLevel
{
    Newcomer = 0,  // 0 completed
    Rising = 1,  // 3+ completed, >70% success
    Professional = 2,  // 10+ completed, >80% success
    Expert = 3,  // 30+ completed, >85% success
    Elite = 4,  // 75+ completed, >90% success
    Legend = 5   // 150+ completed, >95% success
}

public enum BadgeType
{
    // Freelancer badges
    FastDelivery = 1,   // delivered 2+ days before deadline
    HundredJobs = 2,   // 100 completed tasks
    ClientFavorite = 3,   // 5+ repeat clients
    ThirtyDaysOnTime = 4,   // 30 consecutive on-time deliveries
    ConsistentPerformer = 5,   // 10+ tasks, 0 disputes
    TrustedProfessional = 6,   // 50+ tasks, >95% success
    HundredPercentSuccess = 7,   // 20+ tasks, 100% success rate

    // Client badges
    GreatClient = 101, // 10+ completed tasks, <5% dispute rate
    FastPayer = 102, // avg release < 2 days
    ClearRequirements = 103, // freelancers rate task clarity > 4.5 avg
    GenerousTipper = 104, // approved extra payments
    Responsive = 105, // replies to chat within 1 hour avg
    FairDisputeHistory = 106  // opened disputes but 0 wins (fair)
}