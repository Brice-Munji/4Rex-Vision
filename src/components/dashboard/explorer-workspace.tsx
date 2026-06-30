"use client";

import * as React from "react";
import { AiWorkspace } from "./workspace/ai-workspace";
import { ExplorerLimit } from "./explorer-limit";
import { EndOfDaySummary } from "./end-of-day-summary";
import type { RecordAnalysisResult } from "@/actions/subscription";
import type { Plan } from "@prisma/client";

interface ExplorerWorkspaceProps {
  plan: Plan;
  used: number;
  limit: number;
  unlimited: boolean;
}

export function ExplorerWorkspace({
  plan,
  used,
  limit,
  unlimited,
}: ExplorerWorkspaceProps) {
  const [usedState, setUsedState] = React.useState(used);
  const [summaryOpen, setSummaryOpen] = React.useState(false);

  function handleUsage(res: RecordAnalysisResult) {
    setUsedState(res.used);
    if (!res.unlimited && res.reachedLimit) {
      // Premium end-of-day experience instead of a hard paywall.
      setSummaryOpen(true);
    }
  }

  return (
    <div className="space-y-4">
      {!unlimited && (
        <ExplorerLimit used={usedState} limit={limit} unlimited={unlimited} />
      )}
      <AiWorkspace trackUsage onUsageRecorded={handleUsage} />
      <EndOfDaySummary open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}
