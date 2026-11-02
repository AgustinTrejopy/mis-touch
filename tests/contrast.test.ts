import { describe, expect, it } from 'vitest';
import { contrastRatio, textColorFor } from '../src/contrast.ts';
import data from '../src/data/touch-colors.json';

const catalog = data.colors;

describe('contraste', () => {
  it('calcula los extremos WCAG', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('elige blanco sobre oscuros y negro sobre claros', () => {
    expect(textColorFor('#000000')).toBe('#FFFFFF');
    expect(textColorFor('#FFFFFF')).toBe('#000000');
    expect(textColorFor('#8B0021')).toBe('#FFFFFF');
    expect(textColorFor('#FFD600')).toBe('#000000');
  });

  it('todo HEX del catálogo alcanza al menos 4.5:1 (WCAG AA)', () => {
    for (const color of catalog) {
      if (color.hex === null) continue;
      expect(contrastRatio(color.hex, textColorFor(color.hex)), color.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});
