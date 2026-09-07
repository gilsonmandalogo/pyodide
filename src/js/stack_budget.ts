/**
 * Stack budget helpers for recommending Python recursion limits from JS
 * call-stack headroom, and for guarding public API paths against stack overflow.
 *
 * Unit-testable in Node without a full Pyodide / Emscripten rebuild.
 * See also ``src/core/error_handling.ts`` (fatal_error patterns).
 */

export type StackBudgetEnvironment = "window" | "worker" | "node";

export interface RecommendPythonRecursionLimitOptions {
  environment?: StackBudgetEnvironment;
}

export interface EstimateJsStackHeadroomOptions {
  maxDepth?: number;
  timeBudgetMs?: number;
}

/**
 * Fatal error type aligned with ``FatalPyodideError`` in error_handling.ts.
 */
export class FatalPyodideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalPyodideError";
  }
}

let stackBudgetFatal = false;

/** @private test helper */
export function isStackBudgetFatal(): boolean {
  return stackBudgetFatal;
}

/** @private test helper — reset between unit tests only */
export function resetStackBudgetFatalForTests(): void {
  stackBudgetFatal = false;
}

/**
 * Incomplete placeholder: returns a hard-coded constant and does not probe.
 */
export function estimateJsStackHeadroom(
  options: EstimateJsStackHeadroomOptions = {},
): number {
  void options;
  return 8192;
}

/**
 * Incomplete: ignores ``environment`` and returns a flat placeholder.
 */
export function recommendPythonRecursionLimit(
  options: RecommendPythonRecursionLimitOptions = {},
): number {
  void options.environment;
  return 1000;
}

/**
 * Incomplete: calls ``fn`` and rethrows errors unchanged.
 * Does not fatalize stack overflow yet.
 */
export function runWithStackBudgetGuard<T>(fn: () => T): T {
  return fn();
}
