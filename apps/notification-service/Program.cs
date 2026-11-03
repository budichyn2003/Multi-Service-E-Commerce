using MarketForge.Notification.Data;
using MarketForge.Notification.Models;
using MarketForge.Notification.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("service", "notification-service")
    .WriteTo.Console(Serilog.Events.LogEventLevel.Information)
    .CreateLogger();
builder.Host.UseSerilog();

builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")
        ?? "Host=postgres;Database=marketforge;Username=marketforge;Password=marketforge"));

builder.Services.AddScoped<IEmailProvider, SmtpEmailProvider>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapHealthChecks("/ready");

// Customer notification history: filtered by user if X-User-Id header or query is present
app.MapGet("/api/v1/notifications", async (
    [FromHeader(Name = "X-User-Id")] string? headerUserId,
    [FromQuery] Guid? userId,
    NotificationDbContext db) =>
{
    Guid? effectiveUserId = userId;
    if (effectiveUserId == null && Guid.TryParse(headerUserId, out var parsed))
    {
        effectiveUserId = parsed;
    }

    var query = db.Notifications.AsQueryable();
    if (effectiveUserId.HasValue)
    {
        query = query.Where(n => n.UserId == effectiveUserId.Value);
    }

    var list = await query
        .OrderByDescending(n => n.CreatedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(new { success = true, data = list });
});

// Admin notification inspection
app.MapGet("/api/v1/admin/notifications", async (
    [FromQuery] string? status,
    [FromQuery] int page,
    [FromQuery] int limit,
    NotificationDbContext db) =>
{
    int pageNum = page > 0 ? page : 1;
    int pageSize = limit > 0 && limit <= 100 ? limit : 20;

    var query = db.Notifications.AsQueryable();
    if (!string.IsNullOrWhiteSpace(status))
    {
        query = query.Where(n => n.Status == status.ToUpper());
    }

    int total = await query.CountAsync();
    var list = await query
        .OrderByDescending(n => n.CreatedAt)
        .Skip((pageNum - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return Results.Ok(new
    {
        success = true,
        data = list,
        pagination = new
        {
            page = pageNum,
            limit = pageSize,
            total,
            totalPages = (int)Math.Ceiling((double)total / pageSize)
        }
    });
});

// Send notification directly (requirements §36, §37)
app.MapPost("/api/v1/notifications", async (
    [FromBody] SendNotificationRequest request,
    IEmailProvider emailProvider,
    NotificationDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Recipient) || string.IsNullOrWhiteSpace(request.Subject))
    {
        return Results.BadRequest(new
        {
            success = false,
            error = new { code = "VALIDATION_ERROR", message = "Recipient and Subject are required" }
        });
    }

    var notification = new MarketForge.Notification.Models.Notification
    {
        Id = Guid.NewGuid(),
        UserId = request.UserId,
        OrderId = request.OrderId,
        Channel = string.IsNullOrWhiteSpace(request.Channel) ? "EMAIL" : request.Channel.ToUpper(),
        Template = request.Template ?? "CUSTOM",
        Recipient = request.Recipient.Trim(),
        Subject = request.Subject.Trim(),
        Body = request.Body ?? "",
        Status = "PENDING",
        RetryCount = 0,
        CreatedAt = DateTime.UtcNow
    };

    var (providerId, error) = await emailProvider.SendAsync(
        notification.Recipient,
        notification.Subject,
        notification.Body
    );

    if (error == null)
    {
        notification.Status = "SENT";
        notification.ProviderMessageId = providerId;
        notification.SentAt = DateTime.UtcNow;
    }
    else
    {
        notification.Status = "FAILED";
    }

    db.Notifications.Add(notification);

    var attempt = new DeliveryAttempt
    {
        Id = Guid.NewGuid(),
        NotificationId = notification.Id,
        AttemptNo = 1,
        Outcome = error == null ? "SENT" : "FAILED",
        ErrorDetail = error,
        AttemptedAt = DateTime.UtcNow
    };
    db.DeliveryAttempts.Add(attempt);

    await db.SaveChangesAsync();

    return Results.Created($"/api/v1/notifications/{notification.Id}", new
    {
        success = true,
        data = notification
    });
});

// Send template-rendered notification (ORDER_CREATED, ORDER_PAID, ORDER_CANCELLED)
app.MapPost("/api/v1/notifications/send-template", async (
    [FromBody] SendTemplateRequest request,
    IEmailProvider emailProvider,
    NotificationDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Recipient) || string.IsNullOrWhiteSpace(request.TemplateKey))
    {
        return Results.BadRequest(new
        {
            success = false,
            error = new { code = "VALIDATION_ERROR", message = "Recipient and TemplateKey are required" }
        });
    }

    var (subject, body) = RenderTemplate(request.TemplateKey, request.Variables ?? new Dictionary<string, string>());

    var notification = new MarketForge.Notification.Models.Notification
    {
        Id = Guid.NewGuid(),
        UserId = request.UserId,
        OrderId = request.OrderId,
        Channel = "EMAIL",
        Template = request.TemplateKey.ToUpper(),
        Recipient = request.Recipient.Trim(),
        Subject = subject,
        Body = body,
        Status = "PENDING",
        RetryCount = 0,
        CreatedAt = DateTime.UtcNow
    };

    var (providerId, error) = await emailProvider.SendAsync(
        notification.Recipient,
        notification.Subject,
        notification.Body
    );

    if (error == null)
    {
        notification.Status = "SENT";
        notification.ProviderMessageId = providerId;
        notification.SentAt = DateTime.UtcNow;
    }
    else
    {
        notification.Status = "FAILED";
    }

    db.Notifications.Add(notification);

    var attempt = new DeliveryAttempt
    {
        Id = Guid.NewGuid(),
        NotificationId = notification.Id,
        AttemptNo = 1,
        Outcome = error == null ? "SENT" : "FAILED",
        ErrorDetail = error,
        AttemptedAt = DateTime.UtcNow
    };
    db.DeliveryAttempts.Add(attempt);

    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        success = true,
        data = notification
    });
});

