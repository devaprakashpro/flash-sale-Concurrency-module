import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// Lightweight endpoint for fetching stock count only
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getPool();
    const productId = params.id;

    const result = await db.query(
      'SELECT stock FROM products WHERE id = $1',
      [productId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stock: parseInt(result.rows[0].stock),
    });
  } catch (error: any) {
    console.error('Get stock error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


