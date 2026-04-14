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
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!cartId || !amount) {
    return (
      <div className="text-center py-10">
        <div className="text-red-400 text-4xl mb-4">✕</div>
        <p className="text-white/80 text-sm">بيانات الطلب غير مكتملة</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('جاري التجهيز...');

    try {
      const res = await fetch('/api/init-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId, amount,
          customer: { name, email, phone },
          shipping: { city, district, street, postalCode }
        })
      });
      const data = await res.json();

      if (data.checkout_url) {
        setStatus('يتم توجيهك للدفع...');
        window.location.href = data.checkout_url;
      } else {
        setLoading(false);
        setError(data.error || 'حدث خطأ، يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'فشل في الاتصال.');
    }
  };

  const inp = "w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/40 transition-colors";
  const lbl = "block text-white/50 text-xs mb-1";

  return (
    <>
      {/* المبلغ */}
      <div className="text-center mb-6">
        <span className="text-white/40 text-xs">المبلغ المطلوب</span>
        <div className="text-white text-2xl font-bold mt-1">{parseFloat(amount).toFixed(2)} <span className="text-sm text-white/40">SAR</span></div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-10">
          <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white/40 text-xs">{status}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3" dir="rtl">

          {/* البيانات الشخصية */}
          <div className="text-white/30 text-[10px] uppercase tracking-widest mb-1">بيانات العميل</div>

          <div>
            <label className={lbl}>الاسم الكامل</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="الاسم ثلاثي" className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" className={inp + " text-left"} />
            </div>
            <div>
              <label className={lbl}>رقم الجوال</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+966 5XXXXXXX" dir="ltr" className={inp + " text-left"} />
            </div>
          </div>

          {/* عنوان الشحن */}
          <div className="border-t border-white/[0.05] pt-3 mt-4">
            <div className="text-white/30 text-[10px] uppercase tracking-widest mb-2">عنوان الشحن</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>المدينة</label>
              <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="الرياض" className={inp} />
            </div>
            <div>
              <label className={lbl}>الحي</label>
              <input type="text" required value={district} onChange={e => setDistrict(e.target.value)} placeholder="حي النرجس" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>العنوان التفصيلي</label>
            <input type="text" required value={street} onChange={e => setStreet(e.target.value)} placeholder="الشارع، رقم المبنى، الشقة" className={inp} />
          </div>

          <div className="w-1/3">
            <label className={lbl}>الرمز البريدي</label>
            <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="12345" dir="ltr" className={inp + " text-left"} />
          </div>

          {/* خطأ */}
          {error && <div className="bg-red-500/10 border border-red-500/15 rounded-lg p-2.5 text-red-300 text-xs text-center">{error}</div>}

          {/* زر الدفع */}
          <button type="submit"
            className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-colors">
            متابعة الدفع الآمن →
          </button>

          <p className="text-white/20 text-[10px] text-center">بياناتك مشفرة بالكامل</p>
        </form>
      )}
    </>
  );
}

export default function PaymentBridge() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0f1520] border border-white/[0.06] rounded-2xl p-7">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white">Payzaty Payment</h1>
          <p className="text-white/30 text-xs mt-0.5">بوابة الدفع الآمنة</p>
        </div>

        <Suspense fallback={<div className="text-white/30 text-center py-8 text-xs">جاري التحميل...</div>}>
          <BridgeContent />
        </Suspense>
      </div>

      <div className="mt-6 text-white/10 text-[10px] tracking-wider">
        © {new Date().getFullYear()} Aly Maher
      </div>
    </div>
  );
}
