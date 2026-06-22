namespace Waseet.Domain.Entities;

public class DeliveryFile
{
    public Guid FileId { get; set; } = Guid.NewGuid();
    public Guid DeliveryId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string BlobRef { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public Delivery Delivery { get; set; } = null!;
}