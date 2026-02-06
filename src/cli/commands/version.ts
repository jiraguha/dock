import { VERSION } from "../../core/upgrade";

export async function version(_args: string[]): Promise<void> {
  console.log(`dock ${VERSION}`);
}
