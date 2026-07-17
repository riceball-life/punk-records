/**
 * Hand-rolled, dependency-free drag-to-reorder as a Svelte action.
 *
 * Applied to a list container; draggable rows carry `data-sortable-id` and a
 * grab affordance carries `data-sortable-handle`. Dragging is initiated only
 * from the handle, so the row's text stays selectable/clickable.
 *
 * Lists sharing a `group` let a row be dragged from one into another (used by
 * the To-do categories); a list in its own group is reorder-only.
 *
 * Visuals: the dragged row is hidden and a floating clone ("ghost") follows the
 * pointer, with a thin line marking the drop position. On release it calls
 * `onReorder(listId, orderedIds)` for the destination list (and, on a cross-list
 * move, for the source list too) — the caller persists the new order.
 */

export interface SortableParams {
  group: string;
  listId: string;
  onReorder: (listId: string, orderedIds: string[]) => void;
}

interface Instance {
  node: HTMLElement;
  group: string;
  listId: string;
  onReorder: (listId: string, orderedIds: string[]) => void;
}

const groups = new Map<string, Set<Instance>>();
const nodeToInst = new WeakMap<HTMLElement, Instance>();

function addToGroup(inst: Instance): void {
  let set = groups.get(inst.group);
  if (!set) groups.set(inst.group, (set = new Set()));
  set.add(inst);
}
function removeFromGroup(inst: Instance): void {
  groups.get(inst.group)?.delete(inst);
}

interface DragState {
  group: string;
  source: Instance;
  target: Instance;
  draggedId: string;
  original: HTMLElement;
  ghost: HTMLElement;
  indicator: HTMLElement;
  offsetY: number;
  index: number;
  pointerId: number;
}
let drag: DragState | null = null;

function rowsOf(inst: Instance, exclude: string): HTMLElement[] {
  return [...inst.node.querySelectorAll<HTMLElement>('[data-sortable-id]')].filter(
    (el) => el.dataset.sortableId !== exclude,
  );
}
function idsOf(inst: Instance, exclude: string): string[] {
  return rowsOf(inst, exclude).map((el) => el.dataset.sortableId!);
}

function findTarget(group: string, x: number, y: number): Instance | null {
  for (const inst of groups.get(group) ?? []) {
    const r = inst.node.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return inst;
  }
  return null;
}

function insertionIndex(inst: Instance, y: number, draggedId: string): number {
  const rows = rowsOf(inst, draggedId);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!.getBoundingClientRect();
    if (y < r.top + r.height / 2) return i;
  }
  return rows.length;
}

function positionIndicator(): void {
  if (!drag) return;
  const { target, index, draggedId, indicator } = drag;
  const cr = target.node.getBoundingClientRect();
  const rows = rowsOf(target, draggedId);
  let top: number;
  if (rows.length === 0) top = cr.top + 2;
  else if (index >= rows.length) top = rows[rows.length - 1]!.getBoundingClientRect().bottom;
  else top = rows[index]!.getBoundingClientRect().top;
  indicator.style.left = `${cr.left}px`;
  indicator.style.width = `${cr.width}px`;
  indicator.style.top = `${top - 1}px`;
}

function onMove(e: PointerEvent): void {
  if (!drag || e.pointerId !== drag.pointerId) return;
  e.preventDefault();
  drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
  drag.target = findTarget(drag.group, e.clientX, e.clientY) ?? drag.target;
  drag.index = insertionIndex(drag.target, e.clientY, drag.draggedId);
  positionIndicator();
}

function endDrag(commit: boolean): void {
  if (!drag) return;
  const d = drag;
  drag = null;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onCancel);
  d.ghost.remove();
  d.indicator.remove();
  d.original.style.display = '';
  document.body.style.userSelect = '';

  if (!commit) return;
  const ids = idsOf(d.target, d.draggedId);
  ids.splice(Math.min(d.index, ids.length), 0, d.draggedId);
  d.target.onReorder(d.target.listId, ids);
  if (d.target !== d.source) {
    d.source.onReorder(d.source.listId, idsOf(d.source, d.draggedId));
  }
}

function onUp(e: PointerEvent): void {
  if (drag && e.pointerId === drag.pointerId) endDrag(true);
}
function onCancel(e: PointerEvent): void {
  if (drag && e.pointerId === drag.pointerId) endDrag(false);
}

function onPointerDown(this: HTMLElement, e: PointerEvent): void {
  if (drag || e.button > 0) return;
  const handle = (e.target as Element).closest('[data-sortable-handle]');
  if (!handle || !this.contains(handle)) return;
  const original = handle.closest<HTMLElement>('[data-sortable-id]');
  const inst = nodeToInst.get(this);
  if (!original || !inst) return;
  e.preventDefault();

  const rect = original.getBoundingClientRect();
  const ghost = original.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    margin: '0',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: '9999',
    background: 'var(--bg)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
    opacity: '0.97',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);

  const indicator = document.createElement('div');
  Object.assign(indicator.style, {
    position: 'fixed',
    height: '2px',
    background: 'var(--today-tint)',
    borderRadius: '2px',
    zIndex: '9998',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(indicator);

  original.style.display = 'none';
  document.body.style.userSelect = 'none';

  drag = {
    group: inst.group,
    source: inst,
    target: inst,
    draggedId: original.dataset.sortableId!,
    original,
    ghost,
    indicator,
    offsetY: e.clientY - rect.top,
    index: 0,
    pointerId: e.pointerId,
  };
  drag.index = insertionIndex(inst, e.clientY, drag.draggedId);
  positionIndicator();

  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}

export function sortable(node: HTMLElement, params: SortableParams) {
  const inst: Instance = { node, ...params };
  addToGroup(inst);
  nodeToInst.set(node, inst);
  node.addEventListener('pointerdown', onPointerDown);
  return {
    update(p: SortableParams) {
      if (p.group !== inst.group) {
        removeFromGroup(inst);
        inst.group = p.group;
        addToGroup(inst);
      }
      inst.listId = p.listId;
      inst.onReorder = p.onReorder;
    },
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      removeFromGroup(inst);
      nodeToInst.delete(node);
      if (drag && (drag.source === inst || drag.target === inst)) endDrag(false);
    },
  };
}
