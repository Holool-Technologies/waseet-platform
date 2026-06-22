namespace Waseet.Domain.Interfaces;

/// <summary>
/// Abstraction over the payment provider. Today this is implemented by
/// SimulatedPaymentGatewayService (no real money moves). Swapping to a real
/// provider (Stripe, Paymob, etc.) means writing one new class that implements
/// this interface and changing one line in DependencyInjection — nothing else
/// in the codebase touches payment logic directly.
/// </summary>
public interface IPaymentGatewayService
{
    /// <summary>Moves funds out of escrow into the freelancer's payout queue.</summary>
    Task<PaymentResult> ReleaseToFreelancerAsync(
        Guid escrowTransactionId,
        decimal amount,
        Guid freelancerUserId,
        CancellationToken ct = default);

    /// <summary>Moves funds out of escrow back to the client.</summary>
    Task<PaymentResult> RefundToClientAsync(
        Guid escrowTransactionId,
        decimal amount,
        Guid clientUserId,
        CancellationToken ct = default);
}

public record PaymentResult(
    bool Success,
    string ProviderReference,   // gateway transaction ID — simulated for now
    string? FailureReason = null
);