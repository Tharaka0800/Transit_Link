import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import {
  INCIDENT_STATUSES,
  IncidentAlert,
  IncidentAlertUpdates,
  IncidentServerToClientEvents,
  NewIncidentAlert,
} from '../../../shared/incident';
import api, { getToken } from '../services/api';
import { BACKEND_URL } from '../services/backendConfig';

export type { IncidentAlert, IncidentAlertUpdates, NewIncidentAlert } from '../../../shared/incident';
export { INCIDENT_UPDATED_EVENT } from '../../../shared/incident';

// Connections start only while the dashboard is mounted. Read the latest token
// on every connection so reconnects do not reuse expired sign-in credentials.
export const socket: Socket<IncidentServerToClientEvents> = io(BACKEND_URL, {
  autoConnect: false,
  auth: (callback) => {
    void getToken().then(
      (token) => callback({ token }),
      () => callback({ token: null }),
    );
  },
});

function isIncident(value: unknown): value is IncidentAlert {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const incident = value as Record<string, unknown>;
  return ['id', 'busId', 'route', 'delayTime'].every((key) => {
    const field = incident[key];
    return typeof field === 'string' && field.trim().length > 0;
  })
    && INCIDENT_STATUSES.some((status) => status === incident.status)
    && typeof incident.createdAt === 'number'
    && Number.isFinite(incident.createdAt)
    && incident.createdAt >= 0;
}

function incidentResponse(value: unknown): IncidentAlert {
  if (!isIncident(value)) throw new Error('The server returned invalid alert data. Please try again.');
  return value;
}

async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message: unknown = error.response?.data?.message;
      if (typeof message === 'string' && message.trim()) throw new Error(message);
      if (!error.response) throw new Error('Unable to reach the server. Check your connection and try again.');
      throw new Error('Unable to complete this request. Please try again.');
    }
    throw error instanceof Error ? error : new Error('Unable to complete this request. Please try again.');
  }
}

function incidentPath(id: string): string {
  if (!id.trim()) throw new Error('An incident ID is required.');
  return `/incidents/${encodeURIComponent(id)}`;
}

export function getIncidents(): Promise<IncidentAlert[]> {
  return request(async () => {
    const { data } = await api.get<unknown>('/incidents');
    if (!Array.isArray(data) || !data.every(isIncident)) {
      throw new Error('The server returned invalid alert data. Please try again.');
    }
    return data;
  });
}

export function addIncident(incident: NewIncidentAlert): Promise<IncidentAlert> {
  return request(async () => {
    const { data } = await api.post<unknown>('/incidents', incident);
    return incidentResponse(data);
  });
}

export function updateIncident(id: string, updates: IncidentAlertUpdates): Promise<IncidentAlert> {
  return request(async () => {
    const { data } = await api.put<unknown>(incidentPath(id), updates);
    return incidentResponse(data);
  });
}

export function deleteIncident(id: string): Promise<void> {
  return request(async () => {
    await api.delete(incidentPath(id));
  });
}
