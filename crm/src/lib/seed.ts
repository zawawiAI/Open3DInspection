import { v4 as uuid } from 'uuid';
import type { CrmData, Person, Report } from '../types';
import { assignInitial, dueDateFor, makeActivity } from './escalation';

function person(
  name: string,
  role: string,
  order: number,
  skills: string[],
  available = true,
): Person {
  return { id: uuid(), name, role, order, skills, available };
}

const HOUR = 60 * 60 * 1000;

export function buildSeed(): CrmData {
  const people: Person[] = [
    person('Aisha Rahman', 'Field Technician', 1, ['electrical', 'general']),
    person('Marcus Lee', 'Field Technician', 1, ['plumbing', 'general']),
    person('Diego Santos', 'Senior Technician', 2, ['structural', 'electrical']),
    person('Priya Nair', 'Maintenance Lead', 3, ['structural', 'safety']),
    person('Tom Becker', 'Operations Manager', 4, ['approval', 'safety']),
  ];

  const now = Date.now();

  const draft = (
    ref: string,
    title: string,
    description: string,
    location: string,
    category: string,
    severity: Report['severity'],
    reporter: string,
    createdOffsetH: number,
  ): Report => ({
    id: uuid(),
    ref,
    title,
    description,
    location,
    category,
    severity,
    status: 'new',
    reporter,
    assigneeId: null,
    escalationLevel: 0,
    attempts: [],
    activity: [makeActivity('created', `Report ${ref} created.`, reporter)],
    createdAt: now - createdOffsetH * HOUR,
    updatedAt: now - createdOffsetH * HOUR,
    dueAt: dueDateFor(severity, now - createdOffsetH * HOUR),
    source: 'manual',
  });

  // create then auto-assign to the first available tech
  const reports: Report[] = [
    draft(
      'INS-1001',
      'Cracked support beam in warehouse',
      'Visible crack along the east support beam near loading bay 3. Flagged during structural inspection.',
      'Warehouse A · Bay 3',
      'structural',
      'critical',
      'inspector.jones',
      6,
    ),
    draft(
      'INS-1002',
      'Exposed wiring in server room',
      'Frayed conduit exposing live wiring above rack 12.',
      'Building B · Server Room',
      'electrical',
      'high',
      'inspector.jones',
      30,
    ),
    draft(
      'INS-1003',
      'Leaking pipe under sink',
      'Slow drip from the supply line in the 2nd-floor kitchenette.',
      'Building B · Floor 2',
      'plumbing',
      'low',
      'inspector.adams',
      2,
    ),
    draft(
      'INS-1004',
      'Fire exit door jammed',
      'North stairwell fire-exit door does not open from the inside.',
      'Building A · North Stairwell',
      'safety',
      'high',
      'inspector.adams',
      1,
    ),
  ].map((r) => assignInitial(r, people, 'system'));

  return { version: 1, people, reports };
}
