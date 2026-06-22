namespace Domain.Enums;

public enum UserRole { Client = 1, Freelancer = 2, Admin = 99 }
public enum KycStatus { Pending = 0, Approved = 1, Rejected = 2 }
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
    KycApproved = 1, KycRejected = 2,
    TaskApproved = 3, TaskRejected = 4,
    ProposalAwarded = 5,
    PortfolioApproved = 6, PortfolioRejected = 7,
    NewMessage = 8, NewProposal = 9
}

public enum DeliveryStatus
{
    AwaitingReview = 0,   // freelancer submitted, waiting on client
    Accepted = 1,   // client accepted — escrow released
    Disputed = 2,   // client reported a problem
    AutoReleased = 3    // N days passed with no response — auto-accepted
}

public enum DisputeStatus
{
    Open = 0,
    Resolved = 1
}

public enum DisputeResolution
{
    FavorFreelancer = 0,  // release escrow to freelancer
    FavorClient = 1   // refund escrow to client
}