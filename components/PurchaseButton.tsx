'use client';

import { useState } from 'react';

interface PurchaseButtonProps {
  productId: string;
}

export default function PurchaseButton({ productId }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handlePurchase() {
    setLoading(true);
    setMessage(null);

    // Get userId from prompt (in real app, this would come from auth)
    const userId = prompt('Enter your user ID:') || 'anonymous';

    try {
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: parseInt(productId),
          userId,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setMessage({
          type: 'error',
          text: `Rate limit exceeded. ${data.message}`,
        });
      } else if (data.success) {
        setMessage({
          type: 'success',
          text: `Purchase successful! Order ID: ${data.order.id}. Remaining stock: ${data.order.remainingStock}`,
        });
        // Refresh stock display
        window.dispatchEvent(new Event('stockUpdate'));
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Purchase failed',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        className="buy-button"
        onClick={handlePurchase}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Buy Now'}
      </button>
      {message && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
          {message.text}
        </div>
      )}
    </div>
  );
}


