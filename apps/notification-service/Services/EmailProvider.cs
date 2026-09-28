using System.Net;
using System.Net.Mail;

namespace MarketForge.Notification.Services;

/// <summary>Provider abstraction per requirements §37.</summary>
public interface IEmailProvider
{
    Task<(string? ProviderMessageId, string? Error)> SendAsync(string to, string subject, string body);
}

/// <summary>
/// SMTP adapter. Locally this targets MailHog. Retries are owned by the
/// caller (notification worker), keeping this adapter single-purpose.
/// </summary>
public class SmtpEmailProvider : IEmailProvider
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailProvider> _logger;

    public SmtpEmailProvider(IConfiguration config, ILogger<SmtpEmailProvider> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<(string? ProviderMessageId, string? Error)> SendAsync(
        string to, string subject, string body)
    {
        try
        {
            var host = _config["SMTP_HOST"] ?? "mailhog";
            var port = int.TryParse(_config["SMTP_PORT"], out var p) ? p : 1025;
            var from = _config["EMAIL_FROM"] ?? "noreply@marketforge.local";

            using var client = new SmtpClient(host, port) { EnableSsl = false };
            using var message = new MailMessage(from, to, subject, body);
            var id = Guid.NewGuid().ToString("n");
            await client.SendMailAsync(message);
            _logger.LogInformation("email sent to {To} via {Host}:{Port}", to, host, port);
            return (id, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("email send failed to {To}: {Error}", to, ex.Message);
            return (null, ex.Message);
        }
    }
}
