import type { CollectionRecord } from '../sync/collection';

/**
 * A Tracker benchmark — a named personal record with a free-form string value
 * and an optional unit (e.g. name "Bench Press", value "205", unit "lbs";
 * or name "Mile", value "7:30", unit ""). No hardcoded metric types.
 *
 * Only the *current* value is stored — history lives in Archives via the
 * milestones you choose to log. Room to add `category?`/`order?` later for
 * grouping without touching the sync layer.
 */
export interface Benchmark extends CollectionRecord {
  id: string;
  name: string;
  value: string;
  unit: string;
  /** Free-form grouping label; '' (or missing on old records) = uncategorized. */
  category: string;
  createdAt: string;
  updatedAt: string;
}

export function newBenchmark(): Benchmark {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    value: '',
    unit: '',
    category: '',
    createdAt: now,
    updatedAt: now,
  };
}

/** A benchmark's category, normalized (tolerant of records saved before categories). */
export function benchmarkCategory(b: Benchmark): string {
  return (b.category ?? '').trim();
}

/** Distinct non-empty category names in use, sorted — for the editor's suggestions. */
export function distinctCategories(list: Benchmark[]): string[] {
  const set = new Set<string>();
  for (const b of list) {
    const c = benchmarkCategory(b);
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export interface BenchmarkGroup {
  category: string;
  label: string;
  items: Benchmark[];
}

/**
 * Group benchmarks by category for the Tracker list: named categories A–Z first,
 * then uncategorized (labeled "Other") last. Items within a group keep add-order.
 */
export function groupByCategory(list: Benchmark[]): BenchmarkGroup[] {
  const map = new Map<string, Benchmark[]>();
  for (const b of list) {
    const cat = benchmarkCategory(b);
    const bucket = map.get(cat);
    if (bucket) bucket.push(b);
    else map.set(cat, [b]);
  }
  const groups: BenchmarkGroup[] = [...map.entries()].map(([category, items]) => ({
    category,
    label: category || 'Other',
    items: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }));
  groups.sort((a, b) => {
    if (a.category === b.category) return 0;
    if (a.category === '') return 1; // uncategorized last
    if (b.category === '') return -1;
    return a.category.localeCompare(b.category);
  });
  return groups;
}

/** "205 lbs" (or just "7:30" when there's no unit). */
export function formatValue(value: string, unit: string): string {
  const v = value.trim();
  const u = unit.trim();
  return u ? `${v} ${u}` : v;
}

/**
 * Default (editable) milestone text when a benchmark's value changes. Uses the
 * user's "up from" phrasing; because values are free-form (a faster mile time
 * isn't literally "up"), the log prompt lets them reword it.
 */
export function defaultMilestoneText(b: Benchmark, oldValue: string): string {
  return `New PR: ${b.name.trim()} ${formatValue(b.value, b.unit)}, up from ${formatValue(oldValue, b.unit)}`;
}
