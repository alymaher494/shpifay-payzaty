import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const PAYZATY_BASE_URL = process.env.PAYZATY_MODE === 'sandbox'
  ? 'https://api.sandbox.payzaty.com'
  : 'https://api.payzaty.com';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  // حماية بكلمة سر
  if (key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    steps: {}
  };

  // ═══════════════════════════════════════
  // الخطوة 1: فحص قاعدة البيانات
  // ═══════════════════════════════════════
  try {
    const { data: txList, error: txErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (txErr) {
      report.steps['1_database'] = { status: '❌', error: txErr.message };
    } else {
      report.steps['1_database'] = {
        status: '✅',
        total: txList?.length || 0,
        latest: txList?.map(t => ({
          id: t.id,
          amount: t.amount,
          status: t.status,
          checkout_id: t.payzaty_checkout_id || '❌ missing',
          has_metadata: !!t.metadata,
          created: t.created_at
        }))
      };
    }

    // ═══════════════════════════════════════
    // الخطوة 2: فحص Payzaty Status Check API
    // ═══════════════════════════════════════
    const latestWithCheckout = txList?.find(t => t.payzaty_checkout_id);

    if (latestWithCheckout) {
      const isSandbox = process.env.PAYZATY_MODE === 'sandbox';
      const accountNo = isSandbox
        ? (process.env.PAYZATY_SANDBOX_ACCOUNT_NO || process.env.PAYZATY_ACCOUNT_NO!)
        : process.env.PAYZATY_ACCOUNT_NO!;
      const secretKey = isSandbox
        ? (process.env.PAYZATY_SANDBOX_SECRET_KEY || process.env.PAYZATY_SECRET_KEY!)
        : process.env.PAYZATY_SECRET_KEY!;

      // محاولة 1: X-AccountNo
      const url1 = `${PAYZATY_BASE_URL}/checkout/${latestWithCheckout.payzaty_checkout_id}`;
      try {
        const res1 = await fetch(url1, {
          method: 'GET',
          headers: {
            'X-AccountNo': accountNo,
            'X-SecretKey': secretKey,
            'Content-Type': 'application/json'
          }
        });
        const text1 = await res1.text();
        report.steps['2_payzaty_check_v1'] = {
          url: url1,
          header: 'X-AccountNo',
          http_status: res1.status,
          response: text1.substring(0, 500)
        };
      } catch (e: any) {
        report.steps['2_payzaty_check_v1'] = { status: '❌', error: e.message };
      }

      // محاولة 2: X-MerchantNo
      try {
        const res2 = await fetch(url1, {
          method: 'GET',
          headers: {
            'X-MerchantNo': accountNo,
            'X-SecretKey': secretKey,
            'Content-Type': 'application/json'
          }
        });
        const text2 = await res2.text();
        report.steps['2_payzaty_check_v2'] = {
          url: url1,
          header: 'X-MerchantNo',
          http_status: res2.status,
          response: text2.substring(0, 500)
        };
      } catch (e: any) {
        report.steps['2_payzaty_check_v2'] = { status: '❌', error: e.message };
      }

      // محاولة 3: checkout/details endpoint
      const url3 = `${PAYZATY_BASE_URL}/checkout/details/${latestWithCheckout.payzaty_checkout_id}`;
      try {
        const res3 = await fetch(url3, {
          method: 'GET',
          headers: {
            'X-AccountNo': accountNo,
            'X-SecretKey': secretKey,
            'Content-Type': 'application/json'
          }
        });
        const text3 = await res3.text();
        report.steps['2_payzaty_check_v3'] = {
          url: url3,
          http_status: res3.status,
          response: text3.substring(0, 500)
        };
      } catch (e: any) {
        report.steps['2_payzaty_check_v3'] = { status: '❌', error: e.message };
      }

    } else {
      report.steps['2_payzaty_check'] = '⚠️ No transactions with checkout_id found';
    }

    // ═══════════════════════════════════════
    // الخطوة 3: فحص Shopify Token
    // ═══════════════════════════════════════
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const { data: tokenRow } = await supabaseAdmin
      .from('store_tokens')
      .select('access_token')
      .eq('shop_domain', shopDomain)
      .single();

    if (tokenRow?.access_token) {
      try {
        const shopRes = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
          headers: { 'X-Shopify-Access-Token': tokenRow.access_token }
        });
        report.steps['3_shopify'] = {
          status: shopRes.ok ? '✅' : '❌',
          http_status: shopRes.status,
          domain: shopDomain
        };
      } catch (e: any) {
        report.steps['3_shopify'] = { status: '❌', error: e.message };
      }
    } else {
      report.steps['3_shopify'] = '❌ No access token found';
    }

    // ═══════════════════════════════════════
    // الخطوة 4: حالة البيئة
    // ═══════════════════════════════════════
    report.steps['4_config'] = {
      mode: process.env.PAYZATY_MODE || 'production',
      base_url: PAYZATY_BASE_URL,
      has_admin_key: !!process.env.ADMIN_SECRET_KEY,
      commission_rate: process.env.COMMISSION_RATE || '0'
    };

  } catch (err: any) {
    report.error = err.message;
  }

  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
}
