import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createShopifyOrder } from '@/lib/shopify';

export async function POST(req: Request) {
  try {
    // ──────────────────────────────────────────
    // حماية 1: التحقق من عنوان IP أو Secret Header
    // ──────────────────────────────────────────
    const webhookSecret = process.env.PAYZATY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization');
      if (headerSecret !== webhookSecret && headerSecret !== `Bearer ${webhookSecret}`) {
        console.warn('[SECURITY] Unauthorized webhook attempt blocked');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await req.json();

    // ──────────────────────────────────────────
    // حماية 2: التحقق من أن حالة الدفع هي PAID فقط
    // ──────────────────────────────────────────
    if (payload.Status !== 'PAID') {
      return NextResponse.json({ received: true, action: 'ignored - not paid' });
    }

    const reference = payload.Reference;

    // ──────────────────────────────────────────
    // حماية 3: التحقق من وجود العملية في قاعدة البيانات
    // ──────────────────────────────────────────
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id, status')
      .eq('id', reference)
      .single();

    if (!existingTx) {
      console.warn(`[SECURITY] Webhook with unknown reference: ${reference}`);
      return NextResponse.json({ error: 'Unknown transaction' }, { status: 404 });
    }

    // ──────────────────────────────────────────
    // حماية 4: منع معالجة العملية مرتين (Replay Attack)
    // ──────────────────────────────────────────
    if (existingTx.status === 'paid') {
      console.log(`[INFO] Transaction ${reference} already processed, skipping`);
      return NextResponse.json({ received: true, action: 'already processed' });
    }

    // 1. تحديث حالة العملية
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'paid' })
      .eq('id', reference)
      .select()
      .single();

    // 2. إنشاء الطلب في شوبيفاي
    if (transaction) {
      await createShopifyOrder(transaction);
    }

    return NextResponse.json({ received: true, action: 'order created' });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
