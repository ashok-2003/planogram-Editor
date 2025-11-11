
import { NextResponse } from 'next/server';
import { getAvailableSkus } from '@/lib/planogram-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase();
  const allSkus = await getAvailableSkus();

  if (!query) {
    return NextResponse.json({ skus: allSkus });
  }

  const filteredSkus = allSkus.filter(sku =>
    sku.name.toLowerCase().includes(query)
  );

  return NextResponse.json({ skus: filteredSkus });
}
