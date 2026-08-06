import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { BTN } from "../shared/labels.js";

export { BTN };

type Row = ActionRowBuilder<MessageActionRowComponentBuilder>;

function button(customId: string, label: string, style = ButtonStyle.Secondary): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label.slice(0, 80))
    .setStyle(style);
}

export function mainMenuRows(): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("menu:addWorker", BTN.addWorker, ButtonStyle.Primary),
      button("menu:listWorkers", BTN.listWorkers),
      button("menu:editWorker", BTN.editWorker),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("menu:deactivate", BTN.deactivate, ButtonStyle.Danger),
      button("menu:addEvent", BTN.addEvent, ButtonStyle.Primary),
      button("menu:deleteEvent", BTN.deleteEvent),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("menu:statsMonth", BTN.statsMonth, ButtonStyle.Success),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("menu:addMachine", BTN.addMachine),
      button("menu:listMachines", BTN.listMachines),
      button("menu:editMachine", BTN.editMachine),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("menu:deleteMachine", BTN.deleteMachine, ButtonStyle.Danger),
    ),
  ];
}

export function cancelRow(): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("menu:cancel", BTN.cancel, ButtonStyle.Danger),
    ),
  ];
}

export function todayCancelRows(): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("date:today", BTN.today, ButtonStyle.Primary),
      button("menu:cancel", BTN.cancel, ButtonStyle.Danger),
    ),
  ];
}

export function monthCancelRows(): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("month:this", BTN.thisMonth, ButtonStyle.Primary),
      button("menu:cancel", BTN.cancel, ButtonStyle.Danger),
    ),
  ];
}

export function noteCancelRows(): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("note:skip", BTN.skipNote, ButtonStyle.Secondary),
      button("menu:cancel", BTN.cancel, ButtonStyle.Danger),
    ),
  ];
}

export function shiftRows(prefix: string): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button(`${prefix}:A`, "Ca A", ButtonStyle.Primary),
      button(`${prefix}:B`, "Ca B", ButtonStyle.Primary),
      button(`${prefix}:C`, "Ca C", ButtonStyle.Primary),
    ),
    ...cancelRow(),
  ];
}

export function eventTypeRows(): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("etype:leave", "Nghỉ"),
      button("etype:overtime", "Tăng ca"),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("etype:early_leave", "Về sớm"),
      button("etype:late", "Đến muộn"),
    ),
    ...cancelRow(),
  ];
}

export function editWorkerFieldRows(): Row[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("efield:name", "Tên"),
      button("efield:birth", "Năm sinh"),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("efield:shift", "Ca"),
      button("efield:machine", "Máy"),
    ),
    ...cancelRow(),
  ];
}

/** Discord select menus allow max 25 options. */
export function itemSelectRows(
  items: { id: string; label: string }[],
  customId: string,
  placeholder: string,
): Row[] {
  const options = items.slice(0, 25).map((item) => ({
    label: item.label.slice(0, 100),
    value: item.id.slice(0, 100),
  }));
  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder.slice(0, 150))
        .addOptions(options),
    ),
    ...cancelRow(),
  ];
}
