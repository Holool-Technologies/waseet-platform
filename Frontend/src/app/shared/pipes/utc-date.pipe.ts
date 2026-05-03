import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'utcDate', standalone: true, pure: true })
export class UtcDatePipe implements PipeTransform {
  transform(value: string | Date | null, format: 'date' | 'time' | 'datetime' | 'short' = 'short'): string {
    if (!value) return '';
    const d = new Date(typeof value === 'string' ? value : value.toISOString());

    // Parse as UTC — dates from API always have Z suffix after our fix
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: 'UTC',
      ...(format === 'date'     && { year: 'numeric', month: 'short', day: 'numeric' }),
      ...(format === 'time'     && { hour: '2-digit', minute: '2-digit' }),
      ...(format === 'datetime' && { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      ...(format === 'short'    && { day: 'numeric', month: 'short' }),
    };

    return new Intl.DateTimeFormat('en-GB', opts).format(d);
  }
}