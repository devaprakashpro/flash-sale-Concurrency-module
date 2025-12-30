 import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getPool();
    const productId = params.id;

    const result = await db.query(
      'SELECT id, name, description, image_url, stock, price FROM products WHERE id = $1',
      [productId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    const product = result.rows[0];
    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.image_url,
        stock: parseInt(product.stock),
        price: parseFloat(product.price),
      },
    });
  } catch (error: any) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


