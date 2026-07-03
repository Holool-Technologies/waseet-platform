using Domain.Enums;

namespace Application.Features.Delivery.StateMachine;

/// <summary>
/// Pure state machine — no DB access, no side effects.
/// All transition logic lives here. Services use this to validate
/// before executing business rules.
/// </summary>
public static class DeliveryStateMachine
{
    // Allowed transitions: (FromStatus, Actor) -> AllowedToStatus[]
    private static readonly Dictionary<(DeliveryStatus, ActorType), DeliveryStatus[]> Transitions
        = new()
    {
        { (DeliveryStatus.AwaitingReview, ActorType.Client), [
            DeliveryStatus.Accepted,
            DeliveryStatus.RevisionRequested,
            DeliveryStatus.Disputed
        ]},
        { (DeliveryStatus.AwaitingReview, ActorType.System), [
            DeliveryStatus.AutoReleased
        ]},
        { (DeliveryStatus.RevisionRequested, ActorType.Freelancer), [
            DeliveryStatus.AwaitingReview   // resubmission
        ]},
    };

    public static bool CanTransition(
        DeliveryStatus from,
        DeliveryStatus to,
        ActorType actor)
    {
        return Transitions.TryGetValue((from, actor), out var allowed)
            && allowed.Contains(to);
    }

    public static DeliveryStatus[] AllowedTransitions(
        DeliveryStatus from,
        ActorType actor)
    {
        return Transitions.TryGetValue((from, actor), out var allowed)
            ? allowed
            : [];
    }
}

public enum ActorType { Client, Freelancer, Admin, System }