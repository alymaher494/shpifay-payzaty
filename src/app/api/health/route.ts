import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  // كائن لجمع حالة جميع الخدمات
  const diagnostics: Record<string, any> = {
    system_status: "مستقر 🟢",
    time: new Date().toISOString(),
    environment_variables: {
      BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? 'موجود ✅' : 'مفقود ❌',
      SHOPIFY_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN ? 'موجود ✅' : 'مفقود ❌',
      PAYZATY_KEYS: (process.env.PAYZATY_ACCOUNT_NO && process.env.PAYZATY_SECRET_KEY) ? 'موجودة ✅' : 'مفقودة ❌',
      SUPABASE_KEYS: (process.env.NEXT_PUBLIC_SUPABASE_URL) ? 'موجودة ✅' : 'مفقودة ❌',
    },
    database_connection: 'جاري الفحص...',
    shopify_integration: 'جاري الفحص...'
  };

  try {
    // 1. فحص الاتصال بقاعدة البيانات (Supabase)
    const { data: dbData, error: dbError } = await supabaseAdmin.from('transactions').select('id').limit(1);
    
    if (dbError) {
      diagnostics.database_connection = `فشل الاتصال ❌ (${dbError.message})`;
      diagnostics.system_status = "يوجد خطأ 🔴";
    } else {
      diagnostics.database_connection = 'متصل بنجاح ✅';
    }

    // 2. فحص توفر توكن شوبيفاي للمتجر الحالي
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    if (shopDomain) {
      const { data: tokenData } = await supabaseAdmin
        .from('store_tokens')
        .select('access_token')
        .eq('shop_domain', shopDomain)
        .single();
      
      if (tokenData?.access_token) {
        diagnostics.shopify_integration = `التوكن موجود وتم تفعيل الربط ✅ للمتجر: ${shopDomain}`;
      } else {
        diagnostics.shopify_integration = `التوكن غير موجود ⚠️ (يرجى الدخول على رابط تثبيت التطبيق للتفعيل)`;
        diagnostics.system_status = "غير مكتمل 🟡";
      }
    } else {
      diagnostics.shopify_integration = 'لا يوجد دومين محدد للبحث عنه ❌';
    }

  } catch (err: any) {
    diagnostics.system_status = "يوجد خطأ 🔴";
    diagnostics.error_details = err.message;
  }

  return NextResponse.json(diagnostics, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store' // نمنع الكاش ليكون التقرير لحظياً
    }
  });
}
