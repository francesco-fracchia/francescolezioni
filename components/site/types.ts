export type RequestKind =
  "pre-registration" | "group" | "consultation" | "lesson";
export type Assessment = { test: string; score: number; answers: number[]; student?: string };
export type DialogKind = RequestKind | "contact" | "test" | "privacy";
export type GroupSize = 2 | 3 | 4;
export type OpenDialog = (
  kind: DialogKind,
  subject?: string,
  companion?: boolean,
  groupSize?: GroupSize,
) => void;
