import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const startTime = Date.now();

  const report: Record<string, any> = {
    system_status: '🟢 مستقر',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  let failCount = 0;
  let warnCount = 0;

  // ─────────────────────────────────────────────
  // 1. فحص المتغيرات البيئية (Environment Variables)
  // ─────────────────────────────────────────────
  const envChecks: Record<string, { value: string | undefined; required: boolean; masked?: boolean }> = {
    'NEXT_PUBLIC_BASE_URL': { value: process.env.NEXT_PUBLIC_BASE_URL, required: true },
    'SHOPIFY_STORE_DOMAIN': { value: process.env.SHOPIFY_STORE_DOMAIN, required: true },
    'SHOPIFY_CLIENT_ID': { value: process.env.SHOPIFY_CLIENT_ID, required: true, masked: true },
    'SHOPIFY_CLIENT_SECRET': { value: process.env.SHOPIFY_CLIENT_SECRET, required: true, masked: true },
    'PAYZATY_ACCOUNT_NO': { value: process.env.PAYZATY_ACCOUNT_NO, required: true, masked: true },
    'PAYZATY_SECRET_KEY': { value: process.env.PAYZATY_SECRET_KEY, required: true, masked: true },
    'NEXT_PUBLIC_SUPABASE_URL': { value: process.env.NEXT_PUBLIC_SUPABASE_URL, required: true },
    'SUPABASE_KEY': { value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY, required: true, masked: true },
  };

  const envResults: Record<string, string> = {};
  for (const [key, config] of Object.entries(envChecks)) {
    if (config.value) {
      if (config.masked) {
        envResults[key] = `✅ موجود (${config.value.substring(0, 4)}...${config.value.slice(-4)})`;
      } else {
        envResults[key] = `✅ ${config.value}`;
      }
    } else {
      envResults[key] = config.required ? '❌ مفقود (مطلوب!)' : '⚠️ غير موجود (اختياري)';
      if (config.required) failCount++;
    }
  }
  report.checks['1_environment_variables'] = envResults;

  // ─────────────────────────────────────────────
  // 2. فحص الاتصال بقاعدة البيانات (Supabase)
  // ─────────────────────────────────────────────
  const dbChecks: Record<string, string> = {};
  try {
    // فحص جدول transactions
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (txError) {
      dbChecks['transactions_table'] = `❌ خطأ: ${txError.message}`;
      failCount++;
    } else {
      dbChecks['transactions_table'] = `✅ متصل (${txData?.length || 0} عمليات أخيرة)`;
      if (txData && txData.length > 0) {
        dbChecks['latest_transactions'] = JSON.stringify(
          txData.map(t => ({
            id: (t.id as string).substring(0, 8) + '...',
            status: t.status,
            date: t.created_at
          }))
        );
      }
    }

    // فحص جدول store_tokens
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('store_tokens')
      .select('shop_domain, created_at');

    if (tokenError) {
      dbChecks['store_tokens_table'] = `❌ خطأ: ${tokenError.message}`;
      failCount++;
    } else {
      dbChecks['store_tokens_table'] = `✅ متصل (${tokenData?.length || 0} متجر مسجل)`;
      if (tokenData && tokenData.length > 0) {
        dbChecks['registered_stores'] = JSON.stringify(
          tokenData.map(t => ({ store: t.shop_domain, since: t.created_at }))
        );
      }
    }
  } catch (err: any) {
    dbChecks['connection'] = `❌ فشل الاتصال: ${err.message}`;
    failCount++;
  }
  report.checks['2_database'] = dbChecks;

  // ─────────────────────────────────────────────
  // 3. فحص ربط شوبيفاي (Shopify OAuth Token)
  // ─────────────────────────────────────────────
  const shopifyChecks: Record<string, string> = {};
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (shopDomain) {
    shopifyChecks['configured_domain'] = shopDomain;

    try {
      const { data: tokenRow } = await supabaseAdmin
        .from('store_tokens')
        .select('access_token, created_at')
        .eq('shop_domain', shopDomain)
        .single();

      if (tokenRow?.access_token) {
        shopifyChecks['oauth_token'] = `✅ مفعّل (مسجل بتاريخ: ${tokenRow.created_at})`;

        // فحص صلاحية التوكن بطلب خفيف لشوبيفاي
        try {
          const shopifyTest = await fetch(
            `https://${shopDomain}/admin/api/2024-01/shop.json`,
            {
              headers: {
                'X-Shopify-Access-Token': tokenRow.access_token,
                'Content-Type': 'application/json'
              }
            }
          );

          if (shopifyTest.ok) {
            const shopData = await shopifyTest.json();
            shopifyChecks['api_connection'] = `✅ متصل بنجاح`;
            shopifyChecks['store_name'] = shopData.shop?.name || 'غير معروف';
            shopifyChecks['store_email'] = shopData.shop?.email || 'غير معروف';
            shopifyChecks['store_currency'] = shopData.shop?.currency || 'غير معروف';
            shopifyChecks['store_plan'] = shopData.shop?.plan_name || 'غير معروف';
          } else {
            const errText = await shopifyTest.text();
            shopifyChecks['api_connection'] = `❌ فشل (${shopifyTest.status}): ${errText.substring(0, 100)}`;
            failCount++;
          }
        } catch (apiErr: any) {
          shopifyChecks['api_connection'] = `❌ فشل الاتصال: ${apiErr.message}`;
          failCount++;
        }
      } else {
        shopifyChecks['oauth_token'] = '⚠️ التوكن غير موجود - يرجى تثبيت التطبيق أولاً';
        shopifyChecks['install_url'] = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/shopify?shop=${shopDomain}`;
        warnCount++;
      }
    } catch (err: any) {
      shopifyChecks['oauth_check'] = `❌ خطأ: ${err.message}`;
      failCount++;
    }
  } else {
    shopifyChecks['status'] = '❌ SHOPIFY_STORE_DOMAIN غير مضبوط';
    failCount++;
  }
  report.checks['3_shopify_integration'] = shopifyChecks;

  // ─────────────────────────────────────────────
  // 4. فحص بوابة Payzaty
  // ─────────────────────────────────────────────
  const payzatyChecks: Record<string, string> = {};
  if (process.env.PAYZATY_ACCOUNT_NO && process.env.PAYZATY_SECRET_KEY) {
    payzatyChecks['credentials'] = '✅ المفاتيح موجودة';
    payzatyChecks['account_no'] = process.env.PAYZATY_ACCOUNT_NO.substring(0, 4) + '****';
  } else {
    payzatyChecks['credentials'] = '❌ مفاتيح Payzaty مفقودة';
    failCount++;
  }
  report.checks['4_payzaty_gateway'] = payzatyChecks;

  // ─────────────────────────────────────────────
  // 5. فحص الروابط (URLs)
  // ─────────────────────────────────────────────
  const urlChecks: Record<string, string> = {};
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    urlChecks['base_url'] = baseUrl;
    urlChecks['payment_page'] = `${baseUrl}/?cart_id=TEST&amount=5`;
    urlChecks['verify_page'] = `${baseUrl}/verify?reference=TEST`;
    urlChecks['health_check'] = `${baseUrl}/api/health`;
    urlChecks['webhook_endpoint'] = `${baseUrl}/api/webhook/payzaty`;

    if (shopDomain) {
      urlChecks['install_app'] = `${baseUrl}/api/auth/shopify?shop=${shopDomain}`;
    }
  }
  report.checks['5_urls'] = urlChecks;

  // ─────────────────────────────────────────────
  // الملخص النهائي
  // ─────────────────────────────────────────────
  if (failCount > 0) {
    report.system_status = `🔴 يوجد ${failCount} خطأ يجب إصلاحه`;
  } else if (warnCount > 0) {
    report.system_status = `🟡 يعمل ولكن ${warnCount} تحذير`;
  } else {
    report.system_status = '🟢 جميع الأنظمة تعمل بكفاءة';
  }

  report.response_time = `${Date.now() - startTime}ms`;
  report.summary = {
    errors: failCount,
    warnings: warnCount,
    total_checks: Object.keys(envChecks).length + 3 // env vars + db + shopify + payzaty
  };

  return NextResponse.json(report, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' }
  });
}
