import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRaw<
    Array<{ class_id: string; class_name: string | null }>
  >(
    Prisma.sql`
      SELECT class_id, class_name
      FROM pclass
      WHERE COALESCE(status, 1) = 1
      ORDER BY class_name ASC NULLS LAST, class_id ASC
    `
  );

  return NextResponse.json({ items: rows });
}

