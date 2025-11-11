
import { NextResponse } from 'next/server';
import { getAvailableLayouts } from '@/lib/planogram-data';

export async function GET(
  request: Request,
  { params }: { params: { layoutId: string } }
) {
  const layoutId = params.layoutId;
  const layouts = await getAvailableLayouts();
  const layout = layouts[layoutId];

  if (layout) {
    return NextResponse.json({
        id: layoutId,
        name: layout.name,
        width: layout.width,
        height: layout.height,
        layout: layout.layout
    });
  } else {
    return new NextResponse('Layout not found', { status: 404 });
  }
}
