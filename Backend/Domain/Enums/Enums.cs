namespace Domain.Enums;

public enum UserRole { Client = 1, Freelancer = 2, Admin = 99 }
public enum KycStatus { Pending = 0, Approved = 1, Rejected = 2 }
public enum TaskStatus { Open = 0, Bidding = 1, Active = 2, Completed = 3, Disputed = 4 }
public enum ProposalStatus { Pending = 0, Accepted = 1, Rejected = 2 }
public enum EscrowStatus { Held = 0, Released = 1, Disputed = 2, Refunded = 3 }
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