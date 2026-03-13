import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export function toUtcIsoFromLocalParts(date: string, time: string, tz: string) {
  const wall = `${date} ${time}:00`;
  return fromZonedTime(wall, tz).toISOString();
}

export function splitUtcIsoToLocalParts(utcIso: string, tz: string) {
  return {
    localDate: formatInTimeZone(utcIso, tz, 'yyyy-MM-dd'),
    localTime: formatInTimeZone(utcIso, tz, 'HH:mm'),
  };
}

/**
 * Gets the browser's default timezone
 * @returns IANA timezone string
 */
export const getBrowserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
