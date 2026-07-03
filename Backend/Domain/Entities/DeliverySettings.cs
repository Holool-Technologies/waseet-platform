namespace Domain.Entities;

public class DeliverySettings
{
    public int Id { get; set; }              
    public int ReviewWindowDays { get; set; }
    public int MaxRevisions { get; set; }
    public DateTime UpdatedAt { get; set; }
}