<script module lang="ts">
  export type BrainZoneId = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';

  export interface BrainZone {
    id: BrainZoneId;
    label: string;
    description?: string;
    disabled?: boolean;
    badge?: string | number;
  }

  export interface BrainSelectEvent {
    id: BrainZoneId;
    zone: BrainZone;
  }
  export interface BrainHoverEvent {
    id: BrainZoneId | null;
    zone: BrainZone | null;
  }

  // Per-instance id source so multiple widgets on one page never share SVG ids.
  let uidCounter = 0;

  // Fixed hit-zone geometry (viewBox 0 0 1000 700), from the source artwork.
  const GEOM: Record<BrainZoneId, { x: number; y: number; w: number; h: number; stem?: boolean }> = {
    'upper-left': { x: 80, y: 50, w: 420, h: 300 },
    'upper-right': { x: 500, y: 50, w: 410, h: 300 },
    'lower-left': { x: 80, y: 350, w: 420, h: 280 },
    'lower-right': { x: 500, y: 350, w: 410, h: 280, stem: true },
  };

  // Straight-line mesh geometry (defined once; reused per quarter via <use>).
  const SILHOUETTE =
    '130,270 158,205 212,155 278,130 348,92 420,104 492,72 560,94 630,86 700,122 770,148 812,205 860,250 846,320 875,380 838,438 830,500 760,526 706,570 632,556 565,585 500,550 430,578 366,542 292,546 245,494 184,468 170,404 122,358';

  const CELLS = [
    '130,270 212,155 278,130 270,235 190,315',
    '278,130 348,92 420,104 390,205 270,235',
    '420,104 492,72 560,94 520,188 390,205',
    '560,94 630,86 700,122 670,210 520,188',
    '700,122 770,148 812,205 750,258 670,210',
    '812,205 860,250 846,320 760,335 750,258',
    '130,270 190,315 170,404 122,358',
    '190,315 270,235 340,300 292,385 170,404',
    '270,235 390,205 430,296 340,300',
    '390,205 520,188 525,294 430,296',
    '520,188 670,210 640,300 525,294',
    '670,210 750,258 760,335 640,300',
    '170,404 292,385 315,475 245,494 184,468',
    '292,385 340,300 430,380 405,478 315,475',
    '340,300 430,296 505,365 430,380',
    '430,296 525,294 585,372 505,365',
    '525,294 640,300 672,398 585,372',
    '640,300 760,335 748,430 672,398',
    '245,494 315,475 366,542 292,546',
    '315,475 405,478 430,578 366,542',
    '405,478 505,365 500,550 430,578',
    '505,365 585,372 565,585 500,550',
    '585,372 672,398 632,556 565,585',
    '672,398 748,430 706,570 632,556',
    '748,430 838,438 830,500 760,526 706,570',
    '760,335 846,320 875,380 838,438 748,430',
  ];

  const HEAVY = [
    '122,358 270,235 420,104 585,372 760,526',
    '158,205 340,300 492,72 672,398 830,500',
    '212,155 430,296 630,86 748,430 565,585',
    '130,270 292,385 520,188 760,335 632,556',
    '184,468 390,205 585,372 846,320',
    '245,494 430,380 700,122 838,438',
    '278,130 505,365 770,148',
    '170,404 430,296 670,210 875,380',
  ];

  const FINE: [number, number, number, number][] = [
    [155, 247, 260, 170], [166, 266, 279, 185], [178, 286, 291, 203], [192, 303, 306, 222],
    [300, 128, 390, 190], [320, 115, 402, 170], [342, 104, 414, 151], [366, 100, 428, 140],
    [445, 108, 520, 180], [465, 95, 538, 164], [488, 84, 555, 148], [516, 82, 572, 134],
    [585, 106, 666, 198], [606, 98, 680, 181], [628, 97, 696, 170], [651, 104, 711, 166],
    [713, 145, 791, 232], [730, 151, 806, 237], [746, 160, 820, 244], [760, 174, 831, 255],
    [202, 341, 287, 379], [198, 359, 292, 400], [194, 378, 297, 421], [192, 397, 303, 441],
    [314, 326, 409, 373], [308, 345, 410, 394], [303, 365, 410, 416], [300, 385, 407, 437],
    [441, 317, 506, 356], [433, 337, 506, 381], [428, 359, 504, 404], [423, 382, 502, 428],
    [548, 314, 650, 360], [544, 334, 656, 383], [540, 354, 662, 406], [537, 374, 666, 429],
    [687, 329, 757, 359], [684, 351, 756, 382], [681, 374, 753, 405], [678, 397, 749, 428],
    [281, 469, 352, 533], [302, 468, 369, 530], [325, 468, 389, 526],
    [434, 458, 492, 539], [455, 438, 510, 548], [476, 417, 528, 560],
    [590, 414, 574, 566], [612, 421, 594, 560], [635, 430, 614, 552],
    [698, 430, 690, 556], [720, 433, 712, 544], [742, 437, 735, 531],
  ];

  const NODES: [number, number, number][] = [
    [270, 235, 4], [390, 205, 4], [520, 188, 4], [670, 210, 4], [750, 258, 4],
    [340, 300, 4], [430, 296, 4], [525, 294, 4], [640, 300, 4],
    [292, 385, 4], [430, 380, 4], [505, 365, 5], [585, 372, 4], [672, 398, 4],
    [315, 475, 4], [405, 478, 4], [500, 550, 4], [565, 585, 4], [632, 556, 4], [706, 570, 4],
  ];

  const STEM = {
    poly: '720,520 760,526 780,550 775,580 752,600 738,576 744,548',
    heavy: ['720,520 750,548 780,550', '744,548 775,580 752,600'],
    fine: [
      [741, 536, 766, 579],
      [752, 532, 774, 562],
    ] as [number, number, number, number][],
    nodes: [
      [750, 548, 3.5],
      [775, 580, 3.5],
    ] as [number, number, number][],
  };

  /** A node as a straight-edged diamond (no curves). */
  function diamond(cx: number, cy: number, r: number): string {
    return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
  }
