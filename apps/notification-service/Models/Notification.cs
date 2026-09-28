namespace MarketForge.Notification.Models;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public Guid? OrderId { get; set; }
    public string Channel { get; set; } = "EMAIL";
    public string Template { get; set; } = "";
    public string Recipient { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
    public string Status { get; set; } = "PENDING"; // PENDING|SENT|FAILED|RETRYING
    public string? ProviderMessageId { get; set; }
    public int RetryCount { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class DeliveryAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid NotificationId { get; set; }
    public int AttemptNo { get; set; }
    public string Outcome { get; set; } = ""; // SENT|FAILED
    public string? ErrorDetail { get; set; }
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
}
