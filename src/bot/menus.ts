import { InlineKeyboard, Keyboard } from "grammy";

export const BTN = {
  addWorker: "➕ Thêm người vào tổ",
  listWorkers: "👥 Hiện danh sách tổ",
  editWorker: "✏️ Sửa người trong tổ",
  addEvent: "📝 Thêm phát sinh",
  deleteEvent: "🗑️ Xóa phát sinh",
  statsMonth: "📊 Thống kê tháng",
  statsRange: "📅 Thống kê khoảng",
  addMachine: "🏭 Thêm máy",
  listMachines: "📋 Danh sách máy",
  editMachine: "✏️ Sửa máy",
  deleteMachine: "🗑️ Xóa máy",
  deactivate: "🚫 Ngưng công nhân",
  cancel: "❌ Hủy",
  today: "Hôm nay",
  thisMonth: "Tháng này",
  skipNote: "Bỏ qua ghi chú",
} as const;

export function mainKeyboard(): Keyboard {
  return new Keyboard()
    .text(BTN.addWorker)
    .text(BTN.listWorkers)
    .row()
    .text(BTN.editWorker)
    .text(BTN.deactivate)
    .row()
    .text(BTN.addEvent)
    .text(BTN.deleteEvent)
    .row()
    .text(BTN.statsMonth)
    .text(BTN.statsRange)
    .row()
    .text(BTN.addMachine)
    .text(BTN.listMachines)
    .row()
    .text(BTN.editMachine)
    .text(BTN.deleteMachine)
    .resized()
    .persistent();
}

export function cancelKeyboard(): Keyboard {
  return new Keyboard().text(BTN.cancel).resized().oneTime();
}

export function shiftInlineKeyboard(prefix = "shift"): InlineKeyboard {
  return new InlineKeyboard()
    .text("Ca A", `${prefix}:A`)
    .text("Ca B", `${prefix}:B`)
    .text("Ca C", `${prefix}:C`);
}

export function eventTypeInlineKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Nghỉ", "etype:leave")
    .text("Tăng ca", "etype:overtime")
    .row()
    .text("Về sớm", "etype:early_leave")
    .text("Đến muộn", "etype:late");
}

export function editWorkerFieldKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Tên", "efield:name")
    .text("Năm sinh", "efield:birth")
    .row()
    .text("Ca", "efield:shift")
    .text("Máy", "efield:machine");
}

export function dateChoiceKeyboard(): Keyboard {
  return new Keyboard()
    .text(BTN.today)
    .row()
    .text(BTN.cancel)
    .resized()
    .oneTime();
}

export function monthChoiceKeyboard(): Keyboard {
  return new Keyboard()
    .text(BTN.thisMonth)
    .row()
    .text(BTN.cancel)
    .resized()
    .oneTime();
}

export function noteKeyboard(): Keyboard {
  return new Keyboard()
    .text(BTN.skipNote)
    .row()
    .text(BTN.cancel)
    .resized()
    .oneTime();
}

export function itemsInlineKeyboard(
  items: { id: string; label: string }[],
  prefix: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  items.forEach((item, i) => {
    kb.text(item.label, `${prefix}:${item.id}`);
    if (i % 2 === 1) kb.row();
  });
  if (items.length % 2 === 1) kb.row();
  return kb;
}

/** @deprecated use itemsInlineKeyboard */
export const workersInlineKeyboard = itemsInlineKeyboard;
