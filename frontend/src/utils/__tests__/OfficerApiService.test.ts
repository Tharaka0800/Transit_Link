import { AxiosResponse } from 'axios';
import api, { getToken } from '../../services/api';
import {
  addIncident,
  deleteIncident,
  getIncidents,
  IncidentAlert,
  socket,
  updateIncident,
} from '../OfficerApiService';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  getToken: jest.fn(),
}));
jest.mock('../../services/backendConfig', () => ({ BACKEND_URL: 'http://test-server:5000' }));
jest.mock('socket.io-client', () => {
  const configuration: { url?: string; options?: unknown } = {};
  return {
    io: jest.fn((url, options) => {
      configuration.url = url;
      configuration.options = options;
      return { connect: jest.fn(), disconnect: jest.fn() };
    }),
    getConfiguration: () => configuration,
  };
});

const mockGet = jest.mocked(api.get);
const mockPost = jest.mocked(api.post);
const mockPut = jest.mocked(api.put);
const mockDelete = jest.mocked(api.delete);
const incident: IncidentAlert = {
  id: 'a38082d2-27c0-4276-9bd7-7a782e7d142d',
  busId: '154',
  route: 'CMB to KDY',
  delayTime: '15m',
  status: 'URGENT',
  createdAt: 1720000000000,
};
const fields = { busId: incident.busId, route: incident.route, delayTime: incident.delayTime, status: incident.status };
const response = (data: unknown) => ({ data } as AxiosResponse);
const socketConfiguration = jest.requireMock('socket.io-client').getConfiguration() as {
  url: string;
  options: { autoConnect: boolean; auth: (callback: (credentials: { token: string | null }) => void) => void };
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
  jest.mocked(getToken).mockReset();
});

test('reads typed incidents through the shared authenticated API client', async () => {
  mockGet.mockResolvedValue(response([incident]));
  await expect(getIncidents()).resolves.toEqual([incident]);
  expect(mockGet).toHaveBeenCalledWith('/incidents');
});

test('keeps an empty server list empty without creating sample incidents', async () => {
  mockGet.mockResolvedValue(response([]));
  await expect(getIncidents()).resolves.toEqual([]);
  expect(mockPost).not.toHaveBeenCalled();
});

test('POSTs creation fields and returns server-generated metadata', async () => {
  mockPost.mockResolvedValue(response(incident));
  await expect(addIncident(fields)).resolves.toEqual(incident);
  expect(mockPost).toHaveBeenCalledWith('/incidents', fields);
});

test('PUTs partial updates and returns the full updated record', async () => {
  const updated = { ...incident, delayTime: '20m' };
  mockPut.mockResolvedValue(response(updated));
  await expect(updateIncident(incident.id, { delayTime: '20m' })).resolves.toEqual(updated);
  expect(mockPut).toHaveBeenCalledWith(`/incidents/${incident.id}`, { delayTime: '20m' });
});

test('DELETEs without expecting a response body', async () => {
  mockDelete.mockResolvedValue(response(undefined));
  await expect(deleteIncident(incident.id)).resolves.toBeUndefined();
  expect(mockDelete).toHaveBeenCalledWith(`/incidents/${incident.id}`);
});

test('encodes incident IDs and rejects empty IDs before making a request', async () => {
  mockDelete.mockResolvedValue(response(undefined));
  await deleteIncident('id/with spaces');
  expect(mockDelete).toHaveBeenCalledWith('/incidents/id%2Fwith%20spaces');
  mockDelete.mockClear();
  await expect(deleteIncident(' ')).rejects.toThrow('An incident ID is required.');
  await expect(updateIncident('', {})).rejects.toThrow('An incident ID is required.');
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockPut).not.toHaveBeenCalled();
});

test('surfaces backend validation and authentication messages', async () => {
  mockPost.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { message: 'Bus ID is required.' } } });
  await expect(addIncident(fields)).rejects.toThrow('Bus ID is required.');
  mockGet.mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { message: 'Not authorized.' } } });
  await expect(getIncidents()).rejects.toThrow('Not authorized.');
});

test('uses a connection message for unreachable servers', async () => {
  mockGet.mockRejectedValue({ isAxiosError: true, message: 'Network Error' });
  await expect(getIncidents()).rejects.toThrow('Unable to reach the server. Check your connection and try again.');
});

test('uses a retry message when an HTTP failure has no safe server message', async () => {
  mockGet.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: '<html>Server error</html>' } });
  await expect(getIncidents()).rejects.toThrow('Unable to complete this request. Please try again.');
});

test.each([
  { incidents: [{ ...incident, status: 'UNKNOWN' }] },
  { incidents: [{ ...incident, createdAt: '2026-10-07T00:00:00Z' }] },
  { incidents: { incidents: [incident] } },
])('rejects malformed response data instead of rendering invalid incidents: %p', async ({ incidents }) => {
  mockGet.mockResolvedValue(response(incidents));
  await expect(getIncidents()).rejects.toThrow('The server returned invalid alert data. Please try again.');
});

test('the configured socket does not connect merely by importing the service', () => {
  expect(socketConfiguration.url).toBe('http://test-server:5000');
  expect(socketConfiguration.options.autoConnect).toBe(false);
  expect(socket.connect).not.toHaveBeenCalled();
});

test('socket authentication reads the current token on each connection', async () => {
  const callback = jest.fn();
  jest.mocked(getToken).mockResolvedValueOnce('first-token').mockResolvedValueOnce('new-token');
  socketConfiguration.options.auth(callback);
  await Promise.resolve();
  socketConfiguration.options.auth(callback);
  await Promise.resolve();
  expect(callback.mock.calls).toEqual([[{ token: 'first-token' }], [{ token: 'new-token' }]]);
});

test('socket authentication failure still completes the callback without an unhandled rejection', async () => {
  const callback = jest.fn();
  jest.mocked(getToken).mockRejectedValueOnce(new Error('Token storage is unavailable.'));
  socketConfiguration.options.auth(callback);
  await Promise.resolve();
  expect(callback).toHaveBeenCalledWith({ token: null });
});
