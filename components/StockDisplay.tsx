'use client';

import { useEffect, useState } from 'react';

interface StockDisplayProps {
  productId: string;
}

export default function StockDisplay({ productId }: StockDisplayProps) {
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial stock
    fetchStock();

    // Poll for stock updates every 2 seconds
    const interval = setInterval(fetchStock, 2000);

    return () => clearInterval(interval);
  }, [productId]);

  async function fetchStock() {
    try {
      const response = await fetch(`/api/stock/${productId}`);
      const data = await response.json();
      
      if (data.success) {
        setStock(data.stock);
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && stock === null) {
    return (
      <div className="stock-info">
        <span>Loading stock...</span>
      </div>
    );
  }

  return (
    <div className="stock-info">
      <span>Stock: </span>
      <span className="stock-count">{stock ?? 'N/A'}</span>
      {stock !== null && stock === 0 && (
        <span style={{ color: '#d32f2f', marginLeft: '1rem' }}>Out of Stock</span>
      )}
    </div>
  );
}


