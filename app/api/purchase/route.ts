import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { rateLimitMiddleware } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, userId, quantity = 1 } = body;

    // Check rate limit after extracting userId (5 purchases per user per minute)
    const rateLimitResponse = await rateLimitMiddleware(req, 5, 60000, userId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    if (!productId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Missing productId or userId' },
        { status: 400 }
      );
    }

    const db = getPool();

    // Use database transaction with row-level locking (SELECT FOR UPDATE)
    // This ensures only one transaction can read and update the stock at a time
    const result = await db.query('BEGIN');

    try {
      // Lock the product row for update - this prevents concurrent modifications
      const productResult = await db.query(
        'SELECT id, stock, price, name FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (productResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { success: false, message: 'Product not found' },
          { status: 404 }
        );
      }

      const product = productResult.rows[0];
      const currentStock = parseInt(product.stock);
      const price = parseFloat(product.price);

      if (currentStock < quantity) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { success: false, message: 'Out of stock' },
          { status: 200 } // Return 200 with error message as per requirements
        );
      }

      // Update stock atomically within the transaction
      const newStock = currentStock - quantity;
      await db.query(
        'UPDATE products SET stock = $1 WHERE id = $2',
        [newStock, productId]
      );

      // Create order record
      const totalPrice = price * quantity;
      const orderResult = await db.query(
        `INSERT INTO orders (user_id, product_id, quantity, total_price, status)
         VALUES ($1, $2, $3, $4, 'completed')
         RETURNING id, created_at`,
        [userId, productId, quantity, totalPrice]
      );

      // Commit the transaction
      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Purchase successful',
        order: {
          id: orderResult.rows[0].id,
          productId,
          productName: product.name,
          quantity,
          totalPrice,
          remainingStock: newStock,
          createdAt: orderResult.rows[0].created_at,
        },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

