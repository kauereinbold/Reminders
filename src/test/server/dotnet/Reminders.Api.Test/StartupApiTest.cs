using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Reminders.Application.Contracts;
using Reminders.Domain.Models.Blockchain;
using Reminders.Infrastructure.Data.EntityFramework.Contexts;
using Testcontainers.PostgreSql;

namespace Reminders.Api.Test
{
    /// <summary>
    /// Hosts the API in-process against a throwaway Postgres container,
    /// shared by all integration tests in the assembly.
    /// </summary>
    [TestClass]
    public class StartupApiTest
    {
        private static PostgreSqlContainer postgres;
        private static WebApplicationFactory<Program> factory;

        public static HttpClient httpClient;
        public const string BaseAddress = "http://localhost/api";

        [AssemblyInitialize]
        public static async Task StartApi(TestContext context)
        {
            postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();

            await postgres.StartAsync();

            factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("ConnectionStrings:DefaultConnection", postgres.GetConnectionString());
                    builder.UseSetting("DatabaseProvider", "Postgres");

                    // Blockchain writes are best effort (logged and skipped on failure);
                    // these tests exercise the database path, so the chain is a no-op.
                    builder.ConfigureTestServices(services =>
                        services.AddScoped<IRemindersBlockchainService, NoOpBlockchainService>());
                });

            ApplyPostgresMigrations();

            httpClient = factory.CreateClient();
        }

        [AssemblyCleanup]
        public static async Task StopApi()
        {
            httpClient?.Dispose();
            factory?.Dispose();

            if (postgres is not null)
                await postgres.DisposeAsync();
        }

        // Migrations normally run in the dedicated MigrationsRunner service (ADR-0004).
        // Apply only the Postgres set here, using the same namespace filter as the runner.
        private static void ApplyPostgresMigrations()
        {
            using var scope = factory.Services.CreateScope();

            var db = scope.ServiceProvider.GetRequiredService<RemindersContext>();

            var migrationsAssembly = db.GetInfrastructure().GetRequiredService<IMigrationsAssembly>();
            var migrator = db.GetInfrastructure().GetRequiredService<IMigrator>();

            var target = migrationsAssembly.Migrations
                .Where(kv => (kv.Value.Namespace ?? string.Empty).Contains(".Postgres."))
                .Select(kv => kv.Key)
                .OrderBy(id => id)
                .Last();

            migrator.Migrate(target);
        }

        private class NoOpBlockchainService : IRemindersBlockchainService
        {
            public Task<string> CreateReminderAsync(string text) => Task.FromResult(string.Empty);
            public Task<GetReminderOutput> GetReminderAsync(int id) => Task.FromResult(new GetReminderOutput());
            public Task<string> UpdateReminderAsync(int id, string text) => Task.FromResult(string.Empty);
            public Task<string> DeleteReminderAsync(int id) => Task.FromResult(string.Empty);
            public Task<int> GetReminderCountAsync() => Task.FromResult(0);
        }
    }
}
