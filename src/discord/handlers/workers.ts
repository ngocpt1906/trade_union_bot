import type { Message, MessageComponentInteraction } from "discord.js";
import {
  getMachineById,
  listActiveMachines,
} from "../../services/machineService.js";
import type { ShiftCode } from "../../services/shiftCalendar.js";
import {
  createWorker,
  deactivateWorker,
  formatWorkerLine,
  getWorkerById,
  listActiveWorkers,
  updateWorker,
} from "../../services/workerService.js";
import { clearSession, getSession, setSession } from "../../shared/session.js";
import {
  BTN,
  cancelRow,
  editWorkerFieldRows,
  itemSelectRows,
  mainMenuRows,
  shiftRows,
} from "../menus.js";
import {
  ackComponent,
  replyFollowUp,
  type DiscordTarget,
} from "../reply.js";

async function machineNameMap(ownerKey: string): Promise<Map<string, string>> {
  const machines = await listActiveMachines(ownerKey);
  return new Map(machines.map((m) => [String(m._id), m.name]));
}

export async function handleListWorkers(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const workers = await listActiveWorkers(ownerKey);
  if (workers.length === 0) {
    await replyFollowUp(
      target,
      `Chưa có công nhân nào. Dùng nút «${BTN.addWorker}» để thêm (cần có máy trước).`,
      mainMenuRows(),
    );
    return;
  }

  const names = await machineNameMap(ownerKey);
  const byShift: Record<string, string[]> = { A: [], B: [], C: [] };
  for (const w of workers) {
    const mName = names.get(String(w.machineId)) ?? "?";
    byShift[w.shift]?.push(`• ${w.name} (${w.birthYear}) — Máy ${mName}`);
  }

  const lines = [
    `Danh sách tổ (${workers.length} người)`,
    "",
    "Ca A:",
    ...(byShift.A.length ? byShift.A : ["• (trống)"]),
    "",
    "Ca B:",
    ...(byShift.B.length ? byShift.B : ["• (trống)"]),
    "",
    "Ca C:",
    ...(byShift.C.length ? byShift.C : ["• (trống)"]),
  ];

  await replyFollowUp(target, lines.join("\n"), mainMenuRows());
}

export async function startAddWorker(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const machines = await listActiveMachines(ownerKey);
  if (machines.length === 0) {
    await replyFollowUp(
      target,
      `Chưa có máy nào. Hãy thêm máy trước bằng nút «${BTN.addMachine}».`,
      mainMenuRows(),
    );
    return;
  }
  setSession(ownerKey, { kind: "add_worker_name" });
  await replyFollowUp(target, "Nhập tên công nhân:", cancelRow());
}

export async function startEditWorker(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const workers = await listActiveWorkers(ownerKey);
  if (workers.length === 0) {
    await replyFollowUp(target, "Chưa có công nhân nào.", mainMenuRows());
    return;
  }
  const names = await machineNameMap(ownerKey);
  setSession(ownerKey, { kind: "edit_worker_pick" });
  await replyFollowUp(
    target,
    "Chọn công nhân cần sửa:",
    itemSelectRows(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift}/${names.get(String(w.machineId)) ?? "?"})`,
      })),
      "ewpick",
      "Chọn công nhân",
    ),
  );
}

export async function startDeactivateWorker(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const workers = await listActiveWorkers(ownerKey);
  if (workers.length === 0) {
    await replyFollowUp(target, "Chưa có công nhân nào.", mainMenuRows());
    return;
  }
  setSession(ownerKey, { kind: "deactivate_pick_worker" });
  await replyFollowUp(
    target,
    "Chọn công nhân cần ngưng:",
    itemSelectRows(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift})`,
      })),
      "deact",
      "Chọn công nhân",
    ),
  );
}

