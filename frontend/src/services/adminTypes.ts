import catalogue from '../data/ticketJourneys.json';
import { routes } from '../data/buses';
import type { Journey } from './ticketService';

export interface ManagedJourney extends Journey {
  active: boolean; routeNumber: string; serviceType: 'Normal' | 'Express';
  departureLabel: string; arrivalLabel: string;
}
export interface SupportReport {
  id: string; userId: string; title: string; message: string;
  status: 'Open' | 'In progress' | 'Resolved'; response: string;
  createdAt: string; updatedAt: string; handledBy?: string;
}
export interface Activity {
  id: string; actorId: string; actorName: string; action: string; target: string; at: string;
}
export interface Administration {
  journeys: ManagedJourney[]; reports: SupportReport[]; activities: Activity[];
}
export const defaultJourneys: ManagedJourney[] = [
  ...catalogue.map(j => ({ ...j, id: j.code, mode: j.mode as Journey['mode'], active: true,
    routeNumber: j.code === 'DEMO-B-KDY' ? '154' : j.code === 'DEMO-B-MHG' ? '138' : j.code,
    serviceType: 'Normal' as const, departureLabel: 'See departures', arrivalLabel: 'See validity',
    ticketTypes: j.ticketTypes.map(t => ({ ...t, label: 'Standard - Single journey' })) })),
  ...routes.map(r => ({ id: r.id, code: `DEMO-${r.id}`, mode: 'Bus' as const, from: r.from, to: r.to,
    durationMinutes: 180, validityMinutes: 300, active: true, routeNumber: r.routeNumber,
    serviceType: r.type as 'Normal' | 'Express', departureLabel: r.departure, arrivalLabel: r.arrival,
    ticketTypes: [{ code: 'standard', label: `${r.type} - Single journey`, fareMinor: r.fare * 100 }] })),
];
const obj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
const text = (v: any) => typeof v === 'string' && v.trim().length > 0;
const date = (v: any) => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function validJourney(j: any): j is ManagedJourney {
  return obj(j) && text(j.id) && text(j.code) && ['Bus', 'Train'].includes(j.mode)
    && text(j.from) && text(j.to) && j.from.trim().toLowerCase() !== j.to.trim().toLowerCase()
    && ['durationMinutes', 'validityMinutes'].every(k => Number.isInteger(j[k]) && j[k] > 0 && j[k] <= 10080)
    && typeof j.active === 'boolean' && text(j.routeNumber) && ['Normal', 'Express'].includes(j.serviceType)
    && text(j.departureLabel) && text(j.arrivalLabel) && Array.isArray(j.ticketTypes) && j.ticketTypes.length > 0
    && j.ticketTypes.every((t: any) => obj(t) && text(t.code) && text(t.label) && Number.isSafeInteger(t.fareMinor) && t.fareMinor > 0 && t.fareMinor <= 100000000)
    && new Set(j.ticketTypes.map((t: any) => t.code)).size === j.ticketTypes.length;
}
export function validActivities(value: any): value is Activity[] {
  return Array.isArray(value) && value.every((r: any) => obj(r) && text(r.id) && text(r.actorId)
    && text(r.actorName) && text(r.action) && text(r.target) && date(r.at))
    && new Set(value.map((r: any) => r.id)).size === value.length;
}
export function validAdministration(a: any): a is Administration {
  return obj(a) && Array.isArray(a.journeys) && a.journeys.every(validJourney)
    && new Set(a.journeys.map((j: any) => j.id)).size === a.journeys.length
    && new Set(a.journeys.map((j: any) => j.code)).size === a.journeys.length
    && Array.isArray(a.reports) && a.reports.every((r: any) => obj(r) && text(r.id) && text(r.userId)
      && text(r.title) && text(r.message) && ['Open', 'In progress', 'Resolved'].includes(r.status)
      && typeof r.response === 'string' && date(r.createdAt) && date(r.updatedAt)
      && (r.handledBy === undefined || text(r.handledBy)))
    && new Set(a.reports.map((r: any) => r.id)).size === a.reports.length
    && validActivities(a.activities);
}
