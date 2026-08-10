import { describe, expect, it } from 'vitest';
import { chapterArt, shade, visualSeed } from './art-direction';

describe('paper theatre art direction', () => {
  it('defines a distinct authored palette for every chapter', () => {
    const palettes = [1, 2, 3, 4].map(chapterArt);
    expect(new Set(palettes.map(palette => palette.skyTop)).size).toBe(4);
    expect(new Set(palettes.map(palette => palette.platform)).size).toBe(4);
    for (const palette of palettes) {
      expect(palette.ink).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.hazard).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.paper).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('clamps invalid chapter values to the authored range', () => {
    expect(chapterArt(-2)).toEqual(chapterArt(1));
    expect(chapterArt(99)).toEqual(chapterArt(4));
  });

  it('creates stable visual seeds without collapsing adjacent inputs', () => {
    expect(visualSeed(7, 13)).toBe(visualSeed(7, 13));
    expect(visualSeed(7, 13)).not.toBe(visualSeed(7, 14));
    expect(visualSeed(7, 13)).toBeGreaterThanOrEqual(0);
    expect(visualSeed(7, 13)).toBeLessThan(1);
  });

  it('shades hex colors and clamps channel output', () => {
    expect(shade('#808080', .25)).toBe('#a0a0a0');
    expect(shade('#808080', -.25)).toBe('#606060');
    expect(shade('#ffffff', .5)).toBe('#ffffff');
    expect(shade('#000000', -.5)).toBe('#000000');
  });
});
