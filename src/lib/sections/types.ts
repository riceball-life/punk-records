import type { Component } from 'svelte';

/** Every brain-hub section has a stable id. Add new ones here (e.g. 'tracker'). */
export type SectionId = 'archives' | 'scratch' | 'todo' | 'tracker';

/**
 * A self-contained section module. Registering one of these in
 * `registry.ts` is all it takes to add a section: the hub draws its lobe, and
 * the shell routes to its `component`. No other files change — this is the
 * extensibility seam.
 */
export interface SectionModule {
  id: SectionId;
  /** Shown on the hub lobe and in the section header. */
  label: string;
  /** The section's identity color — tints its lobe on the brain. */
  accent: string;
  /**
   * When false, the lobe renders dimmed and non-navigable ("soon"). Lets us
   * ship the hub frame before every section's insides exist.
   */
  enabled: boolean;
  /** Rendered full-screen when this section is active. Self-contained (no props). */
  component: Component;
}