app.Run();

public record SendNotificationRequest(
    Guid? UserId,
    Guid? OrderId,
    string? Channel,
    string? Template,
    string Recipient,
    string Subject,
    string? Body
);

public record SendTemplateRequest(
    Guid? UserId,
    Guid? OrderId,
    string TemplateKey,
    string Recipient,
    Dictionary<string, string>? Variables
);

public partial class Program
{
    private static (string Subject, string Body) RenderTemplate(string key, Dictionary<string, string> vars)
    {
        string subject;
        string body;

        switch (key.ToUpper())
        {
            case "ORDER_CREATED":
                subject = $"MarketForge — Order Created #{vars.GetValueOrDefault("orderNumber", "")}";
                body = $"Halo {vars.GetValueOrDefault("customerName", "Pelanggan")}, pesanan Anda #{vars.GetValueOrDefault("orderNumber", "")} berhasil dibuat dengan total Rp {vars.GetValueOrDefault("totalAmount", "0")}. Silakan lakukan pembayaran.";
                break;
            case "ORDER_PAID":
                subject = $"MarketForge — Payment Received for #{vars.GetValueOrDefault("orderNumber", "")}";
                body = $"Pembayaran untuk pesanan #{vars.GetValueOrDefault("orderNumber", "")} sebesar Rp {vars.GetValueOrDefault("totalAmount", "0")} telah kami terima. Pesanan Anda segera kami proses.";
                break;
            case "ORDER_CANCELLED":
                subject = $"MarketForge — Order #{vars.GetValueOrDefault("orderNumber", "")} Cancelled";
                body = $"Pesanan #{vars.GetValueOrDefault("orderNumber", "")} telah dibatalkan. Reservasi stok Anda telah kami lepaskan.";
                break;
            default:
                subject = $"MarketForge — Notification";
                body = vars.GetValueOrDefault("message", "Notifikasi dari MarketForge.");
                break;
        }

        return (subject, body);
    }
}
