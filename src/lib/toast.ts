import { toast as sonnerToast } from "sonner";

/**
 * App-wide toast helper. It re-exports sonner's `toast` unchanged EXCEPT that
 * `toast.error(...)` is suppressed while the browser is offline.
 *
 * Rationale: when the connection drops, in-flight requests fail and would
 * otherwise stack generic "Could not …" / raw network error toasts. The global
 * offline banner already explains the state, so these are noise. Genuine
 * application/server errors (which only occur while online) still show normally,
 * and every other toast type (success, info, warning, message, promise, …)
 * always passes through.
 */
function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

type SonnerToast = typeof sonnerToast;

const wrapped = Object.assign(
  (...args: Parameters<SonnerToast>) => sonnerToast(...args),
  sonnerToast,
  {
    error: (
      message: Parameters<SonnerToast["error"]>[0],
      data?: Parameters<SonnerToast["error"]>[1]
    ) => {
      if (isOffline()) return undefined as unknown as ReturnType<SonnerToast["error"]>;
      return sonnerToast.error(message, data);
    },
  }
) as SonnerToast;

export { wrapped as toast };
