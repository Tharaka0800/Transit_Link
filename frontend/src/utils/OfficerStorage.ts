import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IncidentAlert {
  id: string;
  busId: string;
  route: string;
  delayTime: string;
  status: 'URGENT' | 'WARNING' | 'RESOLVED';
  createdAt: number;
}

export type NewIncidentAlert = Omit<IncidentAlert, 'id' | 'createdAt'>;
export type IncidentAlertUpdates = Partial<NewIncidentAlert>;

const STORAGE_KEY = '@transit_incidents';
const EDITABLE_FIELDS = ['busId', 'route', 'delayTime', 'status'] as const;
let nextId = 0;
let pending: Promise<void> = Promise.resolve();

// Every operation shares this queue, including the initial sample-data write.
// Recovering the queue after rejection lets users retry a failed operation.
function serially<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.then(() => undefined, () => undefined);
  return result;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStatus(value: unknown): value is IncidentAlert['status'] {
  return value === 'URGENT' || value === 'WARNING' || value === 'RESOLVED';
}

function validateIncident(value: unknown): value is IncidentAlert {
  return isObject(value)
    && isNonemptyString(value.id)
    && isNonemptyString(value.busId)
    && isNonemptyString(value.route)
    && isNonemptyString(value.delayTime)
    && isStatus(value.status)
    && typeof value.createdAt === 'number'
    && Number.isFinite(value.createdAt)
    && value.createdAt >= 0;
}

function newestFirst(incidents: IncidentAlert[]): IncidentAlert[] {
  return [...incidents].sort((left, right) => right.createdAt - left.createdAt);
}

function validateFields(value: unknown, partial: boolean): IncidentAlertUpdates {
  if (!isObject(value)) {
    throw new Error('Incident details must be an object.');
  }

  const fields: IncidentAlertUpdates = {};
  for (const field of EDITABLE_FIELDS) {
    if (partial && !Object.prototype.hasOwnProperty.call(value, field)) {
      continue;
    }

    const entry = value[field];
    if (field === 'status') {
      if (!isStatus(entry)) {
        throw new Error('Select a valid incident status.');
      }
      fields.status = entry;
    } else {
      if (!isNonemptyString(entry)) {
        throw new Error(`${field} is required.`);
      }
      fields[field] = entry.trim();
    }
  }
  return fields;
}

async function writeIncidents(incidents: IncidentAlert[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Please try again.';
    throw new Error(`Could not save incidents on this device. ${detail}`);
  }
}

async function readIncidents(): Promise<IncidentAlert[]> {
  let stored: string | null;
  try {
    stored = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Please try again.';
    throw new Error(`Could not read saved incidents on this device. ${detail}`);
  }

  if (stored === null) {
    const now = Date.now();
    const samples: IncidentAlert[] = [
      {
        id: 'sample-bus-154',
        busId: '154',
        route: 'CMB → KDY',
        delayTime: '15m',
        status: 'URGENT',
        createdAt: now,
      },
      {
        id: 'sample-bus-138',
        busId: '138',
        route: 'KDY → CMB',
        delayTime: '8m',
        status: 'WARNING',
        createdAt: Math.max(0, now - 60_000),
      },
    ];
    await writeIncidents(samples);
    return samples;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('Saved incidents are unreadable. Existing data was left unchanged.');
  }

  if (!Array.isArray(parsed) || !parsed.every(validateIncident)) {
    throw new Error('Saved incidents contain invalid data.');
  }
  const incidents: IncidentAlert[] = parsed;
  const ids = new Set(incidents.map((incident) => incident.id));
  if (ids.size !== incidents.length) {
    throw new Error('Saved incidents contain duplicate IDs.');
  }
  return newestFirst(incidents);
}

function createId(incidents: IncidentAlert[]): string {
  const existing = new Set(incidents.map((incident) => incident.id));
  let id: string;
  do {
    nextId += 1;
    id = `incident-${Date.now().toString(36)}-${nextId.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  } while (existing.has(id));
  return id;
}

export function getIncidents(): Promise<IncidentAlert[]> {
  return serially(readIncidents);
}

export function addIncident(incident: NewIncidentAlert): Promise<IncidentAlert> {
  return serially(async () => {
    const fields = validateFields(incident, false) as NewIncidentAlert;
    const incidents = await readIncidents();
    const created: IncidentAlert = {
      ...fields,
      id: createId(incidents),
      createdAt: Date.now(),
    };
    await writeIncidents(newestFirst([created, ...incidents]));
    return created;
  });
}

export function updateIncident(id: string, updates: IncidentAlertUpdates): Promise<IncidentAlert> {
  return serially(async () => {
    if (!isNonemptyString(id)) {
      throw new Error('An incident ID is required.');
    }
    const fields = validateFields(updates, true);
    const incidents = await readIncidents();
    const index = incidents.findIndex((incident) => incident.id === id);
    if (index === -1) {
      throw new Error('This incident no longer exists.');
    }
    const updated: IncidentAlert = { ...incidents[index], ...fields };
    incidents[index] = updated;
    await writeIncidents(incidents);
    return updated;
  });
}

export function deleteIncident(id: string): Promise<void> {
  return serially(async () => {
    if (!isNonemptyString(id)) {
      throw new Error('An incident ID is required.');
    }
    const incidents = await readIncidents();
    const remaining = incidents.filter((incident) => incident.id !== id);
    if (remaining.length !== incidents.length) {
      await writeIncidents(remaining);
    }
  });
}
