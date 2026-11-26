import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, ensureTables } from "@/db";
import { fanCreations } from "@/db/schema";

export async function GET(req: NextRequest) {
  ensureTables();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize") || 24))
  );

  const conditions = [eq(fanCreations.status, "approved")];
  if (type === "art" || type === "clip") {
    conditions.push(eq(fanCreations.type, type));
  }

  const totalRow = db
    .select({ count: sql<number>`count(*)` })
    .from(fanCreations)
    .where(and(...conditions))
    .get();

  const items = db
    .select()
    .from(fanCreations)
    .where(and(...conditions))
    .orderBy(desc(fanCreations.publishedAt), desc(fanCreations.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  return NextResponse.json({
    total: totalRow?.count ?? 0,
    page,
    pageSize,
    items,
  });
}
