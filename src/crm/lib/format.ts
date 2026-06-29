import type { ReportStatus, Severity } from '../types';

export function timeAgo(ts: number, now = Date.now()): string {
  const diff = Math.round((now - ts) / 1000);
  const abs = Math.abs(diff);
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let value = abs;
  let unit = 'second';
  for (const [factor, name] of units) {
    if (value < factor) {
      unit = name;
      break;
    }
    value = value / factor;
  }
  const rounded = Math.floor(value);
  const label = `${rounded} ${unit}${rounded === 1 ? '' : 's'}`;
  return diff >= 0 ? `${label} ago` : `in ${label}`;
}

export function dueLabel(dueAt: number, now = Date.now()): string {
  return now > dueAt ? `Overdue by ${timeAgo(dueAt, now).replace(' ago', '')}` : `Due ${timeAgo(dueAt, now)}`;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  unresolved: 'Unresolved',
};
