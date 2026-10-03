/**
 * Headless tests for the Rex Coach floating launcher's drag math — the exact
 * exported helpers used by the component (clamp, getDragBounds, resolvePixels,
 * loadStoredPos/savePos), exercised with a mocked window/sessionStorage since
 * there is no DOM test runner in this project (and we deliberately did not add
 * one just for this). Run with:
 *   npx tsx src/components/dashboard/coach/__tests__/launcher.test.ts
 */

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

function setViewport(w: number, h: number) {
  (globalThis as unknown as { window: { innerWidth: number; innerHeight: number } }).window = {
    innerWidth: w,
    innerHeight: h,
  };
}

// Minimal in-memory sessionStorage mock.
function mockSessionStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

async function main() {
  setViewport(1280, 800);
  mockSessionStorage();

  const { clamp, getDragBounds, resolvePixels, loadStoredPos, savePos } = await import(
    "../rex-coach"
  );

  /* ── clamp ──────────────────────────────────────────────────────────────── */
  check("clamp: within range returns unchanged", clamp(5, 0, 10) === 5);
  check("clamp: below min clamps to min", clamp(-5, 0, 10) === 0);
  check("clamp: above max clamps to max", clamp(15, 0, 10) === 10);

  /* ── getDragBounds: keep the whole button on-screen ──────────────────────── */
  {
    setViewport(1280, 800); // desktop
    const b = getDragBounds();
    check("desktop bounds: minX is the edge margin", b.minX === 16);
    check("desktop bounds: maxX leaves room for the 56px button + margin", b.maxX === 1280 - 56 - 16);
    check("desktop bounds: maxY uses the smaller desktop bottom margin (24px)", b.maxY === 800 - 56 - 24);
  }
  {
    setViewport(375, 667); // mobile (iPhone SE-ish, < 1024 breakpoint)
    const b = getDragBounds();
    check("mobile bounds: maxY clears the mobile bottom nav (88px)", b.maxY === 667 - 56 - 88);
    check("mobile bounds: button never exceeds the viewport", b.maxX <= 375 - 56);
  }
  {
    // Pathologically small viewport: bounds must never invert (min > max).
    setViewport(100, 100);
    const b = getDragBounds();
    check("tiny viewport: minX <= maxX (no inversion)", b.minX <= b.maxX);
    check("tiny viewport: minY <= maxY (no inversion)", b.minY <= b.maxY);
  }

  /* ── resolvePixels: edge + ratio -> actual coordinates ────────────────────── */
  {
    setViewport(1280, 800);
    const bounds = getDragBounds();
    const left = resolvePixels({ side: "left", verticalRatio: 0 }, bounds);
    check("resolvePixels: left edge -> minX", left.x === bounds.minX);
    check("resolvePixels: ratio 0 -> minY (top of travel)", left.y === bounds.minY);

    const right = resolvePixels({ side: "right", verticalRatio: 1 }, bounds);
    check("resolvePixels: right edge -> maxX", right.x === bounds.maxX);
    check("resolvePixels: ratio 1 -> maxY (bottom of travel)", right.y === bounds.maxY);

    const mid = resolvePixels({ side: "left", verticalRatio: 0.5 }, bounds);
    const expectedMidY = bounds.minY + 0.5 * (bounds.maxY - bounds.minY);
    check("resolvePixels: ratio 0.5 -> midpoint", Math.abs(mid.y - expectedMidY) < 0.001);
  }

  /* ── Resize safety: re-resolving the SAME stored ratio never goes off-screen ── */
  {
    const pos = { side: "right" as const, verticalRatio: 0.9 };
    setViewport(1280, 800);
    const before = resolvePixels(pos, getDragBounds());
    check("pre-resize: on-screen", before.x >= 0 && before.y >= 0);

    // Shrink drastically (e.g. desktop -> small mobile / orientation change).
    setViewport(320, 480);
    const after = resolvePixels(pos, getDragBounds());
    const b = getDragBounds();
    check(
      "post-resize: still fully within the new, smaller viewport",
      after.x >= b.minX && after.x <= b.maxX && after.y >= b.minY && after.y <= b.maxY
    );
  }

  /* ── loadStoredPos / savePos: persistence round-trip + sane defaults ─────── */
  {
    setViewport(1280, 800);
    mockSessionStorage(); // fresh store
    const fresh = loadStoredPos();
    check("no stored value -> default is bottom-left", fresh.side === "left" && fresh.verticalRatio === 1);

    savePos({ side: "right", verticalRatio: 0.33 });
    const loaded = loadStoredPos();
    check("round-trips side", loaded.side === "right");
    check("round-trips verticalRatio", Math.abs(loaded.verticalRatio - 0.33) < 0.001);
  }
  {
    // Malformed/corrupted storage must never crash or produce an invalid position.
    mockSessionStorage();
    sessionStorage.setItem("rexCoachLauncherPos", "not json");
    const a = loadStoredPos();
    check("corrupted JSON -> safe default (left/1)", a.side === "left" && a.verticalRatio === 1);

    sessionStorage.setItem("rexCoachLauncherPos", JSON.stringify({ side: "up", verticalRatio: 5 }));
    const b = loadStoredPos();
    check("invalid side value -> safe default", b.side === "left" && b.verticalRatio === 1);
  }

  const total = passed + failures.length;
  // eslint-disable-next-line no-console
  console.log(`\nRex Coach launcher tests: ${passed}/${total} passed`);
  if (failures.length) {
    // eslint-disable-next-line no-console
    console.log("FAILURES:\n - " + failures.join("\n - "));
    process.exitCode = 1;
  }
}

main();
