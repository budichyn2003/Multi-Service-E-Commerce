using MarketForge.Notification.Data;
using MarketForge.Notification.Services;
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

app.MapGet("/api/v1/notifications", async (NotificationDbContext db) =>
    Results.Ok(new
    {
        success = true,
        data = await db.Notifications
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .ToListAsync()
    }));

app.Run();

public partial class Program { }
