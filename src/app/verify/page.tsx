'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || '';
  const [status, setStatus] = useState<'loading' | 'paid' | 'failed'>('loading');
  const [message, setMessage] = useState('جاري التحقق...');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('رابط غير صالح');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference })
        });
        const data = await res.json();

        if (data.status === 'paid') {
          setStatus('paid');
          setMessage('تم الدفع وإنشاء طلبك بنجاح');
        } else if (data.status === 'pending') {
          setTimeout(verify, 3000);
        } else {
          setStatus('failed');
          setMessage(data.message || 'لم يكتمل الدفع');
        }
      } catch {
        setStatus('failed');
        setMessage('تعذر التحقق من الدفع');
      }
    };

    verify();
  }, [reference]);

  return (
    <div className="text-center">
      {status === 'loading' && (
        <>
          <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-white/40 text-xs">{message}</p>
        </>
      )}

      {status === 'paid' && (
        <>
          <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white font-semibold text-lg mb-1">تم الدفع بنجاح</h2>
          <p className="text-white/40 text-xs mb-6">{message}</p>
          <a href="/" className="inline-block w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
            العودة للمتجر
          </a>
        </>
      )}

      {status === 'failed' && (
        <>
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-white font-semibold text-lg mb-1">لم يكتمل الدفع</h2>
          <p className="text-white/40 text-xs mb-6">{message}</p>
          <a href="/" className="inline-block w-full bg-white/5 hover:bg-white/10 text-white font-medium text-sm py-2.5 rounded-lg border border-white/10 transition-colors">
            المحاولة مرة أخرى
          </a>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-[#0f1520] border border-white/[0.06] rounded-2xl p-7">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-white">Payzaty Payment</h1>
        </div>

        <Suspense fallback={<div className="text-white/30 text-center py-8 text-xs">جاري التحميل...</div>}>
          <VerifyContent />
        </Suspense>
      </div>

      <div className="mt-6 text-white/10 text-[10px] tracking-wider">
        © {new Date().getFullYear()} Aly Maher
      </div>
    </div>
  );
}
