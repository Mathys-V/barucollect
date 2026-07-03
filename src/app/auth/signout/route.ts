import { NextResponse } from "next/server";
import { signOut } from "@/app/actions/collection";

export async function POST(request: Request) {
  await signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/fr`, { status: 303 });
}
