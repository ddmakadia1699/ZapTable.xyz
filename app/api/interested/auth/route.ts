import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_PASSWORD = "Dhru@1699dhru";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const password = body?.password;

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true, authenticated: true });
    }

    return NextResponse.json({ success: false, error: "Incorrect admin password" }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