export async function handleWorkerText(
  message: Message,
  ownerKey: string,
  text: string,
): Promise<boolean> {
  const session = getSession(ownerKey);

  if (session.kind === "add_worker_name") {
    const name = text.trim();
    if (name.length < 2) {
      await replyFollowUp(message, "Tên quá ngắn. Nhập lại tên:", cancelRow());
      return true;
    }
    setSession(ownerKey, { kind: "add_worker_birth", name });
    await replyFollowUp(
      message,
      `Tên: ${name}\nNhập năm sinh (ví dụ 1995):`,
      cancelRow(),
    );
    return true;
  }

  if (session.kind === "add_worker_birth") {
    const year = Number(text.trim());
    if (!Number.isInteger(year) || year < 1950 || year > 2015) {
      await replyFollowUp(
        message,
        "Năm sinh không hợp lệ (1950–2015). Nhập lại:",
        cancelRow(),
      );
      return true;
    }
    setSession(ownerKey, {
      kind: "add_worker_shift",
      name: session.name,
      birthYear: year,
    });
    await replyFollowUp(
      message,
      `Chọn ca cho ${session.name}:`,
      shiftRows("shift"),
    );
    return true;
  }

  if (session.kind === "edit_worker_name") {
    const name = text.trim();
    if (name.length < 2) {
      await replyFollowUp(message, "Tên quá ngắn. Nhập lại:", cancelRow());
      return true;
    }
    const worker = await updateWorker(ownerKey, session.workerId, { name });
    clearSession(ownerKey);
    await replyFollowUp(
      message,
      worker ? `Đã cập nhật tên: ${worker.name}` : "Không tìm thấy công nhân.",
      mainMenuRows(),
    );
    return true;
  }

  if (session.kind === "edit_worker_birth") {
    const year = Number(text.trim());
    if (!Number.isInteger(year) || year < 1950 || year > 2015) {
      await replyFollowUp(
        message,
        "Năm sinh không hợp lệ (1950–2015). Nhập lại:",
        cancelRow(),
      );
      return true;
    }
    const worker = await updateWorker(ownerKey, session.workerId, {
      birthYear: year,
    });
    clearSession(ownerKey);
    await replyFollowUp(
      message,
      worker
        ? `Đã cập nhật năm sinh: ${worker.name} (${worker.birthYear})`
        : "Không tìm thấy công nhân.",
      mainMenuRows(),
    );
    return true;
  }

  return false;
}

function selectValue(
  interaction: MessageComponentInteraction,
  prefix: string,
  data: string,
): string | null {
  if (interaction.isStringSelectMenu() && data === prefix) {
    return interaction.values[0] ?? null;
  }
  if (data.startsWith(`${prefix}:`)) return data.slice(prefix.length + 1);
  return null;
}

