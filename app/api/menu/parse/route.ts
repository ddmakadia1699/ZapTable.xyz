// POST /api/menu/parse
// Body: multipart/form-data with `file` (image or PDF) and `slug`.
// Reads the menu with Claude vision (or mock) and replaces the restaurant menu.

import { NextResponse } from "next/server";
import { parseMenu } from "@/lib/menu-parse";
import { replaceMenu } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const slug = String(form.get("slug") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}. Upload a photo or PDF.` },
      { status: 400 },
    );
  }

  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await parseMenu(data, file.type);
    const menu = await replaceMenu(slug, result.items);
    if (!menu) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }
    return NextResponse.json({ source: result.source, count: result.items.length, menu });
  } catch (err) {
    console.error("menu parse failed:", err);
    return NextResponse.json(
      { error: "Could not read that menu. Try a clearer photo or PDF." },
      { status: 500 },
    );
  }
}
