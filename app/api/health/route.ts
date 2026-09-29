import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      { status: "success", message: "Database connection successful" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error checking database connection:", error);
    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 503 },
    );
  }
}
