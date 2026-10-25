import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { askBadgePermission, canBadge, showBadge } from "../../app/js/badge.js";

const saved = {};

beforeEach(() => {
  saved.navigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  saved.Notification = Object.getOwnPropertyDescriptor(globalThis, "Notification");
});

afterEach(() => {
  for (const [name, descriptor] of [["navigator", saved.navigator], ["Notification", saved.Notification]]) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});

function fake({ nav, notification } = {}) {
  Object.defineProperty(globalThis, "navigator", { value: nav ?? {}, configurable: true, writable: true });
  if (notification) Object.defineProperty(globalThis, "Notification", { value: notification, configurable: true, writable: true });
  else delete globalThis.Notification;
}

test("canBadge needs navigator.setAppBadge", () => {
  fake({ nav: {} });
  assert.equal(canBadge(), false);
  fake({ nav: { setAppBadge: async () => {} } });
  assert.equal(canBadge(), true);
});

test("showBadge sets the count, clears on zero or when disabled, and is silent without support", () => {
  const calls = [];
  fake({ nav: { setAppBadge: async (n) => calls.push(["set", n]), clearAppBadge: async () => calls.push(["clear"]) } });
  showBadge(7);
  showBadge(0);
  showBadge(5, false);
  assert.deepEqual(calls, [["set", 7], ["clear"], ["clear"]]);
  fake({ nav: {} });
  showBadge(3); // ไม่ error
});

test("showBadge ignores rejected promises from the browser", async () => {
  fake({ nav: { setAppBadge: () => Promise.reject(new Error("denied")), clearAppBadge: () => Promise.reject(new Error("denied")) } });
  showBadge(2);
  showBadge(0);
  await new Promise((resolve) => setTimeout(resolve, 0)); // ถ้าไม่ดักไว้ จะมี unhandled rejection ทำให้เทสต์ล้ม
});

test("permission: unsupported = no, no Notification API = yes, granted/denied/default follow the user", async () => {
  fake({ nav: {} });
  assert.equal(await askBadgePermission(), false);
  fake({ nav: { setAppBadge: async () => {} } });
  assert.equal(await askBadgePermission(), true);
  fake({ nav: { setAppBadge: async () => {} }, notification: { permission: "granted" } });
  assert.equal(await askBadgePermission(), true);
  fake({ nav: { setAppBadge: async () => {} }, notification: { permission: "denied" } });
  assert.equal(await askBadgePermission(), false);
  fake({ nav: { setAppBadge: async () => {} }, notification: { permission: "default", requestPermission: async () => "granted" } });
  assert.equal(await askBadgePermission(), true);
  fake({ nav: { setAppBadge: async () => {} }, notification: { permission: "default", requestPermission: async () => "denied" } });
  assert.equal(await askBadgePermission(), false);
  fake({ nav: { setAppBadge: async () => {} }, notification: { permission: "default", requestPermission: async () => { throw new Error("x"); } } });
  assert.equal(await askBadgePermission(), false);
});
