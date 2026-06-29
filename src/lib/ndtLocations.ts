import type { NdtReading } from '../types/ndt';

export interface NdtLocationGroup {
  locationId: string;
  readings: NdtReading[];
  latest: NdtReading;
  index: number;
}

export interface NdtTrendPoint {
  date: string;
  value: number;
  reading: NdtReading;
}

/** Ensure every reading has a locationId (migration for older data). */
export function normalizeReadings(readings: NdtReading[]): NdtReading[] {
  return readings.map((r) => ({
    ...r,
    locationId: r.locationId ?? r.id,
  }));
}

export function groupByLocation(readings: NdtReading[]): Map<string, NdtReading[]> {
  const map = new Map<string, NdtReading[]>();
  for (const r of normalizeReadings(readings)) {
    const list = map.get(r.locationId) ?? [];
    list.push(r);
    map.set(r.locationId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate));
  }
  return map;
}

export function listLocationGroups(readings: NdtReading[]): NdtLocationGroup[] {
  const groups = groupByLocation(readings);
  return [...groups.entries()].map(([locationId, items], i) => ({
    locationId,
    readings: items,
    latest: items[items.length - 1],
    index: i + 1,
  }));
}

export function readingsAtLocation(
  readings: NdtReading[],
  locationId: string,
): NdtReading[] {
  return groupByLocation(readings).get(locationId) ?? [];
}

export function latestReadingPerLocation(readings: NdtReading[]): NdtReading[] {
  return listLocationGroups(readings).map((g) => g.latest);
}

export function trendPoints(readings: NdtReading[]): NdtTrendPoint[] {
  return readings
    .map((r) => ({
      date: r.inspectionDate,
      value: parseFloat(r.reading),
      reading: r,
    }))
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function parseReference(value: string): number | null {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}
