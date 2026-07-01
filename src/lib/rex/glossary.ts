import type { ConceptKey } from "./types";

export interface GlossaryEntry {
  term: ConceptKey;
  short: string;
  explanation: string;
  example?: string;
}

/** Plain-language explanations powering the "Explain This" interactions. */
export const GLOSSARY: Record<ConceptKey, GlossaryEntry> = {
  Support: {
    term: "Support",
    short: "A price floor where buyers tend to step in.",
    explanation:
      "Support is a price area where buying interest has been strong enough to stop price from falling further. Think of it as a floor — when price drops to it, buyers often return and push price back up.",
    example: "If a pair keeps bouncing up from 1.0800, that level is acting as support.",
  },
  Resistance: {
    term: "Resistance",
    short: "A price ceiling where sellers tend to step in.",
    explanation:
      "Resistance is a price area where selling pressure has repeatedly stopped price from rising. Think of it as a ceiling — when price climbs into it, sellers often appear and push price back down.",
    example: "If a pair keeps stalling near 1.0950, that level is acting as resistance.",
  },
  Trend: {
    term: "Trend",
    short: "The general direction price is moving over time.",
    explanation:
      "A trend is the overall direction of the market. An uptrend makes higher highs and higher lows, a downtrend makes lower highs and lower lows, and a sideways market stays in a range. Trading with the trend is generally lower risk than trading against it.",
  },
  Liquidity: {
    term: "Liquidity",
    short: "Areas where many orders sit, attracting price.",
    explanation:
      "Liquidity refers to zones where lots of buy or sell orders are clustered — often just beyond obvious highs, lows or round numbers. Price is frequently drawn toward these areas because that's where trades can be filled.",
  },
  "Break of Structure": {
    term: "Break of Structure",
    short: "Price breaks a key level, hinting the trend may shift.",
    explanation:
      "A break of structure happens when price pushes decisively beyond a level that previously held — like a recent high or low. It's an early clue that control may be shifting from sellers to buyers (or vice-versa), though confirmation is still needed.",
  },
  "Market Structure": {
    term: "Market Structure",
    short: "The pattern of highs and lows that defines the trend.",
    explanation:
      "Market structure is the sequence of swing highs and lows price prints. Reading it tells you whether buyers or sellers are in control and whether the current trend is intact or weakening.",
  },
  "Candlestick Pattern": {
    term: "Candlestick Pattern",
    short: "Candle shapes that hint at momentum shifts.",
    explanation:
      "Candlestick patterns are shapes formed by one or more candles (like engulfing candles or pin bars) that can signal a shift in momentum. They are strongest when they appear at meaningful levels such as support or resistance.",
  },
  "Risk Management": {
    term: "Risk Management",
    short: "Protecting your capital on every trade.",
    explanation:
      "Risk management is how you protect your account — deciding your position size, where your stop-loss goes, and your risk-to-reward before entering. Good traders survive by managing risk, not by being right every time.",
  },
};

export const CONCEPT_KEYS = Object.keys(GLOSSARY) as ConceptKey[];
