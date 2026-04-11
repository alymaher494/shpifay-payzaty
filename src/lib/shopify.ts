import { supabaseAdmin } from '@/lib/supabase';

export async function createShopifyOrder(transaction: any) {
  // Get token for the configured store
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  
  const { data: storeData } = await supabaseAdmin
    .from('store_tokens')
    .select('access_token')
    .eq('shop_domain', shopDomain)
    .single();

  if (!storeData?.access_token) {
    throw new Error('Shopify access token not found in database for this store. Please install the app first.');
  }

  const shopifyUrl = `https://${shopDomain}/admin/api/2024-01/orders.json`;
  
  const orderPayload = {
    order: {
      financial_status: "paid",
      total_price: transaction.amount,
      currency: "SAR",
      note: `Paid via Payzaty. Transaction ID: ${transaction.id}`
    }
  };

  const res = await fetch(shopifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': storeData.access_token
    },
    body: JSON.stringify(orderPayload)
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error("Shopify Order Error:", errorData);
    throw new Error('Failed to create Shopify order');
  }

  return await res.json();
}
