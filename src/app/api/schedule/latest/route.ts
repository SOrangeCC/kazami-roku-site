import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { weeklySchedules } from "@/db/schema";

export async function GET() {
  ensureTables();

  const manualOverride = db
    .select()
    .from(weeklySchedules)
    .where(eq(weeklySchedules.isManualOverride, true))
    .orderBy(desc(weeklySchedules.publishedAt), desc(weeklySchedules.id))
    .limit(1)
    .get();

  const recent = db
    .select()
    .from(weeklySchedules)
    .orderBy(desc(weeklySchedules.publishedAt), desc(weeklySchedules.id))
    .limit(5)
    .all();

  const latest = manualOverride ?? recent[0] ?? null;
  const history = latest
    ? recent.filter((item) => item.id !== latest.id).slice(0, 4)
    : [];

  return NextResponse.json({
    latest,
    history,
  });
}
