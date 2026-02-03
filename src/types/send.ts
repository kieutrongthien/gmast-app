export type SimSelectionMode = 'manual' | 'random';

export interface SendConfig {
  simMode: SimSelectionMode;
  simSlotId: string | null;
}
