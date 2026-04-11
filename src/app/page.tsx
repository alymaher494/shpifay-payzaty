'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BridgeContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('جارِ تجهيز بوابة الدفع...');

  useEffect(() => {
    const cartId = searchParams.get('cart_id');
    const amount = searchParams.get('amount');

    if (cartId && amount) {
      initPayment(cartId, amount);
    } else {
      setStatus('عفواً، بيانات الطلب غير مكتملة.');
    }
  }, [searchParams]);

  const initPayment = async (cartId: string, amount: string) => {
    try {
      const res = await fetch('/api/init-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, amount })
      });
      const data = await res.json();
      
      if (data.checkout_url) {
        setStatus('يتم توجيهك الآن...');
        window.location.href = data.checkout_url;
      } else {
        setStatus(`الخطأ: ${data.error || 'رسالة رفض غير معروفة من البوابة'}`);
      }
    } catch (err: any) {
      setStatus(`فشل في الاتصال: ${err.message || 'يرجى المحاولة مرة أخرى.'}`);
    }
  };

  return (
    <>
      <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      <h1 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-wide font-sans drop-shadow-md">Aly Maher Payment Bridge</h1>
      <p className="text-blue-200/80 text-sm font-medium">{status}</p>
    </>
  );
}

export default function LoadingBridge() {
  return (
    <div className="min-h-screen bg-[#001026] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glow effect based on Moysser brand colors */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600 rounded-full blur-[100px] opacity-40"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <Suspense fallback={<div className="text-white">جاري التحميل...</div>}>
            <BridgeContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
