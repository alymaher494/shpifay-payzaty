import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createShopifyOrder } from '@/lib/shopify';

// تحديد بيئة العمل
const PAYZATY_BASE_URL = process.env.PAYZATY_MODE === 'sandbox'
  ? 'https://api.sandbox.payzaty.com'
  : 'https://api.payzaty.com';

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // 1. جلب بيانات العملية من قاعدة البيانات
    const { data: transaction, error: dbError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', reference)
      .single();

    if (dbError || !transaction) {
      return NextResponse.json({ error: 'العملية غير موجودة' }, { status: 404 });
    }

    // منع المعالجة المكررة
    if (transaction.status === 'paid') {
      return NextResponse.json({
        status: 'paid',
        message: 'تم تأكيد الطلب مسبقاً'
      });
    }

    // 2. التحقق من حالة الدفع في Payzaty
    if (!transaction.payzaty_checkout_id) {
      return NextResponse.json({
        status: 'pending',
        message: 'لم يتم الدفع بعد'
      });
    }

    const isSandbox = process.env.PAYZATY_MODE === 'sandbox';
    const accountNo = isSandbox
      ? (process.env.PAYZATY_SANDBOX_ACCOUNT_NO || process.env.PAYZATY_ACCOUNT_NO!)
      : process.env.PAYZATY_ACCOUNT_NO!;
    const secretKey = isSandbox
      ? (process.env.PAYZATY_SANDBOX_SECRET_KEY || process.env.PAYZATY_SECRET_KEY!)
      : process.env.PAYZATY_SECRET_KEY!;

    const payzatyRes = await fetch(
      `${PAYZATY_BASE_URL}/checkout/${transaction.payzaty_checkout_id}`,
      {
        method: 'GET',
        headers: {
          'X-AccountNo': accountNo,
          'X-SecretKey': secretKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const responseText = await payzatyRes.text();
    let payzatyData;
    try {
      payzatyData = JSON.parse(responseText);
    } catch {
      console.error('Payzaty verify response invalid:', responseText);
      return NextResponse.json({
        status: 'unknown',
        message: 'تعذر التحقق من حالة الدفع'
      });
    }

    console.log('[Verify] Payzaty status:', JSON.stringify(payzatyData));

    // 3. التحقق من حالة الدفع
    const paymentStatus = (payzatyData.status || '').toLowerCase();
    const isPaid = paymentStatus === 'paid' || paymentStatus === 'captured' || paymentStatus === 'completed';

    if (isPaid) {
      // تحديث حالة العملية
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'paid' })
        .eq('id', reference);

      // إنشاء الطلب في شوبيفاي
      try {
        await createShopifyOrder(transaction);
        console.log(`[Verify] Shopify order created for transaction: ${reference}`);
      } catch (shopifyErr: any) {
        console.error('[Verify] Shopify order creation failed:', shopifyErr.message);
        // نحدث الحالة على أنها مدفوعة حتى لو فشل إنشاء الطلب
      }

      return NextResponse.json({
        status: 'paid',
        message: 'تم الدفع بنجاح وتم إنشاء الطلب'
      });
    } else {
      return NextResponse.json({
        status: paymentStatus || 'pending',
        message: 'لم يكتمل الدفع بعد'
      });
    }

  } catch (error: any) {
    console.error('Verify Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
