/**
 * Stack budget helpers for recommending Python recursion limits from JS
 * call-stack headroom, and for fatalizing RangeError on public API paths.
 *
 * Unit-testable in Node without a full Pyodide / Emscripten rebuild.
 * See also ``src/core/error_handling.ts`` (fatal_error patterns).
 */

export type StackBudgetEnvironment = "window" | "worker" | "node";

export interface RecommendPythonRecursionLimitOptions {
  /**
   * Host environment. Browser workers typically have less JS stack than the
   * main window thread; recommendations should reflect that.
   */
  environment?: StackBudgetEnvironment;
}

export interface EstimateJsStackHeadroomOptions {
  /** Hard cap on recursive probe depth (safety). */
  maxDepth?: number;
  /** Wall-clock budget for the probe in milliseconds (safety). */
  timeBudgetMs?: number;
}

/**
 * Fatal error type aligned with ``FatalPyodideError`` in error_handling.ts.
 * After a fatal stack failure, subsequent guarded public API calls must throw
 * this rather than proceeding.
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
 * Estimate remaining JS call-stack headroom via a guarded recursive probe.
 *
 * Stub: returns a placeholder constant and does not probe the real stack.
 * A real implementation must terminate (depth / time / RangeError guard) and
 * return a positive finite depth estimate.
 */
export function estimateJsStackHeadroom(
  _options: EstimateJsStackHeadroomOptions = {},
): number {
  // Incomplete: placeholder only — does not measure headroom.
  return 8192;
}

/**
 * Recommend a Python ``sys`` recursion limit for the given JS environment.
 *
 * Stub: ignores ``environment`` and returns a flat placeholder.
 * A real implementation must recommend a strictly lower limit for
 * ``"worker"`` than for ``"window"`` (prompt-visible behaviour).
 */
export function recommendPythonRecursionLimit(
  options: RecommendPythonRecursionLimitOptions = {},
): number {
  // Incomplete: environment is accepted but ignored.
  void options.environment;
  return 1000;
}

/**
 * Run ``fn`` under the stack-budget fatal gate used by runPython-like public
 * API entry points.
 *
 * Intended contract once complete:
 * - If a prior fatal already occurred, throw :js:class:`FatalPyodideError`
 *   immediately (refuse further use).
 * - If ``fn`` throws ``RangeError`` (typical "Maximum call stack size
 *   exceeded"), mark the runtime fatal and throw ``FatalPyodideError``
 *   (do not leave a raw RangeError as the public outcome).
 * - Other exceptions propagate unchanged.
 *
 * Stub: calls through and rethrows raw ``RangeError`` without marking fatal,
 * so subsequent calls are not refused.
 */
export function runWithStackBudgetGuard<T>(fn: () => T): T {
  // Incomplete: should refuse when already fatal, and should convert
  // RangeError into FatalPyodideError while setting the fatal flag.
  // if (stackBudgetFatal) {
  //   throw new FatalPyodideError(
  //     "Pyodide already fatally failed and can no longer be used.",
  //   );
  // }
  try {
    return fn();
  } catch (e) {
    if (e instanceof RangeError) {
      // Not enforced yet — raw RangeError escapes; fatal flag stays clear.
      // stackBudgetFatal = true;
      // throw new FatalPyodideError(
      //   "Pyodide has suffered a fatal error. Please report this to the Pyodide maintainers.",
      // );
      throw e;
    }
    throw e;
  }
}
