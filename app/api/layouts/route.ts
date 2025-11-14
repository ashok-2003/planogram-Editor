
import { NextResponse } from 'next/server';
import { getAvailableLayouts } from '@/lib/planogram-data';

export async function GET() {
  const layouts = await getAvailableLayouts();
  const layoutList = Object.keys(layouts).map(key => ({
    id: key,
    name: layouts[key].name,
  }));
  return NextResponse.json({ layouts: layoutList });
}
