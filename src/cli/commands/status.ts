import { detectState, formatState } from "../../core/state";

export async function status(_args: string[]): Promise<void> {
  const state = await detectState();
  console.log(formatState(state));
}
