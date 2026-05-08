import type { VisionJobSlot } from "@/components/vision-batch-results";

export type VisionSlotAction =
  | { type: "reset"; slots: VisionJobSlot[] }
  | { type: "patch"; index: number; patch: Partial<VisionJobSlot> };

export function visionBatchSlotsReducer(
  state: VisionJobSlot[],
  action: VisionSlotAction,
): VisionJobSlot[] {
  switch (action.type) {
    case "reset":
      return action.slots;
    case "patch": {
      const { index, patch } = action;
      if (index < 0 || index >= state.length) return state;
      const next = [...state];
      next[index] = { ...next[index]!, ...patch };
      return next;
    }
    default:
      return state;
  }
}
