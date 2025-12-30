import { getPool } from '@/lib/db';
import { notFound } from 'next/navigation';
import StockDisplay from '@/components/StockDisplay';
import PurchaseButton from '@/components/PurchaseButton';

// Static Generation with ISR - revalidate every 60 seconds
export const revalidate = 60;

async function getProduct(id: string) {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, description, image_url, price FROM products WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="container">
      <div className="product-card">
        <h1 className="product-title">{product.name}</h1>
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-image"
          />
        )}
        <p className="product-description">{product.description}</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          ${parseFloat(product.price).toFixed(2)}
        </p>
        
        {/* Client component for live stock updates */}
        <StockDisplay productId={params.id} />
        
        {/* Client component for purchase button */}
        <PurchaseButton productId={params.id} />
      </div>
    </div>
  );
}

// Generate static params for known products (optional, for better performance)
export async function generateStaticParams() {
  // In production, you might want to fetch all product IDs
  // For now, we'll let Next.js generate pages on-demand
  return [];
}


