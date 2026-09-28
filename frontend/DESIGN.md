# VoiceShield — Design System v2

Art direction: "the listening room"
A dim audio-forensics lab crossed with a film title sequence.

## Palette
- --c-ground: #0c0b09  (warm near-black)
- --c-surface: #131210  (raised surfaces)
- --c-lift: #1c1a17    (hover/active)
- --c-rule: #262420    (hairline borders)
- --c-rule-hi: #37342e
- --c-amber: #d4903a   (signature phosphor-amber accent)
- --c-amber-lo: #7a4f18
- --c-bone: #e8e2d5    (primary text, warm off-white)
- --c-dim: #8c8577     (secondary text)
- --c-faint: #524e46   (tertiary/placeholder)
- Status: --c-human #5e8c5e, --c-synth #8c4040, --c-inconc #8c7040

Banned: purple-cyan gradients, neon glows, glassmorphism, emoji, gradient text.

## Typography
- Display: DM Serif Display (editorial serif for headlines 3-7rem)
- Body/UI: DM Sans (clean neutral grotesque)
- Mono: DM Mono (data, IDs, timestamps)

## Grid
12-column, 1440px max, clamp(24px,4vw,64px) gutters.
Asymmetric editorial. Hairlines not boxed cards. Radius 0 everywhere.

## Motion
- --ease-out: cubic-bezier(0.16,1,0.3,1)
- --dur-fast: 120ms, --dur-mid: 240ms, --dur-slow: 400ms, --dur-cinematic: 1200ms
- All motion degrades to static with prefers-reduced-motion: reduce.
