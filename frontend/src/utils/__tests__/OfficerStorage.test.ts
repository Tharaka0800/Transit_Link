import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addIncident,
  deleteIncident,
  getIncidents,
  IncidentAlert,
  IncidentAlertUpdates,
  NewIncidentAlert,
  updateIncident,
} from '../OfficerStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const STORAGE_KEY = '@transit_incidents';
const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

function existing(id: string, createdAt: number): IncidentAlert {
  return {
    id,
    busId: '154',
    route: 'CMB → KDY',
    delayTime: '15m',
    status: 'URGENT',
    createdAt,
  };
}

const newAlert: NewIncidentAlert = {
  busId: '120',
  route: 'CMB → GAL',
  delayTime: '10m',
  status: 'WARNING',
};

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('initializes two samples exactly once, including simultaneous first reads', async () => {
  const [first, second] = await Promise.all([getIncidents(), getIncidents()]);

  expect(first).toHaveLength(2);
  expect(first[0]).toMatchObject({ busId: '154', delayTime: '15m', status: 'URGENT' });
  expect(second).toEqual(first);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(first));

  expect(await getIncidents()).toEqual(first);
  expect(setItem).toHaveBeenCalledTimes(1);
});

test('reads newest first and keeps stored order for equal timestamps', async () => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([
    existing('older', 1),
    existing('same-a', 3),
    existing('newest', 5),
    existing('same-b', 3),
  ]));
  setItem.mockClear();

  expect((await getIncidents()).map((incident) => incident.id)).toEqual([
    'newest', 'same-a', 'same-b', 'older',
  ]);
  expect(setItem).not.toHaveBeenCalled();
});

test('creates unique incidents at the same timestamp and trims fields', async () => {
  await AsyncStorage.setItem(STORAGE_KEY, '[]');
  jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
  jest.spyOn(Math, 'random').mockReturnValue(0.5);

  const first = await addIncident({ ...newAlert, busId: ' 120 ', delayTime: ' 10m ' });
  const second = await addIncident(newAlert);

  expect(first.id).not.toBe(second.id);
  expect(first).toMatchObject({ ...newAlert, createdAt: 1_000_000 });
  expect((await getIncidents()).map((incident) => incident.id)).toEqual([second.id, first.id]);
});

test('updates only provided fields and protects IDs and creation times from untyped callers', async () => {
  const original = existing('immutable-id', 123);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([original]));
  const untypedUpdates = {
    status: 'RESOLVED',
    delayTime: ' 20m ',
    id: 'replacement',
    createdAt: 999,
  } as IncidentAlertUpdates;

  const updated = await updateIncident(original.id, untypedUpdates);

  expect(updated).toEqual({ ...original, status: 'RESOLVED', delayTime: '20m' });
  expect(await getIncidents()).toEqual([updated]);
});

test('reports an unknown update ID without altering existing records', async () => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([existing('real-id', 123)]));
  setItem.mockClear();

  await expect(updateIncident('missing', { status: 'RESOLVED' })).rejects.toThrow('no longer exists');
  expect(setItem).not.toHaveBeenCalled();
  expect(await getIncidents()).toEqual([existing('real-id', 123)]);
});

test('deletes incidents idempotently and never reseeds an intentionally empty collection', async () => {
  const samples = await getIncidents();
  await Promise.all(samples.map((incident) => deleteIncident(incident.id)));
  setItem.mockClear();

  expect(await getIncidents()).toEqual([]);
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('[]');
  await deleteIncident('already-removed');
  expect(await getIncidents()).toEqual([]);
  expect(setItem).not.toHaveBeenCalled();
});

test('keeps an empty collection after the storage module is restarted', async () => {
  const samples = await getIncidents();
  await Promise.all(samples.map((incident) => deleteIncident(incident.id)));
  setItem.mockClear();

  let restarted: typeof import('../OfficerStorage') | undefined;
  jest.isolateModules(() => {
    // AsyncStorage represents the device: restarting module state must not erase it.
    jest.doMock('@react-native-async-storage/async-storage', () => AsyncStorage);
    restarted = require('../OfficerStorage');
  });

  expect(await restarted!.getIncidents()).toEqual([]);
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('[]');
  expect(setItem).not.toHaveBeenCalled();
});

test('boots sample storage consistently when creation is the first operation', async () => {
  const created = await addIncident(newAlert);
  const incidents = await getIncidents();

  expect(incidents).toHaveLength(3);
  expect(incidents).toContainEqual(created);
  expect(incidents.filter((incident) => incident.id.startsWith('sample-'))).toHaveLength(2);
});

