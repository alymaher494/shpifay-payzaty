export default function VerifyPage({ searchParams }: { searchParams: { reference?: string } }) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || '';
  const storeUrl = `https://${storeDomain}`;

  return (
    <div className="min-h-screen bg-[#001026] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Green Glow effect for success */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-green-600 rounded-full blur-[100px] opacity-30"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 border-2 border-green-500/50 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-wide font-sans drop-shadow-md">Aly Maher Payment Bridge</h1>
          <h2 className="text-xl font-bold text-green-400 mb-3">تمت عملية الدفع بنجاح!</h2>
          <p className="text-blue-100/70 text-sm font-medium mb-8 text-center leading-relaxed">
            نشكرك على تسوقك معنا. تم تأكيد طلبك وإرساله للمتجر بنجاح.
          </p>

          <a 
            href={storeUrl} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
          >
            العودة للمتجر الرئيسي
          </a>
        </div>
      </div>
    </div>
  );
}
