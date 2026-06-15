import { NextRequest, NextResponse } from "next/server";
import { getCitySuggestions } from "@/lib/location-suggestions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const options = await getCitySuggestions({
    authorization: request.headers.get("authorization"),
    country: searchParams.get("country"),
    host,
    limit: searchParams.get("limit"),
    query: searchParams.get("q"),
  });

  return NextResponse.json({ options });
}
