/**
 * Focused tests for the Synthetic Indices instrument registry (Sprint 1).
 * Pure/deterministic, no DB/network. Run with:
 *   npx tsx src/lib/synthetic/__tests__/instruments.test.ts
 */
import {
  SYNTHETIC_INSTRUMENTS,
  SYNTHETIC_CATEGORIES,
  normalizeSyntheticInstrument,
  lookupSyntheticInstrumentBySymbol,
  listSyntheticInstrumentsByCategory,
  unsupportedReason,
} from "../instruments";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

// 1. Registry invariants — every entry is well-formed and, per Sprint 1's
//    honest verification-status finding, explicitly unverified.
{
  check("1a registry is non-empty", SYNTHETIC_INSTRUMENTS.length > 0);

  const symbols = SYNTHETIC_INSTRUMENTS.map((i) => i.symbol);
  check("1b every symbol is unique", new Set(symbols).size === symbols.length);

  const allUnverified = SYNTHETIC_INSTRUMENTS.every((i) => i.verified === false);
  check("1c every entry is verified:false (live check was unavailable this sprint)", allUnverified);

  const allHaveSourcingNote = SYNTHETIC_INSTRUMENTS.every(
    (i) => typeof i.sourcingNote === "string" && i.sourcingNote.length > 0
  );
  check("1d every entry has a non-empty sourcingNote", allHaveSourcingNote);

  const allCategoriesValid = SYNTHETIC_INSTRUMENTS.every((i) =>
    SYNTHETIC_CATEGORIES.includes(i.category)
  );
  check("1e every entry's category is one of SYNTHETIC_CATEGORIES", allCategoriesValid);

  // Every category requested by the product scope is represented at least once.
  for (const category of SYNTHETIC_CATEGORIES) {
    check(
      `1f category ${category} has at least one registered instrument`,
      SYNTHETIC_INSTRUMENTS.some((i) => i.category === category)
    );
  }
}

// 2. Exact tier/variant counts per family, matching the Sprint 0 spec's
//    §5 confidence findings (this pins the scope decision down so a
//    future accidental addition/removal is caught by a failing test).
{
  const byCategory = (c: string) => SYNTHETIC_INSTRUMENTS.filter((i) => i.category === c).length;
  check("2a Volatility: 5 tiers (10/25/50/75/100)", byCategory("VOLATILITY") === 5);
  check("2b Boom/Crash: 6 (Boom+Crash x 300/500/1000)", byCategory("BOOM_CRASH") === 6);
  check("2c Step: exactly 1 (the classic Step Index only)", byCategory("STEP") === 1);
  check("2d Jump: 5 tiers (10/25/50/75/100)", byCategory("JUMP") === 5);
  check("2e Range Break: exactly 2 (100/200)", byCategory("RANGE_BREAK") === 2);
}

// 3. normalizeSyntheticInstrument() resolves EVERY registered instrument by
//    its display name, every alias, its own symbol, and its
//    derivApiSymbolGuess (when present) — with case/spacing/punctuation
//    noise applied, simulating vision-model transcription variance.
{
  for (const instrument of SYNTHETIC_INSTRUMENTS) {
    const candidates = [
      instrument.displayName,
      instrument.displayName.toUpperCase(),
      instrument.displayName.toLowerCase(),
      instrument.symbol,
      ...instrument.aliases,
      ...instrument.aliases.map((a) => `  ${a}  `), // stray whitespace
      ...instrument.aliases.map((a) => a.replace(/\s+/g, "-")), // hyphenated OCR noise
    ];
    if (instrument.derivApiSymbolGuess) {
      candidates.push(instrument.derivApiSymbolGuess);
      candidates.push(instrument.derivApiSymbolGuess.toLowerCase());
    }

    for (const raw of candidates) {
      const result = normalizeSyntheticInstrument(raw);
      check(
        `3 "${raw}" resolves to ${instrument.symbol}`,
        result !== null && result.symbol === instrument.symbol,
        result ? `got ${result.symbol}` : "got null"
      );
    }
  }
}

// 4. verified is always surfaced as false on a resolved match (the
//    structural "do not trust this yet" signal downstream code must see).
{
  const result = normalizeSyntheticInstrument("Volatility 75 Index");
  check("4 resolved match carries verified:false", result !== null && result.verified === false);
}

// 5. Unrecognized / out-of-registry-scope input returns null, not a guess.
{
  check("5a empty string -> null", normalizeSyntheticInstrument("") === null);
  check("5b null -> null", normalizeSyntheticInstrument(null) === null);
  check("5c undefined -> null", normalizeSyntheticInstrument(undefined) === null);
  check("5d gibberish -> null", normalizeSyntheticInstrument("not a real instrument") === null);
  check(
    "5e out-of-scope real Deriv product (Volatility 150) is NOT silently matched to Volatility 100 or 75",
    normalizeSyntheticInstrument("Volatility 150 Index") === null
  );
  check(
    "5f out-of-scope real Deriv product (Boom 600) is NOT silently matched to Boom 500 or 1000",
    normalizeSyntheticInstrument("Boom 600 Index") === null
  );
}

// 6. Isolation — this registry must NEVER resolve a Forex pair, metal, or
//    traditional index. This is the structural guarantee the Sprint 0 spec
//    (§9) calls the single most important requirement in the whole design.
{
  const forexAndOther = [
    "EURUSD",
    "EUR/USD",
    "XAUUSD",
    "GBPJPY",
    "NAS100",
    "US30",
    "Gold",
    "USD",
  ];
  for (const raw of forexAndOther) {
    check(`6 "${raw}" is NOT recognized by the synthetic registry`, normalizeSyntheticInstrument(raw) === null);
  }
}

// 7. lookupSyntheticInstrumentBySymbol() — exact key lookup, no fuzzing.
{
  const found = lookupSyntheticInstrumentBySymbol("VOLATILITY_75");
  check("7a finds Volatility 75 by exact symbol", found !== null && found.displayName === "Volatility 75 Index");
  check("7b unknown symbol -> null", lookupSyntheticInstrumentBySymbol("NOT_A_SYMBOL") === null);
}

// 8. listSyntheticInstrumentsByCategory() — grouping helper.
{
  const jumps = listSyntheticInstrumentsByCategory("JUMP");
  check("8a all 5 Jump tiers returned", jumps.length === 5);
  check("8b every returned entry really is category JUMP", jumps.every((i) => i.category === "JUMP"));
}

// 9. unsupportedReason() — never throws, echoes the input, lists supported names.
{
  const msg = unsupportedReason("Boom 600 Index");
  check("9a mentions the raw input", msg.includes("Boom 600 Index"));
  check("9b mentions at least one real supported instrument name", msg.includes("Volatility 75 Index"));
}

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nSynthetic instrument registry tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exitCode = 1;
}
