using MarketForge.Notification.Models;
using Microsoft.EntityFrameworkCore;

namespace MarketForge.Notification.Data;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options)
        : base(options) { }

    public DbSet<Models.Notification> Notifications => Set<Models.Notification>();
    public DbSet<DeliveryAttempt> DeliveryAttempts => Set<DeliveryAttempt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("notifications");

        modelBuilder.Entity<Models.Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).ValueGeneratedNever();
            entity.Property(n => n.Channel).HasMaxLength(20);
            entity.Property(n => n.Status).HasMaxLength(20);
            entity.Property(n => n.Recipient).HasMaxLength(320);
            entity.HasIndex(n => n.Status);
        });

        modelBuilder.Entity<DeliveryAttempt>(entity =>
        {
            entity.ToTable("delivery_attempts");
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Id).ValueGeneratedNever();
            entity.HasIndex(d => d.NotificationId);
        });
    }
}