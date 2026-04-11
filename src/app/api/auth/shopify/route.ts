import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter (e.g. ?shop=your-store.myshopify.com)' }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const scopes = 'write_orders,read_orders'; // Required to create orders after payment
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;
  const state = crypto.randomUUID(); // Optional, but good for security validation

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

  // Redirect the store admin to Shopify to approve the installation
  return NextResponse.redirect(installUrl);
}
