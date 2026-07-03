using Microsoft.Extensions.Logging;
using Domain.Interfaces;
namespace Infrastructure.Services;

/// <summary>
/// Simulated payment gateway — no real money moves. Tracks the operation
/// the same way a real provider would (idempotent reference, success/failure)
/// so swapping to a real gateway later requires no changes to calling code.
/// </summary>
public class SimulatedPaymentGatewayService : IPaymentGatewayService
{
    private readonly ILogger<SimulatedPaymentGatewayService> _logger;

    public SimulatedPaymentGatewayService(
        ILogger<SimulatedPaymentGatewayService> logger)
    {
        _logger = logger;
    }

    public Task<PaymentResult> ReleaseToFreelancerAsync(
        Guid escrowTransactionId,
        decimal amount,
        Guid freelancerUserId,
        CancellationToken ct = default)
    {
        var reference = $"SIM-RELEASE-{Guid.NewGuid():N}"[..24];

        _logger.LogInformation(
            "[SIMULATED PAYMENT] Released {Amount:C} from escrow {EscrowId} to freelancer {FreelancerId}. Ref: {Ref}",
            amount, escrowTransactionId, freelancerUserId, reference);

        return Task.FromResult(new PaymentResult(true, reference));
    }

    public Task<PaymentResult> RefundToClientAsync(
        Guid escrowTransactionId,
        decimal amount,
        Guid clientUserId,
        CancellationToken ct = default)
    {
        var reference = $"SIM-REFUND-{Guid.NewGuid():N}"[..24];

        _logger.LogInformation(
            "[SIMULATED PAYMENT] Refunded {Amount:C} from escrow {EscrowId} to client {ClientId}. Ref: {Ref}",
            amount, escrowTransactionId, clientUserId, reference);

        return Task.FromResult(new PaymentResult(true, reference));
    }
}