import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDefaultHours, getShiftStatus } from "./shiftCalendar.js";

const EPOCH = "2026-08-01";

describe("shiftCalendar epoch 2026-08-01", () => {
  it("matches stated phases on epoch day", () => {
    assert.equal(getShiftStatus("A", EPOCH, EPOCH), "night"); // đêm cuối (N2)
    assert.equal(getShiftStatus("B", EPOCH, EPOCH), "off");
    assert.equal(getShiftStatus("C", EPOCH, EPOCH), "morning"); // sáng đầu (M1)
    assert.equal(getDefaultHours("A", EPOCH, EPOCH), 12);
    assert.equal(getDefaultHours("B", EPOCH, EPOCH), 0);
    assert.equal(getDefaultHours("C", EPOCH, EPOCH), 12);
  });

  it("staggers so each day has one night, one morning, one off", () => {
    const days = [
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ];
    for (const day of days) {
      const statuses = (["A", "B", "C"] as const).map((s) =>
        getShiftStatus(s, day, EPOCH),
      );
      assert.equal(statuses.filter((s) => s === "night").length, 1, day);
      assert.equal(statuses.filter((s) => s === "morning").length, 1, day);
      assert.equal(statuses.filter((s) => s === "off").length, 1, day);
    }
  });

  it("cycles every 6 days", () => {
    assert.equal(getShiftStatus("A", "2026-08-07", EPOCH), "night");
    assert.equal(getShiftStatus("B", "2026-08-07", EPOCH), "off");
    assert.equal(getShiftStatus("C", "2026-08-07", EPOCH), "morning");
  });

  it("A rests on Aug 2 after last night", () => {
    assert.equal(getShiftStatus("A", "2026-08-02", EPOCH), "off");
    assert.equal(getShiftStatus("B", "2026-08-02", EPOCH), "night");
    assert.equal(getShiftStatus("C", "2026-08-02", EPOCH), "morning");
  });
});
