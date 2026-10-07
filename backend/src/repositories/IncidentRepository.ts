import type {
  IncidentAlert,
  IncidentAlertUpdates,
  NewIncidentAlert,
} from '../../../shared/incident.js';
import type { IncidentRow, IncidentSupabaseClient } from '../config/supabase.js';

export interface IncidentRepository {
  getAll(): Promise<IncidentAlert[]>;
  create(incident: NewIncidentAlert): Promise<IncidentAlert>;
  update(id: string, updates: IncidentAlertUpdates): Promise<IncidentAlert | null>;
  delete(id: string): Promise<boolean>;
}

function toIncident(row: IncidentRow): IncidentAlert {
  return {
    id: row.id,
    busId: row.bus_id,
    route: row.route,
    delayTime: row.delay_time,
    status: row.status,
    createdAt: Date.parse(row.created_at),
  };
}

function toColumns(incident: IncidentAlertUpdates) {
  return {
    ...(incident.busId === undefined ? {} : { bus_id: incident.busId }),
    ...(incident.route === undefined ? {} : { route: incident.route }),
    ...(incident.delayTime === undefined ? {} : { delay_time: incident.delayTime }),
    ...(incident.status === undefined ? {} : { status: incident.status }),
  };
}

export class SupabaseIncidentRepository implements IncidentRepository {
  constructor(private readonly client: IncidentSupabaseClient) {}

  async getAll(): Promise<IncidentAlert[]> {
    // Supabase caps each response, so a single select is not necessarily all rows.
    const pageSize = 1000;
    const incidents: IncidentAlert[] = [];
    let offset = 0;
    for (;;) {
      const { data, error, count } = await this.client
        .from('incident_alerts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error('Supabase incident read failed', { cause: error });
      const rows = data ?? [];
      if (rows.length === 0) {
        if (count !== null && offset < count) {
          throw new Error('Supabase incident read failed: incomplete page.');
        }
        return incidents;
      }
      incidents.push(...rows.map(toIncident));
      // A project may impose a smaller cap than the requested page size.
      offset += rows.length;
      if (count !== null ? offset >= count : rows.length < pageSize) return incidents;
    }
  }

  async create(incident: NewIncidentAlert): Promise<IncidentAlert> {
    const { data, error } = await this.client
      .from('incident_alerts')
      .insert({
        bus_id: incident.busId,
        route: incident.route,
        delay_time: incident.delayTime,
        status: incident.status,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error('Supabase incident create failed', { cause: error });
    return toIncident(data);
  }

  async update(id: string, updates: IncidentAlertUpdates): Promise<IncidentAlert | null> {
    const { data, error } = await this.client
      .from('incident_alerts')
      .update(toColumns(updates))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error('Supabase incident update failed', { cause: error });
    return data ? toIncident(data) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('incident_alerts')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw new Error('Supabase incident delete failed', { cause: error });
    return Boolean(data?.length);
  }
}
