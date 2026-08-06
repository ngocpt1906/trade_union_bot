import type {
  ChatInputCommandInteraction,
  Message,
  MessageComponentInteraction,
} from "discord.js";
import { discordOwnerKey } from "../shared/ownerKey.js";
import { mainMenuRows } from "./menus.js";

export type DiscordTarget =
  | ChatInputCommandInteraction
  | MessageComponentInteraction
  | Message;

const DISCORD_MAX = 1900;

export function ownerKeyFromUser(user: { id: string }): string {
  return discordOwnerKey(user.id);
}

export function isDmChannel(channel: {
  isDMBased?: () => boolean;
} | null): boolean {
  return Boolean(channel && typeof channel.isDMBased === "function" && channel.isDMBased());
}

export function splitMessage(text: string): string[] {
  if (text.length <= DISCORD_MAX) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > DISCORD_MAX) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.slice(0, DISCORD_MAX)];
}

type Components = ReturnType<typeof mainMenuRows>;

async function sendViaInteraction(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  content: string,
  components: Components | undefined,
  mode: "reply" | "followUp" | "update",
): Promise<void> {
  const chunks = splitMessage(content);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const payload = {
      content: chunks[i],
      components: isLast && components ? components : [],
    };

    if (i === 0 && mode === "update" && interaction.isMessageComponent()) {
      await interaction.update(payload);
      continue;
    }

    if (i === 0 && mode === "reply" && !interaction.replied && !interaction.deferred) {
      await interaction.reply(payload);
      continue;
    }

    await interaction.followUp(payload);
  }
}

export async function replyText(
  target: DiscordTarget,
  content: string,
  components?: Components,
): Promise<void> {
  if ("isChatInputCommand" in target || "isMessageComponent" in target) {
    const interaction = target as
      | ChatInputCommandInteraction
      | MessageComponentInteraction;
    const mode =
      interaction.isMessageComponent() && !interaction.replied && !interaction.deferred
        ? "update"
        : interaction.replied || interaction.deferred
          ? "followUp"
          : "reply";
    await sendViaInteraction(interaction, content, components, mode);
    return;
  }

  const chunks = splitMessage(content);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const payload = {
      content: chunks[i],
      components: isLast && components ? components : [],
    };
    const channel = (target as Message).channel;
    if (channel.isSendable()) {
      await channel.send(payload);
    }
  }
}

/** Always reply/followUp without editing the component message. */
export async function replyFollowUp(
  target: DiscordTarget,
  content: string,
  components?: Components,
): Promise<void> {
  if ("followUp" in target) {
    const interaction = target as
      | ChatInputCommandInteraction
      | MessageComponentInteraction;
    await sendViaInteraction(
      interaction,
      content,
      components,
      interaction.replied || interaction.deferred ? "followUp" : "reply",
    );
    return;
  }
  await replyText(target, content, components);
}

export async function ackComponent(
  interaction: MessageComponentInteraction,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }
}

export function mainMenuHint(): string {
  return "Chọn nút menu bên dưới. Gõ `/start` để xem hướng dẫn.";
}
