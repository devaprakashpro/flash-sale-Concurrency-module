import Link from 'next/link';
import { getPool } from '@/lib/db';

async function getProducts() {
  const db = getPool();
  const result = await db.query(
    'SELECT id, name, description, image_url, price FROM products ORDER BY id'
  );
  return result.rows;
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="container">
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Products</h1>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {products.map((product: any) => (
          <Link key={product.id} href={`/products/${product.id}`}>
            <div className="product-card" style={{ cursor: 'pointer' }}>
              <h2 className="product-title">{product.name}</h2>
              <p className="product-description">{product.description}</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                ${parseFloat(product.price).toFixed(2)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


