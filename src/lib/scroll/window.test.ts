import { describe, it, expect } from 'vitest';
import { initialWindow, growUp, growDown, trimTop, trimBottom } from './window';

describe('initialWindow', () => {
  it('centers on the target with buffer each side', () => {
    expect(initialWindow(100, 50, 10, 45)).toEqual({ start: 40, end: 61 });
  });

  it('clamps to the array bounds', () => {
    expect(initialWindow(100, 2, 10, 45)).toEqual({ start: 0, end: 13 });
    expect(initialWindow(100, 98, 10, 45)).toEqual({ start: 88, end: 100 });
  });

  it('never exceeds max, keeping the center edge', () => {
    const w = initialWindow(1000, 500, 40, 45);
    expect(w.end - w.start).toBe(45);
    expect(w.start).toBe(460);
  });

  it('handles an empty list', () => {
    expect(initialWindow(0, 0, 10, 45)).toEqual({ start: 0, end: 0 });
  });
});

describe('grow / trim single-direction ops', () => {
  it('growUp moves the top edge up, floored at 0', () => {
    expect(growUp({ start: 30, end: 50 }, 10)).toEqual({ start: 20, end: 50 });
    expect(growUp({ start: 5, end: 50 }, 10)).toEqual({ start: 0, end: 50 });
  });

  it('growDown moves the bottom edge down, capped at len', () => {
    expect(growDown({ start: 30, end: 50 }, 100, 10)).toEqual({ start: 30, end: 60 });
    expect(growDown({ start: 30, end: 95 }, 100, 10)).toEqual({ start: 30, end: 100 });
  });

  it('trimTop drops from the top only past max', () => {
    expect(trimTop({ start: 20, end: 80 }, 45)).toEqual({ start: 35, end: 80 });
    expect(trimTop({ start: 20, end: 50 }, 45)).toEqual({ start: 20, end: 50 }); // within max
  });

  it('trimBottom drops from the bottom only past max', () => {
    expect(trimBottom({ start: 20, end: 80 }, 45)).toEqual({ start: 20, end: 65 });
    expect(trimBottom({ start: 20, end: 50 }, 45)).toEqual({ start: 20, end: 50 });
  });

  it('a grow-then-trim cycle restores the window size', () => {
    let w = { start: 20, end: 65 }; // size 45 = max
    w = growUp(w, 10); // size 55
    w = trimBottom(w, 45); // back to 45
    expect(w.end - w.start).toBe(45);
    expect(w.start).toBe(10);
  });
});
