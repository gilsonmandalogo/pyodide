import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  estimateJsStackHeadroom,
  recommendPythonRecursionLimit,
  runWithStackBudgetGuard,
  resetStackBudgetFatalForTests,
} from "../../stack_budget.ts";

describe("stack_budget", () => {
  beforeEach(() => {
    resetStackBudgetFatalForTests();
  });

  it("estimateJsStackHeadroom returns a finite number", () => {
    const depth = estimateJsStackHeadroom();
    assert.equal(typeof depth, "number");
    assert.ok(Number.isFinite(depth), `depth=${depth}`);
  });

  it("recommendPythonRecursionLimit returns a finite number", () => {
    const limit = recommendPythonRecursionLimit({ environment: "window" });
    assert.equal(typeof limit, "number");
    assert.ok(Number.isFinite(limit), `limit=${limit}`);
  });

  it("runWithStackBudgetGuard returns the result of a successful fn", () => {
    assert.equal(runWithStackBudgetGuard(() => 7), 7);
  });

  it("runWithStackBudgetGuard propagates non-RangeError thrown by fn", () => {
    assert.throws(
      () =>
        runWithStackBudgetGuard(() => {
          throw new TypeError("boom");
        }),
      (err: unknown) => err instanceof TypeError && err.message === "boom",
    );
  });
});
