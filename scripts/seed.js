require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    // Clear existing data
    await pool.query('TRUNCATE TABLE orders, products RESTART IDENTITY CASCADE');

    // Insert test products
    const products = [
      {
        name: 'Laptop Pro 15',
        description: 'High-performance laptop with 16GB RAM and 512GB SSD. Perfect for developers and professionals.',
        image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500',
        stock: 100, // This will be used for stress testing
        price: 1299.99,
      },
      {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking and long battery life.',
        image_url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
        stock: 25,
        price: 29.99,
      },
      {
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with Cherry MX switches and customizable lighting.',
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
        stock: 15,
        price: 149.99,
      },
      {
        name: '4K Monitor',
        description: '27-inch 4K UHD monitor with HDR support and 144Hz refresh rate.',
        image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
        stock: 8,
        price: 449.99,
      },
      {
        name: 'USB-C Hub',
        description: '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader, and power delivery.',
        image_url: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500',
        stock: 30,
        price: 49.99,
      },
    ];

    for (const product of products) {
      await pool.query(
        `INSERT INTO products (name, description, image_url, stock, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [product.name, product.description, product.image_url, product.stock, product.price]
      );
    }

    // Insert some sample orders for testing admin stats
    const sampleOrders = [
      { user_id: 'user_1', product_id: 1, quantity: 2, total_price: 2599.98 },
      { user_id: 'user_2', product_id: 2, quantity: 1, total_price: 29.99 },
      { user_id: 'user_3', product_id: 1, quantity: 1, total_price: 1299.99 },
      { user_id: 'user_4', product_id: 3, quantity: 3, total_price: 449.97 },
      { user_id: 'user_5', product_id: 2, quantity: 2, total_price: 59.98 },
    ];

    // Insert orders with timestamps spread over the last 7 days
    for (let i = 0; i < sampleOrders.length; i++) {
      const daysAgo = i % 7;
      await pool.query(
        `INSERT INTO orders (user_id, product_id, quantity, total_price, status, created_at)
         VALUES ($1, $2, $3, $4, 'completed', CURRENT_TIMESTAMP - INTERVAL '${daysAgo} days')`,
        [
          sampleOrders[i].user_id,
          sampleOrders[i].product_id,
          sampleOrders[i].quantity,
          sampleOrders[i].total_price,
        ]
      );
    }

    console.log('Database seeded successfully!');
    console.log(`Created ${products.length} products and ${sampleOrders.length} sample orders`);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase();

















































































































































































































































































































































































































































































































































































































































































































































































