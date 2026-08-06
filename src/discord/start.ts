import type { DiscordTarget } from "./reply.js";
import { replyFollowUp } from "./reply.js";
import { mainMenuRows } from "./menus.js";
import { startGuideText } from "../shared/labels.js";
import { clearSession } from "../shared/session.js";

export async function sendStart(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  clearSession(ownerKey);
  await replyFollowUp(target, startGuideText("Discord"), mainMenuRows());
}
