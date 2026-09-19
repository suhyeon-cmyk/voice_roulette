export interface HsvColor {
  h: number; // 0 - 360
  s: number; // 0 - 1
  v: number; // 0 - 1
}

export interface RgbColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

// 5개 기본 파스텔 색상 (기존 색상들과 동일)
export const DEFAULT_PASTEL_COLORS = [
  '#FFB5C5', // 파스텔 핑크
  '#FFDAC1', // 파스텔 피치
  '#FFF2B2', // 파스텔 옐로우
  '#B5EAD7', // 파스텔 민트
  '#C7CEEA', // 파스텔 라벤더
];

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Format RGB Hex code: ensures single '#' prefix and valid 6-character uppercase hex
export function sanitizeHexCode(raw: string, fallback = '#FFB5C5'): string {
  let val = raw.trim();
  if (!val) return fallback;
  // Multiple '#' to single '#'
  val = val.replace(/^#+/, '');
  val = val.replace(/[^0-9a-fA-F]/g, '');
  if (val.length === 3) {
    val = val.split('').map((c) => c + c).join('');
  } else if (val.length > 6) {
    val = val.slice(0, 6);
  } else if (val.length < 6) {
    val = val.padEnd(6, '0');
  }
  return '#' + val.toUpperCase();
}

export function hexToRgb(hex: string): RgbColor {
  const sanitized = sanitizeHexCode(hex);
  const num = parseInt(sanitized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export function rgbToHsv(rgb: RgbColor): HsvColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

export function hsvToRgb(hsv: HsvColor): RgbColor {
  const { h, s, v } = hsv;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rPrime = 0, gPrime = 0, bPrime = 0;
  if (h >= 0 && h < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

// 0-255 scale conversions for 색상, 채도, 명도
export function hsvTo255(hsv: HsvColor): { h: number; s: number; v: number } {
  return {
    h: Math.round((hsv.h / 360) * 255),
    s: Math.round(hsv.s * 255),
    v: Math.round(hsv.v * 255),
  };
}

export function hsvFrom255(h_255: number, s_255: number, v_255: number): HsvColor {
  return {
    h: clamp((h_255 / 255) * 360, 0, 360),
    s: clamp(s_255 / 255, 0, 1),
    v: clamp(v_255 / 255, 0, 1),
  };
}
