'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || '';
  const [status, setStatus] = useState<'loading' | 'paid' | 'failed'>('loading');
  const [message, setMessage] = useState('جاري التحقق من حالة الدفع...');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('رابط غير صالح');
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference })
        });
        const data = await res.json();

        if (data.status === 'paid') {
          setStatus('paid');
          setMessage('تم الدفع بنجاح وتم إنشاء طلبك!');
        } else if (data.status === 'pending') {
          // أعد المحاولة بعد 3 ثواني (قد يكون الدفع لا يزال قيد المعالجة)
          setTimeout(verifyPayment, 3000);
        } else {
          setStatus('failed');
          setMessage(data.message || 'لم يكتمل الدفع');
        }
      } catch {
        setStatus('failed');
        setMessage('تعذر التحقق من حالة الدفع. يرجى التواصل مع الدعم.');
      }
    };

    verifyPayment();
  }, [reference]);

  const storeDomain = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_STORE_URL || '')
    : '';

  return (
    <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
      {/* Glow effect */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[100px] opacity-30 ${
        status === 'paid' ? 'bg-green-600' : status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
      }`}></div>

      <div className="relative z-10 flex flex-col items-center">

        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
            <h1 className="text-2xl font-bold text-white mb-2">Payzaty Payment</h1>
            <p className="text-blue-200/80 text-sm animate-pulse">{message}</p>
          </>
        )}

        {/* Success */}
        {status === 'paid' && (
          <>
            <div className="w-20 h-20 border-2 border-green-500/50 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payzaty Payment</h1>
            <h2 className="text-xl font-bold text-green-400 mb-3">تمت عملية الدفع بنجاح! ✅</h2>
            <p className="text-blue-100/70 text-sm font-medium mb-4 leading-relaxed">
              نشكرك على تسوقك معنا. تم تأكيد طلبك وإرساله للمتجر.
            </p>
            <p className="text-blue-200/40 text-xs mb-6">
              سيصلك بريد تأكيد على إيميلك المسجل قريباً.
            </p>
            <a href="/" className="w-full inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              العودة للمتجر
            </a>
          </>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <>
            <div className="w-20 h-20 border-2 border-red-500/50 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payzaty Payment</h1>
            <h2 className="text-xl font-bold text-red-400 mb-3">لم يكتمل الدفع ❌</h2>
            <p className="text-blue-100/70 text-sm font-medium mb-6 leading-relaxed">{message}</p>
            <a href="/" className="w-full inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300">
              المحاولة مرة أخرى
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#001026] flex flex-col items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-white/50 py-8">جاري التحميل...</div>
      }>
        <VerifyContent />
      </Suspense>

      <div className="mt-8 text-slate-600 text-xs font-medium tracking-wider">
        Copyright &copy; {new Date().getFullYear()} Aly Maher
      </div>
    </div>
  );
}
