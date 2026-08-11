import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAnalysisHistory } from "@/lib/rex/history";

// Always fresh — the history list polls this to auto-update without a reload.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await getAnalysisHistory(session.user.id);
  return NextResponse.json(
    { records },
    { headers: { "Cache-Control": "no-store" } }
  );
}
