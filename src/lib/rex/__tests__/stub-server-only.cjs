"use strict";
/**
 * Test-only preload shim (loaded via `node --require`, never shipped/
 * imported by any production file) that neutralizes the "server-only"
 * marker package for plain `tsx` test runs.
 *
 * Why this is needed: "server-only"'s index.js throws UNCONDITIONALLY the
 * moment it's required — it relies on Next.js's bundler setting a
 * "react-server" package.json export condition to resolve to its no-op
 * empty.js instead. Passing `--conditions=react-server` directly to Node
 * also "fixes" server-only, but it has a side effect: React's OWN
 * package.json defines a "react-server" condition too, which resolves to a
 * restricted server-only React build missing client APIs like
 * createContext — anything in the import graph that needs full client React
 * (e.g. next-auth's internals) then crashes. Patching module resolution
 * for ONLY the literal "server-only" specifier avoids that collateral
 * effect entirely; every other package resolves completely normally.
 */
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
