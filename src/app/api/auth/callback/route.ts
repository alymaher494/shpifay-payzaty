import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');

  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing shop or OAuth code' }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;

  try {
    // 1. Exchange the Authorization code for a permanent offline Access Token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || 'Token exchange failed');
    }

    const accessToken = tokenData.access_token;

    // 2. Save the permanent token to Supabase for future use
    const { error: dbError } = await supabaseAdmin
      .from('store_tokens')
      .upsert({ 
        shop_domain: shop, 
        access_token: accessToken 
      }, { onConflict: 'shop_domain' });

    if (dbError) throw dbError;

    // Return a success page or redirect back to Shopify Admin
    return NextResponse.json({ success: true, message: `App installed and authenticated successfully for ${shop}` });
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
