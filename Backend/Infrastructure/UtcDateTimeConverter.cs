using System.Text.Json;
using System.Text.Json.Serialization;

namespace Infrastructure;

public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader,
        Type typeToConvert, JsonSerializerOptions options)
    {
        var str = reader.GetString();
        return DateTime.Parse(str!, null,
            System.Globalization.DateTimeStyles.RoundtripKind);
    }

    public override void Write(Utf8JsonWriter writer,
        DateTime value, JsonSerializerOptions options)
    {
        // Always write as UTC ISO 8601 with Z suffix
        writer.WriteStringValue(
            DateTime.SpecifyKind(value, DateTimeKind.Utc)
                .ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}