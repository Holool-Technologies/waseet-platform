using Application.Features.Delivery.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.BackgroundJobs;

public class AutoReleaseBackgroundService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<AutoReleaseBackgroundService> _logger;

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

                var released = await deliveryService.ProcessAutoReleasesAsync(stoppingToken);

                if (released > 0)
                    _logger.LogInformation(
                        "Auto-released {Count} deliveries.", released);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AutoRelease cycle failed.");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}