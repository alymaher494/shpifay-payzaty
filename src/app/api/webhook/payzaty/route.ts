import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createShopifyOrder } from '@/lib/shopify';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Payzaty typically sends 'Status' and 'Reference' in webhook body
    if (payload.Status === 'PAID') {
      const reference = payload.Reference; 

      // 1. Update DB Status
      const { data: transaction } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'paid' })
        .eq('id', reference)
        .select()
        .single();

      // 2. Trigger Shopify Order Creation
      if (transaction) {
        await createShopifyOrder(transaction);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
