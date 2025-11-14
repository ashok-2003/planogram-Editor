
import { NextResponse } from 'next/server';
import { getAvailableSkus } from '@/lib/planogram-data';

export async function GET() {
  const skus = await getAvailableSkus();
  return NextResponse.json({ skus });
}
