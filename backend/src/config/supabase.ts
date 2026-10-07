import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncidentAlert } from '../../../shared/incident.js';

export type IncidentRow = {
  id: string;
  bus_id: string;
  route: string;
  delay_time: string;
  status: IncidentAlert['status'];
  created_at: string;
};

export interface IncidentDatabase {
  public: {
    Tables: {
      incident_alerts: {
        Row: IncidentRow;
        Insert: Pick<IncidentRow, 'bus_id' | 'route' | 'delay_time' | 'status'> &
          Partial<Pick<IncidentRow, 'id' | 'created_at'>>;
        Update: Partial<Pick<IncidentRow, 'bus_id' | 'route' | 'delay_time' | 'status'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type IncidentSupabaseClient = SupabaseClient<IncidentDatabase>;

export function createSupabaseClient(env: NodeJS.ProcessEnv = process.env): IncidentSupabaseClient {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Incident API requires SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in backend/.env.local. Apply backend/db/schema.sql first.',
    );
  }
  return createClient<IncidentDatabase>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
