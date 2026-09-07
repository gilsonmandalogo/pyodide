import { RUNTIME_ENV } from "./environments";

const scheduleCallbackImmediateMessagePrefix =
  "sched$" + Math.random().toString(36).slice(2) + "$";

const tasks: Record<number, () => void> = {};
let nextTaskHandle = 0;

let sharedChannel: MessageChannel | null = null;
const taskQueue: number[] = [];

/**
 * Cancel handle returned by {@link scheduleCallback}.
 * Call {@link ScheduledCallbackHandle.cancel} to prevent a pending callback
 * from running. Cancel is idempotent; cancel after the callback has already
 * run is a no-op.
 */
export interface ScheduledCallbackHandle {
  cancel(): void;
}

/**
 * Setup global message event listener to handle immediate callbacks
 */
function installPostMessageHandler() {
  if (!RUNTIME_ENV.IN_BROWSER_MAIN_THREAD) {
    return;
  }

  const onGlobalMessage = (event: MessageEvent) => {
    if (
      typeof event.data === "string" &&
      event.data.indexOf(scheduleCallbackImmediateMessagePrefix) === 0
    ) {
      const handle = +event.data.slice(
        scheduleCallbackImmediateMessagePrefix.length,
      );
      const task = tasks[handle];
      if (!task) {
        return;
      }

      try {
        task();
      } finally {
        delete tasks[handle];
      }
    }
  };

  globalThis.addEventListener("message", onGlobalMessage, false);
}

installPostMessageHandler();

function ensureSharedChannel() {
  if (sharedChannel) return;
  if (RUNTIME_ENV.IN_SAFARI || RUNTIME_ENV.IN_DENO || RUNTIME_ENV.IN_NODE)
    return;
  if (typeof globalThis.MessageChannel !== "function") return;

  sharedChannel = new MessageChannel();

  sharedChannel.port1.onmessage = () => {
    // Process tasks that were queued when this message arrived
    const count = taskQueue.length;
    for (let i = 0; i < count; i++) {
      const handle = taskQueue.shift()!;
      const task = tasks[handle];
      if (!task) continue;
      try {
        task();
      } finally {
        delete tasks[handle];
      }
    }
  };
  // Redundant per spec (onmessage auto-starts the port); kept for clarity and potential edge runtimes.
  sharedChannel.port1.start?.();
}

ensureSharedChannel();

function makeCancelHandle(handle: number): ScheduledCallbackHandle {
  return {
    cancel() {
      delete tasks[handle];
    },
  };
}

/**
 * Implementation of zero-delay scheduler for immediate callbacks
 * Try our best to use the fastest method available, based on the current environment.
 * This implementation is based on the following references:
 *   - https://github.com/YuzuJS/setImmediate
 *   - https://github.com/zloirock/core-js/blob/master/packages/core-js/internals/task.js
 * General notes:
 * - Promise.resolve().then() is not a good option. As it uses microtask queue unlike setTimeout which uses macrotask queue
 *   - Ref: https://github.com/YuzuJS/setImmediate/pull/56
 * - MessageChannel is faster (2-3x) than postMessage for Chrome, Firefox, and Node.js
 *   but it has some issues in Safari (slow and messes up the event loop), and Deno.
 *   - Ref: https://github.com/pyodide/pyodide/pull/4583
 *   - Ref: https://github.com/zloirock/core-js/issues/624
 *   - Ref: https://github.com/YuzuJS/setImmediate/issues/80
 */
function scheduleCallbackImmediate(
  callback: () => void,
): ScheduledCallbackHandle {
  if (RUNTIME_ENV.IN_NODE) {
    const handle = nextTaskHandle++;
    setImmediate(callback);
    return makeCancelHandle(handle);
  } else if (sharedChannel) {
    const handle = nextTaskHandle++;
    tasks[handle] = callback;
    taskQueue.push(handle);
    sharedChannel.port2.postMessage(0);
    return makeCancelHandle(handle);
  } else if (
    RUNTIME_ENV.IN_BROWSER_MAIN_THREAD &&
    typeof globalThis.postMessage === "function"
  ) {
    const handle = nextTaskHandle++;
    tasks[handle] = callback;
    globalThis.postMessage(
      scheduleCallbackImmediateMessagePrefix + handle,
      "*",
    );
    return makeCancelHandle(handle);
  } else {
    const handle = nextTaskHandle++;
    setTimeout(callback, 0);
    return makeCancelHandle(handle);
  }
}

/**
 * Schedule a callback. Supports both immediate and delayed callbacks.
 * Returns a handle whose {@link ScheduledCallbackHandle.cancel} method can
 * cancel a still-pending callback.
 * @param callback The callback to be scheduled
 * @param timeout The delay in milliseconds before the callback is called
 * @hidden
 */
export function scheduleCallback(
  callback: () => void,
  timeout: number = 0,
): ScheduledCallbackHandle {
  if (timeout <= 2) {
    // for a very short delay (0, 1), use immediate callback
    return scheduleCallbackImmediate(callback);
  } else {
    const handle = nextTaskHandle++;
    setTimeout(callback, timeout);
    return makeCancelHandle(handle);
  }
}

/**
 * Sleep for the specified number of milliseconds.
 * @param ms The number of milliseconds to sleep
 * @returns A promise that resolves after the specified time
 * @hidden
 */
export function sleep(ms: number) {
  return new Promise<void>((resolve) => scheduleCallback(resolve, ms));
}
