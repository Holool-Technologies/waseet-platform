using Application.Features.Tasks.DTOs;
using System.Security.Claims;
using Application.Features.Tasks.Interfaces;

namespace Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks")
            .WithTags("Tasks")
            .WithOpenApi();

        // Public: browse tasks
        group.MapGet("/", async (
            [AsParameters] TaskListRequest request,
            ITaskService taskService,
            CancellationToken ct) =>
        {
            var result = await taskService.BrowseAsync(request, ct);
            return Results.Ok(result);
        });

        // Public: get task by code
        group.MapGet("/{code}", async (
            string code,
            ITaskService taskService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetOptionalUserId(user);
                var task = await taskService.GetByCodeAsync(code, userId, ct);
                return Results.Ok(task);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        });

        // Auth: get my tasks
        group.MapGet("/mine", async (
            ITaskService taskService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var tasks = await taskService.GetMineAsync(userId, ct);
            return Results.Ok(tasks);
        }).RequireAuthorization();

        // Auth: create task
        group.MapPost("/", async (
            CreateTaskRequest request,
            ITaskService taskService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var task = await taskService.CreateAsync(userId, request, ct);
                return Results.Created($"/api/tasks/{task.PublicTaskCode}", task);
            }
            catch (InvalidOperationException ex) when
            (ex.Message is "TASK_DESC_BLOCKED" or "TASK_TITLE_BLOCKED")
            {
                return Results.BadRequest(new { code = ex.Message });
            }
        }).RequireAuthorization();

        // Auth: submit proposal (freelancer)
        group.MapPost("/{code}/proposals", async (
    string code,
    CreateProposalRequest request,
    ITaskService taskService,
    ClaimsPrincipal user,
    CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var proposal = await taskService.SubmitProposalAsync(
                    userId, code, request, ct);
                return Results.Created($"/api/tasks/{code}/proposals", proposal);
            }
            catch (InvalidOperationException ex)
            {
                // ابعت الـ error code للـ frontend يترجمه
                return Results.BadRequest(new { code = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        }).RequireAuthorization();

        // Auth: get proposals 
        group.MapGet("/{code}/proposals", async (
    string code,
    ITaskService taskService,
    ClaimsPrincipal user,
    CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var role = user.FindFirstValue("role");
    var isClient = role == "Client";
    try
    {
        var proposals = await taskService.GetProposalsAsync(userId, code, isClient, ct);
        return Results.Ok(proposals);
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Forbid();
    }
}).RequireAuthorization();
        // Auth: award proposal (client only)
        group.MapPatch("/{code}/award/{proposalId:guid}", async (
            string code,
            Guid proposalId,
            ITaskService taskService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var task = await taskService.AwardProposalAsync(userId, code, proposalId, ct);
                return Results.Ok(task);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        }).RequireAuthorization();

        // Auth: get escrow for task
        group.MapGet("/{code}/escrow", async (
            string code,
            ITaskService taskService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            try
            {
                var escrow = await taskService.GetEscrowAsync(code, ct);
                return Results.Ok(escrow);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        }).RequireAuthorization();
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static Guid? GetOptionalUserId(ClaimsPrincipal user)
    {
        if (user?.Identity?.IsAuthenticated != true)
            return null;

        var userId = user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var id) ? id : null;
    }
}