import { NextRequest, NextResponse } from "next/server";
import { getCountrySuggestions } from "@/lib/location-suggestions";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  return NextResponse.json({
    options: getCountrySuggestions({
      query: searchParams.get("q"),
      limit: searchParams.get("limit"),
    }),
  });
}