export async function handleWorkerComponent(
  interaction: MessageComponentInteraction,
  ownerKey: string,
  data: string,
): Promise<boolean> {
  const session = getSession(ownerKey);

  if (data.startsWith("shift:")) {
    if (session.kind !== "add_worker_shift") {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
      return true;
    }
    const shift = data.slice("shift:".length) as ShiftCode;
    if (!["A", "B", "C"].includes(shift)) {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Ca không hợp lệ.", cancelRow());
      return true;
    }
    const machines = await listActiveMachines(ownerKey);
    if (machines.length === 0) {
      clearSession(ownerKey);
      await ackComponent(interaction);
      await replyFollowUp(
        interaction,
        `Chưa có máy. Thêm máy bằng nút «${BTN.addMachine}» trước.`,
        mainMenuRows(),
      );
      return true;
    }
    setSession(ownerKey, {
      kind: "add_worker_machine",
      name: session.name,
      birthYear: session.birthYear,
      shift,
    });
    await ackComponent(interaction);
    await replyFollowUp(
      interaction,
      `Ca ${shift} — chọn máy phân công:`,
      itemSelectRows(
        machines.map((m) => ({ id: String(m._id), label: m.name })),
        "wmach",
        "Chọn máy",
      ),
    );
    return true;
  }

  {
    const machineId = selectValue(interaction, "wmach", data);
    if (machineId) {
      if (session.kind !== "add_worker_machine") {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
        return true;
      }
      const machine = await getMachineById(ownerKey, machineId);
      if (!machine) {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Máy không hợp lệ.", cancelRow());
        return true;
      }
      try {
        const worker = await createWorker({
          ownerKey,
          name: session.name,
          birthYear: session.birthYear,
          shift: session.shift,
          machineId,
        });
        clearSession(ownerKey);
        await ackComponent(interaction);
        await replyFollowUp(
          interaction,
          `Đã thêm: ${formatWorkerLine(worker, machine.name)}`,
          mainMenuRows(),
        );
      } catch (err) {
        await ackComponent(interaction);
        await replyFollowUp(
          interaction,
          err instanceof Error ? err.message : "Không thêm được.",
          cancelRow(),
        );
      }
      return true;
    }
  }

  {
    const workerId = selectValue(interaction, "ewpick", data);
    if (workerId) {
      const worker = await getWorkerById(ownerKey, workerId);
      if (!worker) {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Không tìm thấy.", mainMenuRows());
        return true;
      }
      const machine = await getMachineById(ownerKey, String(worker.machineId));
      setSession(ownerKey, {
        kind: "edit_worker_field",
        workerId,
        workerName: worker.name,
      });
      await ackComponent(interaction);
      await replyFollowUp(
        interaction,
        [
          `Sửa: ${worker.name}`,
          `• Năm sinh: ${worker.birthYear}`,
          `• Ca: ${worker.shift}`,
          `• Máy: ${machine?.name ?? "?"}`,
          "",
          "Chọn thông tin cần sửa:",
        ].join("\n"),
        editWorkerFieldRows(),
      );
      return true;
    }
  }

  if (data.startsWith("efield:")) {
    if (session.kind !== "edit_worker_field") {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
      return true;
    }
    const field = data.slice("efield:".length);
    await ackComponent(interaction);

    if (field === "name") {
      setSession(ownerKey, {
        kind: "edit_worker_name",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await replyFollowUp(
        interaction,
        `Nhập tên mới cho ${session.workerName}:`,
        cancelRow(),
      );
      return true;
    }
    if (field === "birth") {
      setSession(ownerKey, {
        kind: "edit_worker_birth",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await replyFollowUp(
        interaction,
        `Nhập năm sinh mới cho ${session.workerName}:`,
        cancelRow(),
      );
      return true;
    }
    if (field === "shift") {
      setSession(ownerKey, {
        kind: "edit_worker_shift",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await replyFollowUp(
        interaction,
        `Chọn ca mới cho ${session.workerName}:`,
        shiftRows("eshift"),
      );
      return true;
    }
    if (field === "machine") {
      const machines = await listActiveMachines(ownerKey);
      if (machines.length === 0) {
        await replyFollowUp(interaction, "Chưa có máy nào.", mainMenuRows());
        return true;
      }
      setSession(ownerKey, {
        kind: "edit_worker_machine",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await replyFollowUp(
        interaction,
        `Chọn máy mới cho ${session.workerName}:`,
        itemSelectRows(
          machines.map((m) => ({ id: String(m._id), label: m.name })),
          "emach",
          "Chọn máy",
        ),
      );
      return true;
    }
    return true;
  }

  if (data.startsWith("eshift:")) {
    if (session.kind !== "edit_worker_shift") {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
      return true;
    }
    const shift = data.slice("eshift:".length) as ShiftCode;
    if (!["A", "B", "C"].includes(shift)) {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Ca không hợp lệ.", cancelRow());
      return true;
    }
    const worker = await updateWorker(ownerKey, session.workerId, { shift });
    clearSession(ownerKey);
    await ackComponent(interaction);
    await replyFollowUp(
      interaction,
      worker
        ? `Đã cập nhật ca: ${worker.name} → Ca ${worker.shift}`
        : "Không tìm thấy công nhân.",
      mainMenuRows(),
    );
    return true;
  }

  {
    const machineId = selectValue(interaction, "emach", data);
    if (machineId) {
      if (session.kind !== "edit_worker_machine") {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
        return true;
      }
      const machine = await getMachineById(ownerKey, machineId);
      if (!machine) {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Máy không hợp lệ.", cancelRow());
        return true;
      }
      try {
        const worker = await updateWorker(ownerKey, session.workerId, {
          machineId,
        });
        clearSession(ownerKey);
        await ackComponent(interaction);
        await replyFollowUp(
          interaction,
          worker
            ? `Đã cập nhật máy: ${worker.name} → ${machine.name}`
            : "Không tìm thấy công nhân.",
          mainMenuRows(),
        );
      } catch (err) {
        await ackComponent(interaction);
        await replyFollowUp(
          interaction,
          err instanceof Error ? err.message : "Không cập nhật được.",
          cancelRow(),
        );
      }
      return true;
    }
  }

  {
    const id = selectValue(interaction, "deact", data);
    if (id) {
      const worker = await getWorkerById(ownerKey, id);
      if (!worker) {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Không tìm thấy.", mainMenuRows());
        return true;
      }
      await deactivateWorker(ownerKey, id);
      clearSession(ownerKey);
      await ackComponent(interaction);
      await replyFollowUp(
        interaction,
        `Đã ngưng: ${worker.name} (Ca ${worker.shift})`,
        mainMenuRows(),
      );
      return true;
    }
  }

  return false;
}
