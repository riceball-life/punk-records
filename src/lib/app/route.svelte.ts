import type { SectionId } from '../sections/types';

/**
 * Top-level navigation state for the brain hub. The app is either on the hub
 * (the brain dashboard) or inside one section. Kept deliberately tiny — no
 * router library; the persistent brain button returns to the hub from anywhere.
 */
export type Route = { screen: 'hub' } | { screen: 'section'; id: SectionId };

export const nav = $state<{ route: Route }>({ route: { screen: 'hub' } });

export function goHub(): void {
  nav.route = { screen: 'hub' };
}

export function goSection(id: SectionId): void {
  nav.route = { screen: 'section', id };
}

/**
 * Which sub-view the Archives section shows. Shared (not local to Archives) so a
 * global calendar button can jump straight to the calendar from any page.
 */
export const archivesView = $state<{ mode: 'days' | 'calendar' }>({ mode: 'days' });

/** Open the calendar from anywhere: switch Archives to calendar and navigate in. */
export function openCalendar(): void {
  archivesView.mode = 'calendar';
  goSection('archives');
}

/** True when the Archives calendar is currently on screen. */
export function calendarShowing(): boolean {
  return (
    nav.route.screen === 'section' &&
    nav.route.id === 'archives' &&
    archivesView.mode === 'calendar'
  );
}

/** Header calendar button: open the calendar from anywhere, or (on the calendar) go back to the list. */
export function toggleCalendar(): void {
  if (calendarShowing()) archivesView.mode = 'days';
  else openCalendar();
}
