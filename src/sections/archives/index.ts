import type { SectionModule } from '../../lib/sections/types';
import ArchivesSection from './ArchivesSection.svelte';

/** Archives = the existing journal day-scroll + calendar, wrapped as a section. */
export const archives: SectionModule = {
  id: 'archives',
  label: 'Archives',
  accent: '#f5479a',
  enabled: true,
  component: ArchivesSection,
};
