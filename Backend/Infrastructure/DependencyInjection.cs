using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Waseet.Infrastructure.Persistence;

namespace Waseet.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<WaseetDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("WaseetDb"),
                sql => sql.MigrationsAssembly(typeof(WaseetDbContext).Assembly.FullName)
            ));

        return services;
    }
}