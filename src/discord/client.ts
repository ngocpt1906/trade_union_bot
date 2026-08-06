import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { clearSession } from "../shared/session.js";
import {
  handleAttendanceComponent,
  handleAttendanceText,
  startAddEvent,
  startDeleteEvent,
} from "./handlers/attendance.js";
import {
  handleMachineComponent,
  handleMachineText,
  handleListMachines,
  startAddMachine,
  startDeleteMachine,
  startEditMachine,
} from "./handlers/machines.js";
import {
  handleStatsComponent,
  handleStatsText,
  startStatsMonth,
} from "./handlers/stats.js";
import {
  handleListWorkers,
  handleWorkerComponent,
  handleWorkerText,
  startAddWorker,
  startDeactivateWorker,
  startEditWorker,
} from "./handlers/workers.js";
import { mainMenuRows } from "./menus.js";
import {
  isDmChannel,
  mainMenuHint,
  ownerKeyFromUser,
  replyFollowUp,
} from "./reply.js";
import { sendStart } from "./start.js";

const DM_ONLY =
  "Bot chỉ hỗ trợ **DM** (tin nhắn riêng). Hãy mở Direct Message với bot rồi gõ `/start`.";

async function handleMenuAction(
  customId: string,
  target: Parameters<typeof startAddWorker>[0],
  ownerKey: string,
): Promise<boolean> {
  switch (customId) {
    case "menu:addWorker":
      await startAddWorker(target, ownerKey);
      return true;
    case "menu:listWorkers":
      await handleListWorkers(target, ownerKey);
      return true;
    case "menu:editWorker":
      await startEditWorker(target, ownerKey);
      return true;
    case "menu:deactivate":
      await startDeactivateWorker(target, ownerKey);
      return true;
    case "menu:addEvent":
      await startAddEvent(target, ownerKey);
      return true;
    case "menu:deleteEvent":
      await startDeleteEvent(target, ownerKey);
      return true;
    case "menu:statsMonth":
      await startStatsMonth(target, ownerKey);
      return true;
    case "menu:addMachine":
      await startAddMachine(target, ownerKey);
      return true;
    case "menu:listMachines":
      await handleListMachines(target, ownerKey);
      return true;
    case "menu:editMachine":
      await startEditMachine(target, ownerKey);
      return true;
    case "menu:deleteMachine":
      await startDeleteMachine(target, ownerKey);
      return true;
    case "menu:cancel":
      clearSession(ownerKey);
      await replyFollowUp(target, "Đã hủy thao tác.", mainMenuRows());
      return true;
    default:
      return false;
  }
}

async function registerSlashCommands(
  token: string,
  clientId: string,
): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  const commands = [
    new SlashCommandBuilder()
      .setName("start")
      .setDescription("Mở hướng dẫn và menu nút (chỉ dùng trong DM)")
      .toJSON(),
  ];
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
}

export function createDiscordBot(token: string): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once(Events.ClientReady, async (ready) => {
    console.log(`Discord bot @${ready.user.tag} is ready.`);
    try {
      await registerSlashCommands(token, ready.user.id);
      console.log("Discord slash command /start registered.");
    } catch (err) {
      console.error("Failed to register Discord slash commands:", err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName !== "start") return;

        if (!isDmChannel(interaction.channel)) {
          await interaction.reply({ content: DM_ONLY, ephemeral: true });
          return;
        }

        const ownerKey = ownerKeyFromUser(interaction.user);
        await sendStart(interaction, ownerKey);
        return;
      }

      if (!interaction.isMessageComponent()) return;

      if (!isDmChannel(interaction.channel)) {
        await interaction.reply({ content: DM_ONLY, ephemeral: true });
        return;
      }

      const ownerKey = ownerKeyFromUser(interaction.user);
      const data = interaction.customId;

      if (await handleMenuAction(data, interaction, ownerKey)) return;
      if (await handleMachineComponent(interaction, ownerKey, data)) return;
      if (await handleWorkerComponent(interaction, ownerKey, data)) return;
      if (await handleAttendanceComponent(interaction, ownerKey, data)) return;
      if (await handleStatsComponent(interaction, ownerKey, data)) return;
    } catch (err) {
      console.error("Discord interaction error:", err);
      try {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra.";
        if (interaction.isRepliable()) {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: msg });
          } else {
            await interaction.reply({ content: msg, ephemeral: true });
          }
        }
      } catch {
        // ignore secondary errors
      }
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.author.bot) return;
      if (!isDmChannel(message.channel)) return;

      const ownerKey = ownerKeyFromUser(message.author);
      const text = message.content.trim();
      if (!text) return;

      if (text === "/start") {
        await sendStart(message, ownerKey);
        return;
      }

      if (await handleMachineText(message, ownerKey, text)) return;
      if (await handleWorkerText(message, ownerKey, text)) return;
      if (await handleAttendanceText(message, ownerKey, text)) return;
      if (await handleStatsText(message, ownerKey, text)) return;

      await replyFollowUp(message, mainMenuHint(), mainMenuRows());
    } catch (err) {
      console.error("Discord message error:", err);
      try {
        if (message.channel.isSendable()) {
          await message.channel.send(
            err instanceof Error ? err.message : "Có lỗi xảy ra.",
          );
        }
      } catch {
        // ignore
      }
    }
  });

  return client;
}

export async function startDiscordBot(token: string): Promise<Client> {
  const client = createDiscordBot(token);
  await client.login(token);
  return client;
}
