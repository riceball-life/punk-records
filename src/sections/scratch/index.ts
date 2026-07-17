import type { SectionModule } from '../../lib/sections/types';
import ScratchSection from './ScratchSection.svelte';

/** Scratch = freeform iOS-Notes-style notes (list + per-note editor). */
export const scratch: SectionModule = {
  id: 'scratch',
  label: 'Scratch',
  accent: '#7c6cf0',
  enabled: true,
  component: ScratchSection,
};
