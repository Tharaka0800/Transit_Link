import type { Ticket, TicketStatus } from '../services/ticketService';
export const formatFare = (minor: number) =>
  `LKR ${(minor / 100).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatTicketDate = (value: string) =>
  new Date(value).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export const formatTicketTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
  });
export const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60 ? `${minutes % 60}m` : ''}`.trim();
export function currentTicketStatus(
  ticket: Pick<Ticket, 'status' | 'validFrom' | 'validUntil'>,
  now = Date.now()
): TicketStatus {
  if (ticket.status === 'Used') return 'Used';
  if (new Date(ticket.validUntil).getTime() <= now) return 'Expired';
  if (new Date(ticket.validFrom).getTime() > now) return 'Upcoming';
  return 'Active';
}
export function parseDeparture(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(year, month - 1, day, hours, minutes);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    hours > 23 ||
    minutes > 59
  )
    return null;
  return result;
}
export function defaultDeparture() {
  const value = new Date(Date.now() + 15 * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}
