import { NextRequest, NextResponse } from "next/server";

export function verifyAdminToken(req: NextRequest): NextResponse | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN is not configured on the server" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${token}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
