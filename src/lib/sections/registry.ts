import type { SectionId, SectionModule } from './types';
import { archives } from '../../sections/archives';
import { scratch } from '../../sections/scratch';
import { todo } from '../../sections/todo';
import { tracker } from '../../sections/tracker';

/**
 * The ordered list of brain-hub sections. This is the ONE place sections are
 * wired together: the hub draws a lobe per entry (in this order), and the shell
 * routes to a section's component. Adding a section (e.g. a future 'tracker') is
 * a one-line import + push here — no shell or hub edits.
 *
 * Order also assigns lobe slots on the brain (see BrainHub); today there are up
 * to four slots, matching Archives + Scratch + To-do (+ a reserved slot).
 */
export const sections: SectionModule[] = [archives, scratch, todo, tracker];

export function getSection(id: SectionId): SectionModule | undefined {
  return sections.find((s) => s.id === id);
}
