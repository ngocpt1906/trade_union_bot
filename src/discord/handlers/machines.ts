import type { MessageComponentInteraction, Message } from "discord.js";
import {
  createMachine,
  deactivateMachine,
  formatMachineLine,
  getMachineById,
  listActiveMachines,
  renameMachine,
} from "../../services/machineService.js";
import { clearSession, getSession, setSession } from "../../shared/session.js";
import { BTN, cancelRow, itemSelectRows, mainMenuRows } from "../menus.js";
import {
  ackComponent,
  replyFollowUp,
  type DiscordTarget,
} from "../reply.js";

export async function startAddMachine(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  setSession(ownerKey, { kind: "add_machine_name" });
  await replyFollowUp(
    target,
    "Nhập tên máy (ví dụ: Máy 1, CNC-02):",
    cancelRow(),
  );
}

export async function handleListMachines(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const machines = await listActiveMachines(ownerKey);
  if (machines.length === 0) {
    await replyFollowUp(
      target,
      `Chưa có máy nào. Dùng nút «${BTN.addMachine}» để thêm máy trước khi thêm người.`,
      mainMenuRows(),
    );
    return;
  }
  const lines = [
    `Danh sách máy (${machines.length}):`,
    ...machines.map((m, i) => formatMachineLine(m, i + 1)),
  ];
  await replyFollowUp(target, lines.join("\n"), mainMenuRows());
}

export async function startEditMachine(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const machines = await listActiveMachines(ownerKey);
  if (machines.length === 0) {
    await replyFollowUp(target, "Chưa có máy nào.", mainMenuRows());
    return;
  }
  setSession(ownerKey, { kind: "edit_machine_pick" });
  await replyFollowUp(
    target,
    "Chọn máy cần đổi tên:",
    itemSelectRows(
      machines.map((m) => ({ id: String(m._id), label: m.name })),
      "medit",
      "Chọn máy",
    ),
  );
}

export async function startDeleteMachine(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const machines = await listActiveMachines(ownerKey);
  if (machines.length === 0) {
    await replyFollowUp(target, "Chưa có máy nào.", mainMenuRows());
    return;
  }
  setSession(ownerKey, { kind: "delete_machine_pick" });
  await replyFollowUp(
    target,
    "Chọn máy cần xóa:",
    itemSelectRows(
      machines.map((m) => ({ id: String(m._id), label: m.name })),
      "mdel",
      "Chọn máy",
    ),
  );
}

export async function handleMachineText(
  message: Message,
  ownerKey: string,
  text: string,
): Promise<boolean> {
  const session = getSession(ownerKey);

  if (session.kind === "add_machine_name") {
    try {
      const machine = await createMachine(ownerKey, text);
      clearSession(ownerKey);
      await replyFollowUp(
        message,
        `Đã thêm máy: ${machine.name}`,
        mainMenuRows(),
      );
    } catch (err) {
      await replyFollowUp(
        message,
        err instanceof Error ? err.message : "Không thêm được máy. Nhập lại:",
        cancelRow(),
      );
    }
    return true;
  }

  if (session.kind === "edit_machine_name") {
    try {
      const machine = await renameMachine(ownerKey, session.machineId, text);
      clearSession(ownerKey);
      if (!machine) {
        await replyFollowUp(message, "Không tìm thấy máy.", mainMenuRows());
      } else {
        await replyFollowUp(
          message,
          `Đã đổi tên: ${session.machineName} → ${machine.name}`,
          mainMenuRows(),
        );
      }
    } catch (err) {
      await replyFollowUp(
        message,
        err instanceof Error ? err.message : "Không đổi tên được. Nhập lại:",
        cancelRow(),
      );
    }
    return true;
  }

  return false;
}

export async function handleMachineComponent(
  interaction: MessageComponentInteraction,
  ownerKey: string,
  data: string,
): Promise<boolean> {
  if (data.startsWith("medit:") || (interaction.isStringSelectMenu() && data === "medit")) {
    const machineId = interaction.isStringSelectMenu()
      ? interaction.values[0]
      : data.slice("medit:".length);
    const machine = await getMachineById(ownerKey, machineId);
    if (!machine) {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Không tìm thấy máy.", mainMenuRows());
      return true;
    }
    setSession(ownerKey, {
      kind: "edit_machine_name",
      machineId,
      machineName: machine.name,
    });
    await ackComponent(interaction);
    await replyFollowUp(
      interaction,
      `Đổi tên máy «${machine.name}»\nNhập tên máy mới:`,
      cancelRow(),
    );
    return true;
  }

  if (data.startsWith("mdel:") || (interaction.isStringSelectMenu() && data === "mdel")) {
    const machineId = interaction.isStringSelectMenu()
      ? interaction.values[0]
      : data.slice("mdel:".length);
    const machine = await getMachineById(ownerKey, machineId);
    if (!machine) {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Không tìm thấy máy.", mainMenuRows());
      return true;
    }
    const result = await deactivateMachine(ownerKey, machineId);
    clearSession(ownerKey);
    await ackComponent(interaction);
    if (result.blockedByWorkers > 0) {
      await replyFollowUp(
        interaction,
        `Không xóa được «${machine.name}»: còn ${result.blockedByWorkers} công nhân đang gán máy này. Hãy chuyển họ sang máy khác trước.`,
        mainMenuRows(),
      );
      return true;
    }
    await replyFollowUp(
      interaction,
      `Đã xóa máy: ${machine.name}`,
      mainMenuRows(),
    );
    return true;
  }

  return false;
}
