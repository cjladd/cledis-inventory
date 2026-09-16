import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { isValidPin, PIN_MIN_LENGTH, PIN_MAX_LENGTH } from "./pin";

describe("isValidPin", () => {
  test("accepts the shortest and longest allowed PINs", () => {
    assert.equal(isValidPin("1".repeat(PIN_MIN_LENGTH)), true);
    assert.equal(isValidPin("1".repeat(PIN_MAX_LENGTH)), true);
  });

  test("rejects PINs outside the length bounds", () => {
    assert.equal(isValidPin("1".repeat(PIN_MIN_LENGTH - 1)), false);
    assert.equal(isValidPin("1".repeat(PIN_MAX_LENGTH + 1)), false);
  });

  test("rejects non-digits", () => {
    assert.equal(isValidPin("12a4"), false);
    assert.equal(isValidPin("    "), false);
    assert.equal(isValidPin(""), false);
  });

  test("rejects a PIN with surrounding whitespace", () => {
    assert.equal(isValidPin(" 1234"), false);
    assert.equal(isValidPin("1234\n"), false);
  });
});
