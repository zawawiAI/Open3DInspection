/** Common NDT methods used in oil & gas inspection. */
export type NdtMethod =
  | 'ut_thickness'
  | 'ut_flaw'
  | 'paut'
  | 'tofd'
  | 'rt'
  | 'mt'
  | 'pt'
  | 'et'
  | 'vt'
  | 'hardness'
  | 'pmi'
  | 'holiday'
  | 'other';

export interface NdtReading {
  id: string;
  assetId: string;
  /** Groups repeat inspections at the same CML / monitoring point */
  locationId: string;
  position: [number, number, number];
  normal?: [number, number, number];
  /** ISO date YYYY-MM-DD */
  inspectionDate: string;
  method: NdtMethod;
  /** Measured value (thickness, indication size, etc.) */
  reading: string;
  unit: string;
  /** Nominal / design thickness (UT) */
  nominalThickness: string;
  /** Minimum allowed thickness or acceptance limit */
  minAllowed: string;
  /** Asset tag, line, weld ID, CML point */
  locationTag: string;
  /** Probe, gauge, or instrument ID */
  equipment: string;
  calibrationRef: string;
  notes: string;
  author: string;
  createdAt: number;
}

export type NdtInteractionMode = 'navigate' | 'tag';

export interface NdtProjectFile {
  version: 1;
  assetName: string;
  readings: NdtReading[];
  exportedAt: number;
}
