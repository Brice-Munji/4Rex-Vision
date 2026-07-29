import { NextResponse } from "next/server";
import { settleByReference } from "@/lib/payments/settle";

/**
 * Flutterwave payment webhook.
 *
 * Providers call this server-to-server when a payment settles. We authenticate
 * the call with the shared secret hash, then IGNORE the payload's claimed status
 * and re-verify the transaction with the provider before activating anything
 * (`settleByReference`). Secrets live in env only and are never exposed.
 */
export async function POST(req: Request) {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  const signature = req.headers.get("verif-hash");

  // If no hash is configured we can't trust webhooks — reject.
  if (!expected || !signature || signature !== expected) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: { data?: { tx_ref?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const reference = body.data?.tx_ref;
  if (!reference) {
    return NextResponse.json({ error: "missing_reference" }, { status: 400 });
  }

  // Re-verify with the provider and activate only on a real success.
  const outcome = await settleByReference(reference);

  return NextResponse.json({ received: true, outcome });
}
