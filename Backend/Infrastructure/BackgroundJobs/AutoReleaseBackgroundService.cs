using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Waseet.Application.Features.Delivery.Interfaces;

namespace Waseet.Infrastructure.BackgroundJobs;

/// <summary>
/// Runs every hour. Finds deliveries past their review deadline with no
/// client response and auto-releases escrow to the freelancer.
/// </summary>
public class AutoReleaseBackgroundService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<AutoReleaseBackgroundService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    public AutoReleaseBackgroundService(
        IServiceProvider services,
        ILogger<AutoReleaseBackgroundService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AutoReleaseBackgroundService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var deliveryService = scope.ServiceProvider
                    .GetRequiredService<IDeliveryService>();

                var processed = await deliveryService.ProcessAutoReleasesAsync(stoppingToken);

                if (processed > 0)
                    _logger.LogInformation(
                        "Auto-release cycle processed {Count} deliveries.", processed);
            }
            catch (Exception ex)
            {
                // Never let one failed cycle kill the background service
                _logger.LogError(ex, "AutoReleaseBackgroundService cycle failed.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("AutoReleaseBackgroundService stopped.");
    }
}