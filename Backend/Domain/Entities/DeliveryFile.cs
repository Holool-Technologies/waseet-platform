using Domain.Entities;

namespace Domain.Entities;

public class DeliveryFile
{
    public Guid FileId { get; set; } = Guid.NewGuid();
    public Guid DeliveryId { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string BlobRef { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public Delivery Delivery { get; set; } = null!;
}