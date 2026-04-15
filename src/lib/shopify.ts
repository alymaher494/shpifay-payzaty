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

  // استخراج بيانات العميل والشحن من metadata
  let customerData = { name: '', email: '', phone: '' };
  let shippingData = { city: '', district: '', street: '', postalCode: '' };

  try {
    const metadata = typeof transaction.metadata === 'string'
      ? JSON.parse(transaction.metadata)
      : transaction.metadata;

    if (metadata?.customer) customerData = metadata.customer;
    if (metadata?.shipping) shippingData = metadata.shipping;
  } catch {
    console.warn('Could not parse transaction metadata');
  }

  // تقسيم الاسم لأول واسم عائلة
  const nameParts = customerData.name.split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || '-';

  const shopifyUrl = `https://${shopDomain}/admin/api/2024-01/orders.json`;

  const orderPayload = {
    order: {
      financial_status: "paid",
      total_price: transaction.amount,
      currency: "SAR",
      note: `Paid via Payzaty. Transaction ID: ${transaction.id}`,

      // بيانات العميل
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: customerData.email,
        phone: customerData.phone
      },

      // عنوان الشحن
      shipping_address: {
        first_name: firstName,
        last_name: lastName,
        address1: shippingData.street,
        address2: shippingData.district,
        city: shippingData.city,
        zip: shippingData.postalCode,
        country: "SA",
        country_name: "Saudi Arabia",
        phone: customerData.phone
      },

      // عنوان الفوترة (نفس عنوان الشحن)
      billing_address: {
        first_name: firstName,
        last_name: lastName,
        address1: shippingData.street,
        address2: shippingData.district,
        city: shippingData.city,
        zip: shippingData.postalCode,
        country: "SA",
        country_name: "Saudi Arabia",
        phone: customerData.phone
      },

      // بريد التأكيد
      email: customerData.email,
      send_receipt: true,
      send_fulfillment_receipt: true
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
    throw new Error(`Shopify Error: ${errorData}`);
  }

  return await res.json();
}
