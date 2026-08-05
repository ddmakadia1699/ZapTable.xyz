import { NextResponse } from "next/server";
import { addInterestedEmail, deleteInterestedEmail, getInterestedEmails } from "@/lib/interestedStore";

export const runtime = "nodejs";

const ADMIN_PASSWORD = "Dhru@1699dhru";

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const pwdHeader = req.headers.get("x-admin-password");
  const url = new URL(req.url);
  const pwdParam = url.searchParams.get("password");

  const provided = pwdHeader || pwdParam || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
  return provided === ADMIN_PASSWORD;
}

// Public: Submit interest email
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await addInterestedEmail(email);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error submitting interested email:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Admin: Get list of interested emails (Password protected)
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized access. Password required." }, { status: 401 });
  }

  try {
    const emails = await getInterestedEmails();
    return NextResponse.json({ success: true, count: emails.length, emails });
  } catch (err) {
    console.error("Error retrieving interested emails:", err);
    return NextResponse.json({ error: "Failed to fetch interested emails" }, { status: 500 });
  }
}

// Admin: Delete an interest email (Password protected)
export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized access. Password required." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const id = body?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await deleteInterestedEmail(id);
    return NextResponse.json({ success: true, message: "Email removed" });
  } catch (err) {
    console.error("Error deleting interested email:", err);
    return NextResponse.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
