using Application.Features.Admin.DTOs;
using Application.Features.Admin.Interfaces;
using Azure.Core;
using Infrastructure.Services;
using Waseet.Application.Features.Tasks.Interfaces;

namespace Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .WithOpenApi()
            .RequireAuthorization("AdminOnly");

        // Dashboard stats
        group.MapGet("/stats", async (IAdminService adminService, CancellationToken ct) =>
            Results.Ok(await adminService.GetStatsAsync(ct)));

        // Users
        group.MapGet("/users", async (
            IAdminService adminService,
            int page, int pageSize, string? search, string? role,
            CancellationToken ct) =>
            Results.Ok(await adminService.GetUsersAsync(page, pageSize, search, role, ct)));

        group.MapPatch("/users/{userId:guid}/ban", async (
            Guid userId, BanUserRequest request,
            IAdminService adminService, CancellationToken ct) =>
        {
            await adminService.BanUserAsync(userId, request.Ban, ct);
            return Results.NoContent();
        });

        group.MapDelete("/users/{userId:guid}", async (
            Guid userId, IAdminService adminService, CancellationToken ct) =>
        {
            await adminService.DeleteUserAsync(userId, ct);
            return Results.NoContent();
        });

        // KYC queue
        group.MapGet("/kyc", async (
            IAdminService adminService,
            int page, int pageSize, string? status,
            CancellationToken ct) =>
            Results.Ok(await adminService.GetKycQueueAsync(page, pageSize, status, ct)));

        group.MapPatch("/kyc/{kycId:guid}/decide", async (
            Guid kycId, AdminDecideKycRequest request,
            IAdminService adminService, CancellationToken ct) =>
        {
            await adminService.DecideKycAsync(kycId, request.Decision, ct);
            return Results.NoContent();
        });

        // Tasks
        group.MapGet("/tasks", async (
            IAdminService adminService,
            int page, int pageSize, string? search, string? status,
            CancellationToken ct) =>
            Results.Ok(await adminService.GetTasksAsync(page, pageSize, search, status, ct)));

        group.MapDelete("/tasks/{taskId:guid}", async (
            Guid taskId, IAdminService adminService, CancellationToken ct) =>
        {
            await adminService.DeleteTaskAsync(taskId, ct);
            return Results.NoContent();
        });

        // Escrow
        group.MapGet("/escrow", async (
            IAdminService adminService,
            int page, int pageSize, string? status,
            CancellationToken ct) =>
            Results.Ok(await adminService.GetEscrowsAsync(page, pageSize, status, ct)));

        group.MapPatch("/escrow/{escrowId:guid}/resolve", async (
            Guid escrowId, AdminResolveDisputeRequest request,
            IAdminService adminService, CancellationToken ct) =>
        {
            await adminService.ResolveDisputeAsync(escrowId, request.Resolution, ct);
            return Results.NoContent();
        });

        // Chat audit logs
        group.MapGet("/chat-logs", async (
            IAdminService adminService,
            int page, int pageSize, bool blockedOnly,
            CancellationToken ct) =>
            Results.Ok(await adminService.GetChatLogsAsync(page, pageSize, blockedOnly, ct)));

        // Task approval queue
        group.MapGet("/tasks/pending-approval", async (
            ITaskService taskService,
            int page, int pageSize, CancellationToken ct) =>
            Results.Ok(await taskService.GetPendingApprovalAsync(page, pageSize, ct)));

        group.MapPatch("/tasks/{taskId:guid}/approve", async (
            Guid taskId, ITaskService taskService, CancellationToken ct) =>
        {
            var task = await taskService.AdminApproveTaskAsync(taskId, ct);
            return Results.Ok(task);
        });

        group.MapPatch("/tasks/{taskId:guid}/reject", async (
            Guid taskId,
            AdminRejectTaskRequest request,
            ITaskService taskService, CancellationToken ct) =>
        {
            await taskService.AdminRejectTaskAsync(taskId, request.Reason, ct);
            return Results.NoContent();
        });
    }
}