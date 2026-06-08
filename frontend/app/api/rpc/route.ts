import { NextResponse } from "next/server";

const RPC_URL = process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

export async function POST(req: Request) {
  const body = await req.text();
  const resp = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await resp.text();
  return new NextResponse(text, {
    headers: { "Content-Type": "application/json" },
  });
}
