import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createShopifyOrder } from '@/lib/shopify';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const txId = searchParams.get('txId');

  // حماية بكلمة سر
  if (key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!txId) {
    return NextResponse.json({ error: 'Please provide txId' }, { status: 400 });
  }

  try {
    const { data: transaction, error: dbError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', txId)
      .single();

    if (dbError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found', details: dbError }, { status: 404 });
    }

    try {
      const orderRes = await createShopifyOrder(transaction);
      return NextResponse.json({ success: true, message: 'Order created successfully', shopifyResponse: orderRes });
    } catch (shopifyErr: any) {
      return NextResponse.json({ success: false, error: 'Shopify rejected the order', message: shopifyErr.message });
    }

  } catch (err: any) {
    return NextResponse.json({ error: 'System error', message: err.message }, { status: 500 });
  }
}
