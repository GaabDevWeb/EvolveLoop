import { test } from "node:test";
import assert from "node:assert/strict";
import { multiply } from "../src/math.js";

test("multiply product", () => {
  assert.equal(multiply(3, 4), 12);
});
