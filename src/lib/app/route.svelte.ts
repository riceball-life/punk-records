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