</script>

<script lang="ts">
  const uid = `brainhub-${uidCounter++}`;

  let {
    zones,
    selectedZone = $bindable(null),
    ariaLabel = 'Interactive brain navigation hub',
    placeholder = 'Choose a brain region.',
    onselect,
    onhover,
  }: {
    zones: BrainZone[];
    selectedZone?: BrainZoneId | null;
    ariaLabel?: string;
    placeholder?: string;
    onselect?: (e: BrainSelectEvent) => void;
    onhover?: (e: BrainHoverEvent) => void;
  } = $props();

  let hovered = $state<BrainZoneId | null>(null);

  const lowerRight = $derived(zones.find((z) => z.id === 'lower-right'));

  // The zone whose label the panel shows: hovered wins, else the locked selection.
  const activeZone = $derived.by(() => {
    const id = hovered ?? selectedZone;
    return id ? (zones.find((z) => z.id === id) ?? null) : null;
  });

  type Intensity = 'strong' | 'weak' | 'off';
  function intensity(id: BrainZoneId): Intensity {
    if (hovered === id) return 'strong';
    if (selectedZone === id) return hovered ? 'weak' : 'strong';
    return 'off';
  }

  function enter(zone: BrainZone): void {
    if (zone.disabled) return;
    hovered = zone.id;
    onhover?.({ id: zone.id, zone });
  }
  function leave(zone: BrainZone): void {
    if (hovered !== zone.id) return;
    hovered = null;
    onhover?.({ id: null, zone: null });
  }
  function activate(zone: BrainZone): void {
    if (zone.disabled) return;
    selectedZone = selectedZone === zone.id ? null : zone.id;
    onselect?.({ id: zone.id, zone });
  }
  function onKeydown(e: KeyboardEvent, zone: BrainZone): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(zone);
    }
  }
</script>

