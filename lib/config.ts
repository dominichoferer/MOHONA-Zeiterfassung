export const DURATION_OPTIONS = [
  { label: '15 min',  minutes: 15 },
  { label: '30 min',  minutes: 30 },
  { label: '45 min',  minutes: 45 },
  { label: '1 Std',   minutes: 60 },
  { label: '1½ Std',  minutes: 90 },
  { label: '2 Std',   minutes: 120 },
  { label: '2½ Std',  minutes: 150 },
  { label: '3 Std',   minutes: 180 },
  { label: '4 Std',   minutes: 240 },
  { label: '5 Std',   minutes: 300 },
  { label: '6 Std',   minutes: 360 },
  { label: '7 Std',   minutes: 420 },
  { label: '8 Std',   minutes: 480 },
]

export type DurationOption = typeof DURATION_OPTIONS[number]
