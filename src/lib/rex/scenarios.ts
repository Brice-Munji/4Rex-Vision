import type {
  TrendSection,
  BiasSection,
  ConfidenceMetric,
  EconomicEventItem,
  PriceLevel,
  EvidenceItem,
  PlainEnglishItem,
  EducationalInsight,
  Timeframe,
} from "./types";

export interface Scenario {
  pair: string;
  timeframe: Timeframe;
  headline: string;
  trend: TrendSection;
  bias: BiasSection;
  confidence: ConfidenceMetric[];
  overallConfidence: number;
  economic: EconomicEventItem[];
  priceLevels: PriceLevel[];
  evidence: EvidenceItem[];
  plainEnglish: PlainEnglishItem[];
  insight: EducationalInsight;
}

export const CLOSING_NOTE =
  "Markets are probabilistic. This analysis reflects current market conditions and the information visible in your chart. Always protect your capital and trade with discipline.";

const BULLISH: Scenario = {
  pair: "EUR/USD",
  timeframe: "H1",
  headline: "Buyers are gently in control, but confirmation is still forming.",
  trend: {
    direction: "Uptrend",
    strength: "Moderate",
    timeframe: "H1",
    summary:
      "Price is carving a series of higher highs and higher lows on the H1 chart, pointing to a moderate uptrend that is still developing.",
  },
  bias: {
    bias: "Bullish",
    confidence: 78,
    suggestedDirection: "Wait For Confirmation",
    summary:
      "The lean is bullish, but Rex would wait for a confirmation candle above resistance before considering the move confirmed.",
  },
  overallConfidence: 78,
  confidence: [
    { key: "technical", label: "Technical Structure", score: 82, contributors: ["Higher highs & higher lows intact", "Price holding above the 50-EMA"] },
    { key: "trend", label: "Trend Quality", score: 76, contributors: ["Consistent swing rhythm", "Pullbacks remain shallow"] },
    { key: "pattern", label: "Pattern Recognition", score: 71, contributors: ["Ascending triangle forming", "Compression near resistance"] },
    { key: "economic", label: "Economic Context", score: 58, contributors: ["High-impact USD CPI ahead", "Event risk raises uncertainty"] },
    { key: "volatility", label: "Volatility", score: 64, contributors: ["Range expanding into London session", "ATR slightly above average"] },
    { key: "risk", label: "Risk Assessment", score: 73, contributors: ["Clear invalidation below support", "Favorable 1:2.4 risk-to-reward"] },
  ],
  economic: [
    {
      id: "usd-cpi",
      currency: "USD",
      title: "USD CPI m/m",
      impact: "High",
      time: "13:30",
      expectedVolatility: "Expected increased volatility",
      session: "New York",
      explanation:
        "This event may significantly increase price volatility. Technical analysis can become less reliable immediately before and after the release.",
    },
    {
      id: "eur-ecb",
      currency: "EUR",
      title: "ECB Press Conference",
      impact: "High",
      time: "14:45",
      expectedVolatility: "Sharp swings possible",
      session: "London",
      explanation:
        "Central-bank commentary can move the euro quickly. Spreads may widen and price can whipsaw as the market digests the tone.",
    },
  ],
  priceLevels: [
    { type: "Take Profit", value: "1.0985", description: "Prior swing high — a logical profit target if momentum continues.", position: 92 },
    { type: "Resistance", value: "1.0920", description: "Ceiling capping recent attempts higher; a clean break would be bullish.", position: 72 },
    { type: "Entry", value: "1.0885", description: "Potential entry zone on a confirmed break-and-retest.", position: 54 },
    { type: "Support", value: "1.0840", description: "Floor buyers have defended repeatedly.", position: 32 },
    { type: "Invalidation", value: "1.0805", description: "A close below here would invalidate the bullish idea.", position: 12 },
  ],
  evidence: [
    { key: "hh", label: "Higher highs", explanation: "Each rally is peaking above the last — a hallmark of buyers in control.", icon: "TrendingUp" },
    { key: "hl", label: "Higher lows", explanation: "Pullbacks are bottoming higher each time, showing buyers step in earlier.", icon: "ArrowUpRight" },
    { key: "trendline", label: "Trendline respected", explanation: "Price keeps bouncing from a rising trendline, confirming demand.", icon: "LineChart" },
    { key: "support", label: "Support respected", explanation: "1.0840 has held on multiple tests, marking a reliable floor.", icon: "ShieldCheck" },
    { key: "momentum", label: "Momentum increasing", explanation: "Impulses up are larger than pullbacks, hinting momentum favors buyers.", icon: "Activity" },
    { key: "ma", label: "Moving averages aligned", explanation: "Faster average sits above the slower one, supporting the uptrend read.", icon: "AlignHorizontalDistributeCenter" },
  ],
  plainEnglish: [
    {
      technical: "Bullish Break of Structure forming above 1.0920.",
      plain:
        "Buyers are trying to take control by pushing price above an important recent level. If they succeed and it holds, the upward move may continue.",
      concept: "Break of Structure",
    },
    {
      technical: "Higher highs and higher lows on H1.",
      plain:
        "The market keeps setting new peaks and its dips are getting shallower — a classic sign that buyers are steadily winning.",
      concept: "Trend",
    },
    {
      technical: "Price compressing into an ascending triangle at resistance.",
      plain:
        "Price is coiling tighter just under a ceiling. This often ends with a strong move — a break higher would favor buyers, a rejection would favor sellers.",
      concept: "Candlestick Pattern",
    },
  ],
  insight: {
    title: "Why confirmation candles matter",
    body:
      "A confirmation candle is the market showing you follow-through before you commit. Waiting for one close beyond a level filters out fakeouts — you trade a little later, but with far better odds.",
  },
};

