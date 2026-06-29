import type { NdtMethod } from '../types/ndt';

export interface NdtMethodInfo {
  id: NdtMethod;
  label: string;
  defaultUnit: string;
  readingLabel: string;
  units: string[];
}

/** NDT method catalog for oil & gas inspection workflows. */
export const NDT_METHODS: NdtMethodInfo[] = [
  {
    id: 'ut_thickness',
    label: 'Ultrasonic Thickness (UT)',
    defaultUnit: 'mm',
    readingLabel: 'Measured thickness',
    units: ['mm', 'in', 'mil'],
  },
  {
    id: 'ut_flaw',
    label: 'Ultrasonic Flaw Detection',
    defaultUnit: 'mm',
    readingLabel: 'Indication size / depth',
    units: ['mm', 'in', '%'],
  },
  {
    id: 'paut',
    label: 'Phased Array UT (PAUT)',
    defaultUnit: 'mm',
    readingLabel: 'Defect height / length',
    units: ['mm', 'in'],
  },
  {
    id: 'tofd',
    label: 'Time-of-Flight Diffraction (TOFD)',
    defaultUnit: 'mm',
    readingLabel: 'Through-wall height',
    units: ['mm', 'in'],
  },
  {
    id: 'rt',
    label: 'Radiographic Testing (RT)',
    defaultUnit: '—',
    readingLabel: 'Indication class / density',
    units: ['—', 'IQI', 'class'],
  },
  {
    id: 'mt',
    label: 'Magnetic Particle (MT)',
    defaultUnit: '—',
    readingLabel: 'Indication description',
    units: ['—', 'mm'],
  },
  {
    id: 'pt',
    label: 'Liquid Penetrant (PT)',
    defaultUnit: '—',
    readingLabel: 'Indication description',
    units: ['—', 'mm'],
  },
  {
    id: 'et',
    label: 'Eddy Current (ET)',
    defaultUnit: '% IACS',
    readingLabel: 'Signal / wall loss',
    units: ['% IACS', 'mm', 'dB'],
  },
  {
    id: 'vt',
    label: 'Visual Testing (VT)',
    defaultUnit: '—',
    readingLabel: 'Finding / rating',
    units: ['—', 'mm'],
  },
  {
    id: 'hardness',
    label: 'Hardness Testing',
    defaultUnit: 'HV',
    readingLabel: 'Hardness value',
    units: ['HV', 'HB', 'HRC'],
  },
  {
    id: 'pmi',
    label: 'Positive Material ID (PMI)',
    defaultUnit: '%',
    readingLabel: 'Alloy / element',
    units: ['%', 'grade'],
  },
  {
    id: 'holiday',
    label: 'Holiday / Coating Test',
    defaultUnit: 'V',
    readingLabel: 'Test voltage / result',
    units: ['V', 'kV', 'pass/fail'],
  },
  {
    id: 'other',
    label: 'Other NDT',
    defaultUnit: '—',
    readingLabel: 'Reading',
    units: ['—', 'mm', 'in', 'dB'],
  },
];

export function ndtMethodInfo(method: NdtMethod): NdtMethodInfo {
  return NDT_METHODS.find((m) => m.id === method) ?? NDT_METHODS[0];
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when measured UT thickness is below minimum allowed. */
export function isBelowMinAllowed(reading: {
  method: NdtMethod;
  reading: string;
  minAllowed: string;
}): boolean {
  if (reading.method !== 'ut_thickness' && reading.method !== 'ut_flaw') return false;
  const val = parseFloat(reading.reading);
  const min = parseFloat(reading.minAllowed);
  if (!Number.isFinite(val) || !Number.isFinite(min)) return false;
  return val < min;
}
