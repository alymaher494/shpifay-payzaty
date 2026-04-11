import { NextResponse } from 'next/server';

// هذا الملف محمي - يحتاج مفتاح سري للوصول
// الاستخدام: /api/health?key=YOUR_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  // التحقق من المفتاح السري
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey || key !== adminKey) {
    return NextResponse.json(
      { error: 'غير مصرح بالوصول' },
      { status: 403 }
    );
  }

  // إذا كان المفتاح صحيحاً، يتم عرض حالة مبسطة فقط
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.PAYZATY_MODE || 'production'
  });
}