const BEARISH: Scenario = {
  pair: "GBP/USD",
  timeframe: "H4",
  headline: "Sellers have the upper hand while price stays under resistance.",
  trend: {
    direction: "Downtrend",
    strength: "Strong",
    timeframe: "H4",
    summary:
      "The H4 chart shows lower highs and lower lows with expanding downside candles, indicating a strong, established downtrend.",
  },
  bias: {
    bias: "Bearish",
    confidence: 74,
    suggestedDirection: "Sell Favored",
    summary:
      "Momentum favors sellers while price remains capped below resistance. Rex would treat rallies into resistance as the higher-probability area to look for shorts.",
  },
  overallConfidence: 74,
  confidence: [
    { key: "technical", label: "Technical Structure", score: 79, contributors: ["Lower highs & lower lows intact", "Trading below the 50-EMA"] },
    { key: "trend", label: "Trend Quality", score: 80, contributors: ["Clean, persistent downtrend", "Rallies quickly rejected"] },
    { key: "pattern", label: "Pattern Recognition", score: 68, contributors: ["Bearish continuation flag", "Failure to reclaim prior support"] },
    { key: "economic", label: "Economic Context", score: 55, contributors: ["High-impact USD data ahead", "Event risk raises uncertainty"] },
    { key: "volatility", label: "Volatility", score: 70, contributors: ["Expanding bearish ranges", "ATR above average"] },
    { key: "risk", label: "Risk Assessment", score: 69, contributors: ["Invalidation above resistance is clear", "Reasonable 1:2 risk-to-reward"] },
  ],
  economic: [
    {
      id: "usd-nfp",
      currency: "USD",
      title: "USD Non-Farm Payrolls",
      impact: "High",
      time: "13:30",
      expectedVolatility: "Expected sharp volatility",
      session: "New York",
      explanation:
        "NFP is one of the most market-moving releases. Price can move violently in both directions — technicals often break down around the print.",
    },
    {
      id: "gbp-boe",
      currency: "GBP",
      title: "BoE Gov Speaks",
      impact: "Medium",
      time: "16:00",
      expectedVolatility: "Moderate swings possible",
      session: "London",
      explanation:
        "Remarks on policy can nudge the pound. Watch for shifts in tone that the market may extrapolate.",
    },
  ],
  priceLevels: [
    { type: "Invalidation", value: "1.2710", description: "A close above here would invalidate the bearish idea.", position: 90 },
    { type: "Resistance", value: "1.2665", description: "Ceiling where sellers have repeatedly stepped in.", position: 70 },
    { type: "Entry", value: "1.2630", description: "Potential short zone on a rejection from resistance.", position: 52 },
    { type: "Support", value: "1.2560", description: "Nearby floor; losing it opens more downside.", position: 30 },
    { type: "Take Profit", value: "1.2505", description: "Prior swing low — a logical target if selling continues.", position: 10 },
  ],
  evidence: [
    { key: "lh", label: "Lower highs", explanation: "Each bounce is peaking below the last — sellers are pressing.", icon: "TrendingDown" },
    { key: "ll", label: "Lower lows", explanation: "Price keeps making fresh lows, confirming downside control.", icon: "ArrowDownRight" },
    { key: "resistance", label: "Resistance respected", explanation: "1.2665 has rejected price several times, marking a reliable ceiling.", icon: "ShieldCheck" },
    { key: "breakdown", label: "Support broken", explanation: "A former floor gave way and now acts as resistance.", icon: "Unlock" },
    { key: "momentum", label: "Momentum increasing", explanation: "Down-moves are larger than the bounces, favoring sellers.", icon: "Activity" },
    { key: "ma", label: "Moving averages aligned", explanation: "Faster average sits below the slower one, supporting the downtrend.", icon: "AlignHorizontalDistributeCenter" },
  ],
  plainEnglish: [
    {
      technical: "Bearish continuation below reclaimed support.",
      plain:
        "Sellers pushed price under a level buyers were defending, and buyers failed to win it back. That failure often invites more selling.",
      concept: "Market Structure",
    },
    {
      technical: "Lower highs and lower lows on H4.",
      plain:
        "The market keeps setting lower peaks and lower dips — the textbook shape of sellers steadily in charge.",
      concept: "Trend",
    },
    {
      technical: "Rejection wicks at resistance.",
      plain:
        "Every time price rises into the ceiling, it gets slapped back down, leaving long wicks. That's sellers defending their level.",
      concept: "Resistance",
    },
  ],
  insight: {
    title: "Why trends often continue",
    body:
      "Trends persist because participants pile into the prevailing direction and defend it. Until structure clearly breaks, betting on continuation is usually higher-probability than calling the top or bottom.",
  },
};

