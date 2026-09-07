import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  estimateJsStackHeadroom,
  recommendPythonRecursionLimit,
  runWithStackBudgetGuard,
  resetStackBudgetFatalForTests,
  FatalPyodideError,
} from "../../stack_budget.ts";

describe("stack_budget", () => {
  beforeEach(() => {
    resetStackBudgetFatalForTests();
  });

  it("recommends a strictly lower recursion limit for worker than window", () => {
    const windowLimit = recommendPythonRecursionLimit({ environment: "window" });
    const workerLimit = recommendPythonRecursionLimit({ environment: "worker" });
    assert.equal(typeof windowLimit, "number");
    assert.equal(typeof workerLimit, "number");
    assert.ok(
      workerLimit < windowLimit,
      `expected worker (${workerLimit}) < window (${windowLimit})`,
    );
  });

  it("headroom probe terminates under maxDepth and stays within the cap", () => {
    const depth = estimateJsStackHeadroom({ maxDepth: 200, timeBudgetMs: 100 });
    assert.ok(Number.isFinite(depth) && depth > 0, `depth=${depth}`);
    assert.ok(depth <= 200, `probe must honor maxDepth=200, got ${depth}`);
  });

  it("converts RangeError into FatalPyodideError and refuses the next call", () => {
    assert.throws(
      () =>
        runWithStackBudgetGuard(() => {
          throw new RangeError("Maximum call stack size exceeded");
        }),
      (err: unknown) =>
        err instanceof FatalPyodideError ||
        (err instanceof Error && err.name === "FatalPyodideError"),
    );
    assert.throws(
      () => runWithStackBudgetGuard(() => 42),
      (err: unknown) =>
        err instanceof FatalPyodideError ||
        (err instanceof Error && err.name === "FatalPyodideError"),
    );
  });
});
