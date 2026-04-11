'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BridgeContent() {
  const searchParams = useSearchParams();
  const cartId = searchParams.get('cart_id') || '';
  const amount = searchParams.get('amount') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!cartId || !amount) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">بيانات الطلب غير مكتملة</h2>
        <p className="text-blue-200/70 text-sm">عفواً، لم يتم تمرير بيانات السلة بشكل صحيح.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('جارِ تجهيز بوابة الدفع...');

    try {
      const res = await fetch('/api/init-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, amount, customer: { name, email, phone } })
      });
      const data = await res.json();

      if (data.checkout_url) {
        setStatus('يتم توجيهك لصفحة الدفع الآمنة...');
        window.location.href = data.checkout_url;
      } else {
        setLoading(false);
        setError(data.error || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'فشل في الاتصال بالخادم.');
    }
  };

  return (
    <>
      {/* المبلغ */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-5 py-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="text-blue-300 text-sm font-semibold">المبلغ المطلوب:</span>
          <span className="text-white font-bold text-lg">{amount} SAR</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-8">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
          <p className="text-blue-200/80 text-sm font-medium animate-pulse">{status}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full space-y-4 text-right" dir="rtl">
          {/* الاسم */}
          <div>
            <label htmlFor="name" className="block text-blue-200/90 text-sm font-medium mb-1.5">الاسم الكامل</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
            />
          </div>

          {/* الإيميل */}
          <div>
            <label htmlFor="email" className="block text-blue-200/90 text-sm font-medium mb-1.5">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              dir="ltr"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
            />
          </div>

          {/* رقم الجوال */}
          <div>
            <label htmlFor="phone" className="block text-blue-200/90 text-sm font-medium mb-1.5">رقم الجوال</label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966 5XXXXXXXX"
              dir="ltr"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
            />
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* زر الدفع */}
          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            🔒 متابعة الدفع الآمن
          </button>

          <p className="text-white/30 text-xs text-center mt-3">
            بياناتك محمية ومشفرة بالكامل
          </p>
        </form>
      )}
    </>
  );
}

export default function PaymentBridge() {
  return (
    <div className="min-h-screen bg-[#001026] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600 rounded-full blur-[100px] opacity-30"></div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Logo / Title */}
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 tracking-wide drop-shadow-md">Payzaty Payment</h1>
          <p className="text-blue-200/50 text-xs mb-6">بوابة الدفع الآمنة</p>

          <Suspense fallback={<div className="text-white/50 py-8">جاري التحميل...</div>}>
            <BridgeContent />
          </Suspense>
        </div>
      </div>

      <div className="mt-8 text-slate-600 text-xs font-medium tracking-wider">
        Copyright &copy; {new Date().getFullYear()} Aly Maher
      </div>
    </div>
  );
}
