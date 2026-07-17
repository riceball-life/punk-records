import type { SectionModule } from '../../lib/sections/types';
import TodoSection from './TodoSection.svelte';

/** To-do = checkbox-only tasks that auto-archive into Archives on completion. */
export const todo: SectionModule = {
  id: 'todo',
  label: 'To-do',
  accent: '#2fa7b5',
  enabled: true,
  component: TodoSection,
};
