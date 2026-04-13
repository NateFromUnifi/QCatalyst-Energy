import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "NOT SET";
  const keySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Test actual Supabase connection
  let dbStatus = "untested";
  let rowCount = 0;

  if (url !== "NOT SET" && keySet) {
    try {
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const resp = await fetch(`${url}/rest/v1/daily_prices?select=id&limit=5`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        rowCount = data.length;
        dbStatus = "connected";
      } else {
        dbStatus = `error: ${resp.status} ${resp.statusText}`;
      }
    } catch (e) {
      dbStatus = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({
    supabaseUrl: url.substring(0, 30) + "...",
    anonKeySet: keySet,
    dbStatus,
    sampleRows: rowCount,
  });
}
