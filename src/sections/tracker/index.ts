import type { SectionModule } from '../../lib/sections/types';
import TrackerSection from './TrackerSection.svelte';

/** Tracker = personal-records / benchmark tracker; milestones log into Archives. */
export const tracker: SectionModule = {
  id: 'tracker',
  label: 'Tracker',
  accent: '#e08a2b',
  enabled: true,
  component: TrackerSection,
};
