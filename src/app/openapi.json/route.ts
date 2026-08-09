import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi-spec";

// Machine-readable sibling to /llms.txt: that file tells an agent what's
// on this site, this one tells it what it can *do* to the site — the
// same content API documented in docs/API.md, in a shape a tool can
// actually parse rather than just read. Spec itself lives in
// src/lib/openapi-spec.ts, shared with the human-readable reference on
// /how-it-works.
export async function GET() {
  return NextResponse.json(openApiSpec);
}
