// Public incident contract shared by the Express API and Expo client.
export const INCIDENT_STATUSES = ['URGENT', 'WARNING', 'RESOLVED'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface IncidentAlert {
  id: string;
  busId: string;
  route: string;
  delayTime: string;
  status: IncidentStatus;
  /** Unix timestamp in milliseconds; PostgreSQL timestamps are mapped by the API. */
  createdAt: number;
}

export type NewIncidentAlert = Omit<IncidentAlert, 'id' | 'createdAt'>;
export type IncidentAlertUpdates = Partial<NewIncidentAlert>;

export const INCIDENT_UPDATED_EVENT = 'incident_updated' as const;

export interface IncidentUpdatedEvent {
  action: 'created' | 'updated' | 'deleted';
  id: string;
}

export interface IncidentServerToClientEvents {
  incident_updated: (event: IncidentUpdatedEvent) => void;
}
