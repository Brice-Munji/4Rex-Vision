"use client";

import * as React from "react";
import { AiWorkspace } from "./workspace/ai-workspace";
import { ExplorerLimit } from "./explorer-limit";
import { WhatsNext } from "@/components/rex/whats-next";
import type { RecordAnalysisResult } from "@/actions/subscription";
import type { Plan } from "@prisma/client";

interface ExplorerWorkspaceProps {
  plan: Plan;
  used: number;
  limit: number;
  unlimited: boolean;
}

export function ExplorerWorkspace({
  used,
  limit,
  unlimited,
}: ExplorerWorkspaceProps) {
  const [usedState, setUsedState] = React.useState(used);
  const [whatsNextOpen, setWhatsNextOpen] = React.useState(false);

  const reached = !unlimited && limit > 0 && usedState >= limit;

  function handleUsage(res: RecordAnalysisResult) {
    setUsedState(res.used);
  }

  return (
    <div className="space-y-4">
      {!unlimited && (
        <ExplorerLimit used={usedState} limit={limit} unlimited={unlimited} />
      )}
      <AiWorkspace
        trackUsage
        blocked={reached}
        onBlocked={() => setWhatsNextOpen(true)}
        onUsageRecorded={handleUsage}
      />
      <WhatsNext open={whatsNextOpen} onClose={() => setWhatsNextOpen(false)} />
    </div>
  );
}
