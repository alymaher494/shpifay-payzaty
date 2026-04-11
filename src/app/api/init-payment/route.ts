import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    // 1. تسجيل العملية في قاعدة البيانات
    const { data: transaction, error: dbError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        shopify_cart_id: cartId,
        amount: parseFloat(amount),
        status: 'pending',
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone
      }])
      .select()
      .single();

    if (dbError) {
      console.error('DB Error:', dbError);
      throw new Error('فشل في تسجيل العملية في قاعدة البيانات');
    }

    // 2. إرسال الطلب لبوابة Payzaty
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
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        },
        response_url: `${process.env.NEXT_PUBLIC_BASE_URL}/verify?reference=${transaction.id}`,
        cancel_url: `https://${process.env.SHOPIFY_STORE_DOMAIN}/cart`
      })
    });

    const payzatyData = await payzatyRes.json();

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
