/**
 * Selbrucivo — Visual Language System.
 * Editorial archival palette + typographic hierarchy + spacing.
 * Principles: cinematic restraint, museum-label pacing, ambient atmosphere.
 */
import { Platform } from 'react-native';

export const palette = {
  ink: '#0B0B0D',          // primary background — deeper than shark for cinematic depth
  shark: '#1A1B1F',        // surface / card
  rule: '#23231F',         // hairlines / dividers
  paper: '#F4ECDA',        // primary type on dark — warm museum cream
  parchment: '#D9CFB7',    // muted cream — secondary type
  dim: '#7B7565',          // tertiary type / labels
  faint: '#3A3830',        // disabled / placeholder
  coral: '#C04E55',        // editorial accent (placards, critical moments)
  coralInk: '#0B0B0D',     // text on coral
  ember: '#A3E044',        // reserved — global library unlocked state only
  gunsmoke: '#848887',     // metadata, neutrals
};

export const fonts = {
  display: Platform.select({
    web: '"EB Garamond", "Cormorant Garamond", Georgia, serif',
    default: 'Georgia',
  }) as string,
  sans: Platform.select({
    web: '"DM Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    default: 'System',
  }) as string,
  mono: Platform.select({
    web: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
    default: 'Menlo',
  }) as string,
};

/**
 * Typographic scale — editorial, ceremonial.
 * Use `display` for ceremonial titles, `sans` for body & metadata, `mono` for catalog numbering.
 */
export const type = {
  // Display (serif)
  displayXL: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, fontWeight: '400' as const, letterSpacing: -0.6 },
  displayL: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, fontWeight: '400' as const, letterSpacing: -0.4 },
  displayM: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, fontWeight: '400' as const, letterSpacing: -0.2 },
  displayS: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, fontWeight: '400' as const },
  italic: { fontFamily: fonts.display, fontStyle: 'italic' as const },

  // Sans
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, fontWeight: '400' as const, color: palette.parchment },
  bodySm: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, fontWeight: '400' as const, color: palette.dim },

  // Catalog / label — all-caps, mono-ish spaced
  catalog: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: palette.dim },
  catalogPaper: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: palette.paper },
  label: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: palette.dim, fontWeight: '500' as const },
};

export const space = { xs: 4, s: 8, m: 12, base: 16, l: 24, xl: 32, xxl: 48, mega: 72, ultra: 112 };

export const motion = {
  ambient: 800,      // slow atmospheric
  reveal: 480,
  quiet: 220,
  hold: 4000,        // overlay auto-fade hold
};
