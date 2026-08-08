import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscribers } = await admin.supabase
    .from("subscribers")
    .select("email, source, created_at")
    .order("created_at", { ascending: false });

  const rows = [
    "email,source,created_at",
    ...(subscribers ?? []).map(
      (s) => `${csvField(s.email)},${csvField(s.source)},${csvField(s.created_at)}`
    ),
  ];

  return new Response(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="subscribers.csv"',
    },
  });
}
