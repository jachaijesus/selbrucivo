import type { OrientationIdentity } from './signupProtocol';
import type { PathwayId } from './pathways';

export type TimeFormatPreference = '12h' | '24h';
export type TemperatureUnit = 'c' | 'f';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  shortLabel?: string;
};

export type StudentDockPreferences = {
  displayName: string;
  preferredTitle: string;
  schoolName: string;
  programOfStudy: string;
  majorOrDiscipline: string;
  careerTitle: string;
  language: string;
  timezone: string;
  dateFormat: 'short-text';
  timeFormat: TimeFormatPreference;
  temperatureUnit: TemperatureUnit;
  showWeather: boolean;
  showContext: boolean;
  showRecentMaterial: boolean;
};

export const CONTROL_CENTER_PREFERENCES_STORAGE_KEY = 'selbrucivo.control-center.preferences.v1';

export const DEFAULT_LANGUAGE = 'en-US';
export const FALLBACK_TIMEZONE = 'UTC';

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'en-US', label: 'English — United States', shortLabel: 'EN-US' },
  { value: 'en-GB', label: 'English — United Kingdom', shortLabel: 'EN-GB' },
  { value: 'es-ES', label: 'Español — España', shortLabel: 'ES-ES' },
  { value: 'fr-FR', label: 'Français — France', shortLabel: 'FR-FR' },
  { value: 'de-DE', label: 'Deutsch — Deutschland', shortLabel: 'DE-DE' },
  { value: 'pt-BR', label: 'Português — Brasil', shortLabel: 'PT-BR' },
  { value: 'ar', label: 'العربية', shortLabel: 'AR' },
  { value: 'ja-JP', label: '日本語', shortLabel: 'JA-JP' },
];

export const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles' },
  { value: 'America/Denver', label: 'Mountain Time — Denver' },
  { value: 'America/Chicago', label: 'Central Time — Chicago' },
  { value: 'America/New_York', label: 'Eastern Time — New York' },
  { value: 'America/Toronto', label: 'Eastern Time — Toronto' },
  { value: 'America/Mexico_City', label: 'Central Time — Mexico City' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time — São Paulo' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Central European Time — Paris' },
  { value: 'Europe/Berlin', label: 'Central European Time — Berlin' },
  { value: 'Europe/Athens', label: 'Eastern European Time — Athens' },
  { value: 'Africa/Lagos', label: 'West Africa Time — Lagos' },
  { value: 'Africa/Johannesburg', label: 'South Africa Time — Johannesburg' },
  { value: 'Africa/Nairobi', label: 'East Africa Time — Nairobi' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time — Dubai' },
  { value: 'Asia/Kolkata', label: 'India Standard Time — Kolkata' },
  { value: 'Asia/Bangkok', label: 'Indochina Time — Bangkok' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Shanghai', label: 'China Standard Time — Shanghai' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time — Tokyo' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time — Sydney' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time — Auckland' },
  { value: 'UTC', label: 'Coordinated Universal Time — UTC' },
];

export type WeatherContext = {
  temperatureC: number;
  condition: string;
  source: 'mock-fallback';
};

export type RecentMaterialContext = {
  materialId: string;
  title: string;
  pathwayId: PathwayId;
  pathwayLabel: string;
  lastActivatedAt: string;
};

export const fallbackWeatherContext: WeatherContext = {
  temperatureC: 23,
  condition: 'Light rain',
  source: 'mock-fallback',
};

export function isSupportedLocale(value: string) {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([value]).length > 0;
  } catch {
    return false;
  }
}

export function isSupportedTimezone(value: string) {
  try {
    new Intl.DateTimeFormat(DEFAULT_LANGUAGE, { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeLocale(value?: string) {
  if (!value) {
    return DEFAULT_LANGUAGE;
  }

  if (value === 'EN-US') {
    return DEFAULT_LANGUAGE;
  }

  return isSupportedLocale(value) ? value : DEFAULT_LANGUAGE;
}

export function normalizeTimezone(value?: string) {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (value && isSupportedTimezone(value)) {
    return value;
  }

  return isSupportedTimezone(browserTimezone) ? browserTimezone : FALLBACK_TIMEZONE;
}

export function normalizeDockPreferences(preferences: StudentDockPreferences): StudentDockPreferences {
  return {
    ...preferences,
    language: normalizeLocale(preferences.language),
    timezone: normalizeTimezone(preferences.timezone),
  };
}

export function createDockPreferencesFromIdentity(identity?: OrientationIdentity): StudentDockPreferences {
  return normalizeDockPreferences({
    displayName: identity?.preferredName || identity?.addressName || 'Student',
    preferredTitle: '',
    schoolName: identity?.schoolName ?? '',
    programOfStudy: identity?.programOfStudy ?? '',
    majorOrDiscipline: '',
    careerTitle: '',
    language: identity?.preferredLanguage || navigator.language || DEFAULT_LANGUAGE,
    timezone: identity?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'short-text',
    timeFormat: '24h',
    temperatureUnit: 'c',
    showWeather: true,
    showContext: true,
    showRecentMaterial: true,
  });
}

export function normalizeDockText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function formatDockSegment(value: string) {
  return normalizeDockText(value).toUpperCase();
}

export function getStudentContextLabel(preferences: StudentDockPreferences) {
  if (!preferences.showContext) {
    return '';
  }

  return [
    preferences.schoolName,
    preferences.careerTitle,
    preferences.programOfStudy,
    preferences.majorOrDiscipline,
    preferences.preferredTitle,
  ].map(normalizeDockText).find(Boolean) ?? '';
}

export function formatStudentIdentityLine(preferences: StudentDockPreferences) {
  return [
    preferences.displayName,
    getStudentContextLabel(preferences),
    'Selbrucivo',
  ].map(formatDockSegment).filter(Boolean).join(' × ');
}

export function formatRecentMaterialLine(recentMaterial?: RecentMaterialContext) {
  if (!recentMaterial) {
    return 'NO ACTIVE MATERIAL';
  }

  return [recentMaterial.title, recentMaterial.pathwayLabel].map(formatDockSegment).filter(Boolean).join(' × ');
}

export function formatWeatherContext(weather: WeatherContext, unit: TemperatureUnit) {
  const temperature = unit === 'f'
    ? Math.round((weather.temperatureC * 9) / 5 + 32)
    : Math.round(weather.temperatureC);
  const suffix = unit === 'f' ? 'F' : 'C';

  return `${temperature}°${suffix} / ${formatDockSegment(weather.condition)}`;
}