<div class="brain-stage" role="group" aria-label={ariaLabel}>
  <svg class="brain" viewBox="0 0 1000 700" aria-labelledby="{uid}-title {uid}-desc">
    <title id="{uid}-title">Interactive geometric brain with four navigation zones</title>
    <desc id="{uid}-desc">
      A polygonal brain built only from straight lines, rotated clockwise, divided into four
      interactive quarters with a dense internal mesh of lines, polygons, and nodes.
    </desc>

    <defs>
      <filter id="{uid}-quarterGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <clipPath id="{uid}-brainClip">
        <polygon points={SILHOUETTE} />
      </clipPath>

      {#each zones as zone (zone.id)}
        {@const g = GEOM[zone.id]}
        <clipPath id="{uid}-clip-{zone.id}">
          <rect x={g.x} y={g.y} width={g.w} height={g.h} />
        </clipPath>
      {/each}
    </defs>

    <g transform="rotate(30 500 340)">
      <!-- Outer angular silhouette -->
      <polygon class="outer" points={SILHOUETTE} />

      <!-- Base brain stem (dim) -->
      <g class="mesh" aria-hidden="true">
        <polygon class="outer" points={STEM.poly} />
        {#each STEM.heavy as pts}<polyline class="heavy" points={pts} />{/each}
        {#each STEM.fine as [x1, y1, x2, y2]}<line class="fine" {x1} {y1} {x2} {y2} />{/each}
        {#each STEM.nodes as [cx, cy, r]}<polygon class="node" points={diamond(cx, cy, r)} />{/each}
      </g>

      <!-- Base mesh (defined once, reused by each quarter highlight) -->
      <g id="{uid}-baseMesh" class="mesh" clip-path="url(#{uid}-brainClip)">
        {#each CELLS as pts}<polygon points={pts} />{/each}
        {#each HEAVY as pts}<polyline class="heavy" points={pts} />{/each}
        {#each FINE as [x1, y1, x2, y2]}<line class="fine" {x1} {y1} {x2} {y2} />{/each}
        {#each NODES as [cx, cy, r]}<polygon class="node" points={diamond(cx, cy, r)} />{/each}
      </g>

      <!-- Per-quarter glowing duplicates of the full mesh, clipped to the quarter -->
      {#each zones as zone (zone.id)}
        {@const level = intensity(zone.id)}
        <g
          class="quarter-highlight"
          class:strong={level === 'strong'}
          class:weak={level === 'weak'}
          clip-path="url(#{uid}-brainClip)"
          filter="url(#{uid}-quarterGlow)"
          aria-hidden="true"
        >
          <g clip-path="url(#{uid}-clip-{zone.id})">
            <use href="#{uid}-baseMesh" />
          </g>
        </g>
      {/each}

      <!-- Brain stem highlight follows the lower-right quarter -->
      {#if lowerRight}
        {@const level = intensity('lower-right')}
        <g
          class="quarter-highlight"
          class:strong={level === 'strong'}
          class:weak={level === 'weak'}
          filter="url(#{uid}-quarterGlow)"
          aria-hidden="true"
        >
          <polygon points={STEM.poly} />
          {#each STEM.heavy as pts}<polyline class="heavy" points={pts} />{/each}
          {#each STEM.fine as [x1, y1, x2, y2]}<line class="fine" {x1} {y1} {x2} {y2} />{/each}
        </g>
      {/if}

      <!-- Subtle quarter boundaries -->
      <g class="quarter-guide" clip-path="url(#{uid}-brainClip)" aria-hidden="true">
        <line x1="500" y1="60" x2="500" y2="620" />
        <line x1="90" y1="350" x2="900" y2="350" />
      </g>

      <!-- Transparent interactive hit zones (on top) -->
      <g clip-path="url(#{uid}-brainClip)">
        {#each zones as zone (zone.id)}
          {@const g = GEOM[zone.id]}
          <rect
            class="quarter-hit"
            class:disabled={zone.disabled}
            x={g.x}
            y={g.y}
            width={g.w}
            height={g.h}
            role="button"
            tabindex={zone.disabled ? -1 : 0}
            aria-label={zone.label}
            aria-pressed={selectedZone === zone.id}
            aria-disabled={zone.disabled ? 'true' : undefined}
            onpointerenter={() => enter(zone)}
            onpointerleave={() => leave(zone)}
            onfocus={() => enter(zone)}
            onblur={() => leave(zone)}
            onclick={() => activate(zone)}
            onkeydown={(e) => onKeydown(e, zone)}
          />
        {/each}
      </g>
    </g>
  </svg>

  <div class="label-panel" aria-live="polite">
    {#if activeZone}
      <span class="label-title">{activeZone.label}</span>
      {#if activeZone.badge != null}<span class="label-badge">{activeZone.badge}</span>{/if}
      {#if activeZone.description}<span class="label-desc">{activeZone.description}</span>{/if}
    {:else}
      <span class="label-placeholder">{placeholder}</span>
    {/if}
  </div>
</div>

<style>
  .brain-stage {
    --_bg: var(--brain-background, #070a13);
    --_line: var(--brain-line, rgba(99, 174, 222, 0.52));
    --_line-strong: var(--brain-line-strong, rgba(132, 222, 255, 0.82));
    --_glow: var(--brain-glow, #52e3ff);
    --_fill: var(--brain-fill, rgba(30, 94, 135, 0.035));
    --_sel-op: var(--brain-selected-opacity, 0.5);
    --_hov-op: var(--brain-hover-opacity, 1);
    --_focus: var(--brain-focus-color, #b7f6ff);

    position: relative;
    border-radius: 20px;
    padding: 14px;
    background:
      radial-gradient(circle at 50% 40%, rgba(34, 96, 150, 0.16), transparent 42%),
      var(--_bg);
    border: 1px solid rgba(132, 222, 255, 0.12);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.32);
  }

  .brain {
    display: block;
    width: 100%;
    height: auto;
  }

  /* Decorative geometry never intercepts pointers. */
  .brain-stage :global(.outer) {
    fill: rgba(20, 55, 84, 0.16);
    stroke: rgba(127, 217, 250, 0.72);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }

  .brain-stage :global(.mesh polygon),
  .brain-stage :global(.mesh polyline),
  .brain-stage :global(.mesh line) {
    fill: var(--_fill);
    stroke: var(--_line);
    stroke-width: 1.15;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }
  .brain-stage :global(.mesh .fine) {
    stroke-width: 0.8;
    opacity: 0.76;
  }
  .brain-stage :global(.mesh .heavy) {
    stroke: var(--_line-strong);
    stroke-width: 1.6;
  }

  .brain-stage :global(.node) {
    fill: color-mix(in srgb, var(--_glow) 70%, white);
    stroke: none;
    opacity: 0.72;
    pointer-events: none;
  }

  .brain-stage :global(.quarter-highlight) {
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
  }
  .brain-stage :global(.quarter-highlight.strong) {
    opacity: var(--_hov-op);
  }
  .brain-stage :global(.quarter-highlight.weak) {
    opacity: var(--_sel-op);
  }
  .brain-stage :global(.quarter-highlight polygon),
  .brain-stage :global(.quarter-highlight polyline),
  .brain-stage :global(.quarter-highlight line) {
    fill: color-mix(in srgb, var(--_glow) 15%, transparent);
    stroke: color-mix(in srgb, var(--_glow) 55%, white);
    stroke-width: 1.8;
    vector-effect: non-scaling-stroke;
  }
  .brain-stage :global(.quarter-highlight .fine) {
    stroke-width: 1.15;
    opacity: 1;
  }
  .brain-stage :global(.quarter-highlight .heavy) {
    stroke-width: 2.3;
  }

  .brain-stage :global(.quarter-guide) {
    fill: none;
    stroke: color-mix(in srgb, var(--_glow) 18%, transparent);
    stroke-width: 1;
    stroke-dasharray: 5 9;
    pointer-events: none;
  }

  .brain-stage :global(.quarter-hit) {
    fill: rgba(255, 255, 255, 0.001);
    stroke: none;
    cursor: pointer;
    pointer-events: all;
    outline: none;
  }
  .brain-stage :global(.quarter-hit:focus-visible) {
    stroke: var(--_focus);
    stroke-width: 4;
    fill: color-mix(in srgb, var(--_glow) 8%, transparent);
  }
  .brain-stage :global(.quarter-hit.disabled) {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .label-panel {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(8, 16, 30, 0.7);
    border: 1px solid rgba(132, 222, 255, 0.16);
    color: #8fa8bd;
    font-size: 14px;
    min-height: 20px;
  }
  .label-title {
    color: var(--_glow);
    font-weight: 700;
  }
  .label-badge {
    padding: 1px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--_glow) 22%, transparent);
    color: #eafbff;
    font-size: 12px;
    font-weight: 700;
  }
  .label-desc {
    color: #8fa8bd;
  }

  @media (prefers-reduced-motion: reduce) {
    .brain-stage :global(.quarter-highlight) {
      transition: none;
    }
  }
</style>
