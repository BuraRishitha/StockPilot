import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getDisplayName,
  getTimeGreeting,
  millisecondsUntilNextGreeting,
} from "../stockpilot-frontend/src/greetings.js";

test("dashboard display name preserves the complete authenticated profile name", () => {
  assert.equal(getDisplayName({ fullName: "Bunny Test" }), "Bunny Test");
  assert.equal(getDisplayName({ fullName: "  Rishitha Rao  " }), "Rishitha Rao");
  assert.equal(getDisplayName(null), "Investor");
});

test("greeting periods follow Asia/Kolkata boundaries", () => {
  assert.equal(getTimeGreeting(new Date("2026-10-18T23:29:59.999Z")), "Good night 🌙");
  assert.equal(getTimeGreeting(new Date("2026-10-18T23:30:00.000Z")), "Good morning ☀️");
  assert.equal(getTimeGreeting(new Date("2026-10-19T06:29:59.999Z")), "Good morning ☀️");
  assert.equal(getTimeGreeting(new Date("2026-10-19T06:30:00.000Z")), "Good afternoon 🌤️");
  assert.equal(getTimeGreeting(new Date("2026-10-19T11:29:59.999Z")), "Good afternoon 🌤️");
  assert.equal(getTimeGreeting(new Date("2026-10-19T11:30:00.000Z")), "Good evening 🌆");
  assert.equal(getTimeGreeting(new Date("2026-10-19T15:29:59.999Z")), "Good evening 🌆");
  assert.equal(getTimeGreeting(new Date("2026-10-19T15:30:00.000Z")), "Good night 🌙");
});

test("next greeting timer delay is computed in IST and schedules the next boundary", () => {
  assert.equal(
    millisecondsUntilNextGreeting(new Date("2026-10-18T23:29:59.000Z")),
    1000
  );
  assert.equal(
    millisecondsUntilNextGreeting(new Date("2026-10-18T23:30:00.000Z")),
    7 * 60 * 60 * 1000
  );
  assert.equal(
    millisecondsUntilNextGreeting(new Date("2026-10-19T15:30:00.000Z")),
    8 * 60 * 60 * 1000
  );
});
