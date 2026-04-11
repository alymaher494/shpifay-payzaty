import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { cartId, amount } = await req.json();

    // 1. Log to Supabase
    const { data: transaction, error: dbError } = await supabaseAdmin
      .from('transactions')
      .insert([{ shopify_cart_id: cartId, amount: parseFloat(amount), status: 'pending' }])
      .select()
      .single();

    if (dbError) throw new Error('Database logging failed');

    // 2. Call Payzaty
    const payzatyRes = await fetch('https://api.payzaty.com/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AccountNo': process.env.PAYZATY_ACCOUNT_NO!,
        'X-SecretKey': process.env.PAYZATY_SECRET_KEY!
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        currency: "SAR",
        language: "ar",
        reference: transaction.id,
        customer: {
          name: "Shopify Customer",
          email: "customer@domain.com",
          phone: "+966 500000000"
        },
        response_url: `${process.env.NEXT_PUBLIC_BASE_URL}/verify?reference=${transaction.id}`,
        cancel_url: `https://${process.env.SHOPIFY_STORE_DOMAIN}/cart`
      })
    });

    const payzatyData = await payzatyRes.json();
    
    if (!payzatyRes.ok) {
      console.error('--- FULL PAYZATY ERROR ---', payzatyData);
      throw new Error(JSON.stringify(payzatyData) || 'Payzaty API error');
    }

    // 3. Update Payzaty Checkout ID in DB
    await supabaseAdmin
      .from('transactions')
      .update({ payzaty_checkout_id: payzatyData.checkout_id })
      .eq('id', transaction.id);

    return NextResponse.json({ checkout_url: payzatyData.checkout_url });

  } catch (error: any) {
    console.error('Init Payment Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
