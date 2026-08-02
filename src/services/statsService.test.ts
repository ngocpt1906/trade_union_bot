import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AttendanceEventDoc } from "../db/models/AttendanceEvent.js";
import { computeDayHours } from "./statsService.js";

const EPOCH = "2026-08-01";

function event(
  type: AttendanceEventDoc["type"],
  minutes: number,
): AttendanceEventDoc {
  return {
    type,
    minutes,
    date: "2026-08-01",
    note: "",
  } as AttendanceEventDoc;
}

describe("computeDayHours", () => {
  it("defaults to 12h on work day and 0 on off day", () => {
    assert.equal(computeDayHours("A", "2026-08-01", [], EPOCH), 12);
    assert.equal(computeDayHours("B", "2026-08-01", [], EPOCH), 0);
  });

  it("subtracts late and early leave", () => {
    const hours = computeDayHours(
      "A",
      "2026-08-01",
      [event("late", 15), event("early_leave", 30)],
      EPOCH,
    );
    assert.equal(hours, 11.25);
  });

  it("leave zeroes the day unless overtime", () => {
    assert.equal(
      computeDayHours("A", "2026-08-01", [event("leave", 0)], EPOCH),
      0,
    );
    assert.equal(
      computeDayHours(
        "A",
        "2026-08-01",
        [event("leave", 0), event("overtime", 120)],
        EPOCH,
      ),
      2,
    );
  });

  it("overtime on rest day counts hours", () => {
    assert.equal(
      computeDayHours("B", "2026-08-01", [event("overtime", 180)], EPOCH),
      3,
    );
  });
});