const NEUTRAL: Scenario = {
  pair: "XAU/USD",
  timeframe: "Daily",
  headline: "The market is balanced — patience beats prediction here.",
  trend: {
    direction: "Sideways",
    strength: "Weak",
    timeframe: "Daily",
    summary:
      "Price is oscillating inside a broad range on the Daily chart with no clear higher-high or lower-low sequence, signalling a weak, indecisive market.",
  },
  bias: {
    bias: "Neutral",
    confidence: 61,
    suggestedDirection: "Wait",
    summary:
      "With price mid-range and direction unclear, Rex favors waiting. The higher-probability trades tend to appear at the range edges, not the middle.",
  },
  overallConfidence: 61,
  confidence: [
    { key: "technical", label: "Technical Structure", score: 60, contributors: ["Range-bound structure", "No decisive break either way"] },
    { key: "trend", label: "Trend Quality", score: 48, contributors: ["Overlapping candles", "No clean swing sequence"] },
    { key: "pattern", label: "Pattern Recognition", score: 55, contributors: ["Possible range/consolidation", "Indecision candles present"] },
    { key: "economic", label: "Economic Context", score: 52, contributors: ["Mixed drivers ahead", "No single dominant catalyst"] },
    { key: "volatility", label: "Volatility", score: 58, contributors: ["Contracting daily ranges", "Energy building for a breakout"] },
    { key: "risk", label: "Risk Assessment", score: 66, contributors: ["Range edges give clear invalidation", "Mid-range entries carry poor reward"] },
  ],
  economic: [
    {
      id: "usd-fomc",
      currency: "USD",
      title: "FOMC Statement",
      impact: "High",
      time: "19:00",
      expectedVolatility: "Expected increased volatility",
      session: "New York",
      explanation:
        "Rate decisions and guidance can set the tone for weeks. Expect sharp, fast moves — waiting until after the dust settles is often wise.",
    },
  ],
  priceLevels: [
    { type: "Resistance", value: "2,395", description: "Top of the range — sellers have defended this repeatedly.", position: 88 },
    { type: "Take Profit", value: "2,378", description: "A measured target for a fade from the range top.", position: 68 },
    { type: "Entry", value: "2,360", description: "Range middle — a low-quality area to enter; patience preferred.", position: 50 },
    { type: "Support", value: "2,330", description: "Bottom of the range where buyers have stepped in.", position: 22 },
    { type: "Invalidation", value: "2,312", description: "A daily close beyond the range would change the picture.", position: 8 },
  ],
  evidence: [
    { key: "range", label: "Range respected", explanation: "Price keeps rotating between a clear top and bottom.", icon: "MoveHorizontal" },
    { key: "overlap", label: "Overlapping candles", explanation: "Candles overlap heavily, signalling indecision and balance.", icon: "Layers" },
    { key: "support", label: "Support respected", explanation: "The range floor has held on multiple tests.", icon: "ShieldCheck" },
    { key: "resistance", label: "Resistance respected", explanation: "The range ceiling continues to reject rallies.", icon: "ShieldCheck" },
    { key: "compression", label: "Volatility compressing", explanation: "Daily ranges are shrinking — energy often precedes a breakout.", icon: "Minimize2" },
  ],
  plainEnglish: [
    {
      technical: "Balanced market inside a defined range.",
      plain:
        "Neither buyers nor sellers are winning right now. Price is bouncing between a floor and a ceiling, so the safest read is to wait for a clear break.",
      concept: "Market Structure",
    },
    {
      technical: "Volatility contraction near the range middle.",
      plain:
        "The market is coiling and getting quiet. Quiet phases usually end with a bigger move — being patient here protects you from getting chopped up.",
      concept: "Liquidity",
    },
  ],
  insight: {
    title: "Why major news increases volatility",
    body:
      "Big releases surprise the market with new information, forcing many traders to reposition at once. That surge of orders widens spreads and creates fast, unpredictable moves — which is why technicals get less reliable around the news.",
  },
};

export const SCENARIOS: Scenario[] = [BULLISH, BEARISH, NEUTRAL];