test('queues concurrent creation, update, deletion and reads without dropping changes', async () => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([
    existing('keep', 100), existing('remove', 90),
  ]));

  const [createdA, createdB, updated, , result] = await Promise.all([
    addIncident({ ...newAlert, busId: '120-A' }),
    addIncident({ ...newAlert, busId: '120-B' }),
    updateIncident('keep', { status: 'RESOLVED' }),
    deleteIncident('remove'),
    getIncidents(),
  ]);

  expect(result).toHaveLength(3);
  expect(result).toEqual(expect.arrayContaining([createdA, createdB, updated]));
  expect(await getIncidents()).toEqual(result);
});

test.each([
  ['broken JSON', '{'],
  ['non-array JSON', '{}'],
  ['invalid incident schema', JSON.stringify([{ id: 'missing-fields' }])],
  ['invalid status', JSON.stringify([{ ...existing('bad-status', 1), status: 'OTHER' }])],
  ['invalid timestamp', JSON.stringify([{ ...existing('bad-time', 1), createdAt: -1 }])],
  ['blank route', JSON.stringify([{ ...existing('blank-route', 1), route: '  ' }])],
  ['duplicate IDs', JSON.stringify([existing('same-id', 2), existing('same-id', 1)])],
])('rejects %s without overwriting saved data', async (_description, stored) => {
  await AsyncStorage.setItem(STORAGE_KEY, stored);
  setItem.mockClear();

  await expect(getIncidents()).rejects.toThrow('Saved incidents');
  await expect(addIncident(newAlert)).rejects.toThrow('Saved incidents');
  await expect(updateIncident('missing-fields', { status: 'RESOLVED' })).rejects.toThrow('Saved incidents');
  await expect(deleteIncident('missing-fields')).rejects.toThrow('Saved incidents');
  expect(setItem).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(stored);

  await AsyncStorage.setItem(STORAGE_KEY, '[]');
  expect(await getIncidents()).toEqual([]);
});

test('rejects invalid creation and updates without changing valid storage', async () => {
  const original = existing('real-id', 123);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([original]));
  setItem.mockClear();

  await expect(addIncident({ ...newAlert, busId: '  ' })).rejects.toThrow('busId');
  await expect(addIncident({ ...newAlert, status: 'OTHER' } as unknown as NewIncidentAlert)).rejects.toThrow('status');
  await expect(updateIncident(original.id, { route: '' })).rejects.toThrow('route');
  await expect(deleteIncident('')).rejects.toThrow('ID');
  expect(setItem).not.toHaveBeenCalled();
  expect(await getIncidents()).toEqual([original]);
});

test('propagates read failures without initializing samples and allows a later retry', async () => {
  getItem.mockRejectedValueOnce(new Error('read unavailable'));

  await expect(getIncidents()).rejects.toThrow('read unavailable');
  expect(setItem).not.toHaveBeenCalled();
  expect(await getIncidents()).toHaveLength(2);
});

test('propagates initial sample-write failure and retries initialization on the next call', async () => {
  setItem.mockRejectedValueOnce(new Error('write unavailable'));

  await expect(getIncidents()).rejects.toThrow('write unavailable');
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(await getIncidents()).toHaveLength(2);
});

test('keeps persisted incidents after mutation-write failure and recovers the queue', async () => {
  const original = existing('real-id', 123);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([original]));
  setItem.mockRejectedValueOnce(new Error('write unavailable'));

  await expect(updateIncident(original.id, { status: 'RESOLVED' })).rejects.toThrow('write unavailable');
  expect(await getIncidents()).toEqual([original]);
  await expect(updateIncident(original.id, { status: 'RESOLVED' })).resolves.toMatchObject({ status: 'RESOLVED' });
});

test.each([
  ['create', () => addIncident(newAlert)],
  ['update', () => updateIncident('real-id', { status: 'RESOLVED' })],
  ['delete', () => deleteIncident('real-id')],
] as const)('preserves saved data after a failed %s write and allows retry', async (_name, mutate) => {
  const original = existing('real-id', 123);
  const saved = JSON.stringify([original]);
  await AsyncStorage.setItem(STORAGE_KEY, saved);
  setItem.mockRejectedValueOnce(new Error('device storage full'));

  await expect(mutate()).rejects.toThrow('Could not save incidents on this device. device storage full');
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(saved);
  await mutate();
  expect(setItem).toHaveBeenCalledTimes(3);
});

test.each([
  ['read', () => getIncidents()],
  ['create', () => addIncident(newAlert)],
  ['update', () => updateIncident('real-id', { status: 'RESOLVED' })],
  ['delete', () => deleteIncident('real-id')],
] as const)('reports a storage read failure during %s without writing data', async (_name, operation) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([existing('real-id', 123)]));
  setItem.mockClear();
  getItem.mockRejectedValueOnce(new Error('device storage inaccessible'));

  await expect(operation()).rejects.toThrow('Could not read saved incidents on this device. device storage inaccessible');
  expect(setItem).not.toHaveBeenCalled();
  expect(await getIncidents()).toEqual([existing('real-id', 123)]);
});
