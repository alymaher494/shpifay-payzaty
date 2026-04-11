import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// نسبة العمولة (يتم التحكم فيها من المتغيرات البيئية)
// مثال: 1.5 تعني 1.5%
const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '0');

// تحديد بيئة العمل: sandbox أو production
const PAYZATY_BASE_URL = process.env.PAYZATY_MODE === 'sandbox'
  ? 'https://api.sandbox.payzaty.com'
  : 'https://api.payzaty.com';

export async function POST(req: Request) {
  try {
    const { cartId, amount, customer } = await req.json();

    // التحقق من بيانات العميل
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json(
        { error: 'يرجى إدخال جميع بيانات العميل (الاسم، البريد الإلكتروني، رقم الجوال)' },
        { status: 400 }
      );
    }

    // حساب المبلغ مع العمولة
    const originalAmount = parseFloat(amount);
    const commissionAmount = COMMISSION_RATE > 0
      ? parseFloat((originalAmount * COMMISSION_RATE / 100).toFixed(2))
      : 0;
    const totalAmount = parseFloat((originalAmount + commissionAmount).toFixed(2));

    // 1. تسجيل العملية في قاعدة البيانات
    const { data: transaction, error: dbError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        shopify_cart_id: cartId,
        amount: originalAmount,
        status: 'pending'
      }])
      .select()
      .single();

    if (dbError) {
      console.error('DB Error:', dbError);
      throw new Error('فشل في تسجيل العملية في قاعدة البيانات');
    }

    console.log(`[Payment] Cart: ${cartId} | Original: ${originalAmount} SAR | Commission: ${commissionAmount} SAR (${COMMISSION_RATE}%) | Total charged: ${totalAmount} SAR | Mode: ${process.env.PAYZATY_MODE || 'production'}`);

    // 2. إرسال الطلب لبوابة Payzaty
    const isSandbox = process.env.PAYZATY_MODE === 'sandbox';
    const accountNo = isSandbox
      ? (process.env.PAYZATY_SANDBOX_ACCOUNT_NO || process.env.PAYZATY_ACCOUNT_NO!)
      : process.env.PAYZATY_ACCOUNT_NO!;
    const secretKey = isSandbox
      ? (process.env.PAYZATY_SANDBOX_SECRET_KEY || process.env.PAYZATY_SECRET_KEY!)
      : process.env.PAYZATY_SECRET_KEY!;

    const payzatyRes = await fetch(`${PAYZATY_BASE_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AccountNo': accountNo,
        'X-SecretKey': secretKey
      },
      body: JSON.stringify({
        amount: totalAmount,
        currency: "SAR",
        language: "ar",
        reference: transaction.id,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        },
        response_url: `${process.env.NEXT_PUBLIC_BASE_URL}/verify?reference=${transaction.id}`,
        cancel_url: `https://${process.env.SHOPIFY_STORE_DOMAIN}/cart`
      })
    });

    // معالجة الرد - مع حماية ضد الردود الفارغة
    const responseText = await payzatyRes.text();
    let payzatyData;
    try {
      payzatyData = JSON.parse(responseText);
    } catch {
      console.error('--- PAYZATY EMPTY/INVALID RESPONSE ---', responseText);
      throw new Error(
        isSandbox
          ? 'بيئة Sandbox لا تستجيب. يرجى التبديل إلى وضع Production أو استخدام مفاتيح Sandbox صحيحة.'
          : 'بوابة الدفع أرجعت رداً غير صالح. يرجى المحاولة لاحقاً.'
      );
    }

    if (!payzatyRes.ok) {
      console.error('--- FULL PAYZATY ERROR ---', payzatyData);
      throw new Error(payzatyData.error_text || payzatyData.error || 'خطأ من بوابة الدفع');
    }

    // 3. تحديث معرف الدفع في قاعدة البيانات
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
