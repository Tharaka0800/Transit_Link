import type { RequestHandler } from 'express';
import type {
  IncidentAlertUpdates,
  IncidentUpdatedEvent,
  NewIncidentAlert,
} from '../../../shared/incident.js';
import type { IncidentRepository } from '../repositories/IncidentRepository.js';

export type EmitIncidentUpdated = (event: IncidentUpdatedEvent) => void;
const fields = ['busId', 'route', 'delayTime', 'status'] as const;
const statuses = ['URGENT', 'WARNING', 'RESOLVED'];
const uuidPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

function parseIncident(body: unknown, partial: boolean): IncidentAlertUpdates {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Incident must be a JSON object.');
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((field) => !fields.includes(field as (typeof fields)[number]))) {
    throw new Error('Only busId, route, delayTime, and status can be changed.');
  }
  if (partial && Object.keys(input).length === 0) {
    throw new Error('Provide at least one field to update.');
  }
  const result: Record<string, string> = {};
  for (const field of fields) {
    if (partial && !Object.hasOwn(input, field)) continue;
    const value = input[field];
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${field} must be a non-empty string.`);
    }
    result[field] = value.trim();
  }
  if (result.status && !statuses.includes(result.status)) {
    throw new Error('Status must be URGENT, WARNING, or RESOLVED.');
  }
  return result as IncidentAlertUpdates;
}

export function createIncidentController(repository: IncidentRepository, emit: EmitIncidentUpdated) {
  const getIncidents: RequestHandler = async (_req, res) => {
    try {
      res.json(await repository.getAll());
    } catch {
      res.status(500).json({ message: 'Unable to load incidents. Please try again.' });
    }
  };

  const addIncident: RequestHandler = async (req, res) => {
    let input: NewIncidentAlert;
    try {
      input = parseIncident(req.body, false) as NewIncidentAlert;
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
      return;
    }
    try {
      const incident = await repository.create(input);
      emit({ action: 'created', id: incident.id });
      res.status(201).json(incident);
    } catch {
      res.status(500).json({ message: 'Unable to create incident. Please try again.' });
    }
  };

  const updateIncident: RequestHandler = async (req, res) => {
    const id = req.params.id;
    if (!uuidPattern.test(id)) {
      res.status(400).json({ message: 'Incident ID must be a UUID.' });
      return;
    }
    let updates: IncidentAlertUpdates;
    try {
      updates = parseIncident(req.body, true);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
      return;
    }
    try {
      const incident = await repository.update(id, updates);
      if (!incident) {
        res.status(404).json({ message: 'Incident not found.' });
        return;
      }
      emit({ action: 'updated', id: incident.id });
      res.json(incident);
    } catch {
      res.status(500).json({ message: 'Unable to update incident. Please try again.' });
    }
  };

  const deleteIncident: RequestHandler = async (req, res) => {
    const id = req.params.id;
    if (!uuidPattern.test(id)) {
      res.status(400).json({ message: 'Incident ID must be a UUID.' });
      return;
    }
    try {
      const deleted = await repository.delete(id);
      if (deleted) emit({ action: 'deleted', id });
      res.status(204).end();
    } catch {
      res.status(500).json({ message: 'Unable to resolve incident. Please try again.' });
    }
  };

  return { getIncidents, addIncident, updateIncident, deleteIncident };
}
