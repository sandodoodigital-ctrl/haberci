import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Activity, RefreshCw, Zap } from 'lucide-react';

interface BTCDat {
  price: number;
  info: string;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [btcData, setBtcData] = useState<BTCDat | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      setBtcData({
        price: Math.round(parseFloat(priceData.price) * 100) / 100,
        info: "Sistem her sabah 10:00'da dünya kripto haberlerini otomatik çeker, Türkçeye çevirir ve görsel analiz raporu olarak paylaşır."
      });
    } catch (err) {
      console.error(err);
    } // HATA BURADAYDI, TAMAMEN DÜZELTİLDİ:
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualTrigger = async () => {
    setSending(true);
    setSent(false);
    try {
      // Arka plandaki resimli çalışan backend API'mizi tetikliyoruz
      const res = await fetch('/api/btc-analysis', { method: 'POST' });
      const result = await res.json();

      if (res.ok && result.success) {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } else {
        alert('Gönderim hatası: ' + (result.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      console.error(err);
      alert('İşlem esnasında bir sorun oluştu.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Barbi Analiz Otonom Panel</h1>
              <p className="text-slate-400 mt-1">7/24 Arka Plan Akıllı Haber ve Görsel Analiz Sistemi</p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </header>

        <div className="mb-8 bg-slate-800/50 rounded-2xl border border-slate-700 p-4 h-[400px]">
          <iframe title="TradingView" src="https://s.tradingview.com/widgetembed/?symbol=BINANCE%3ABTCUSDT&interval=D&theme=dark&locale=tr" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0.75rem' }} />
        </div>

        <div className="max-w-md mx-auto bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold">Otonom Bot Durumu</h2>
          </div>

          {btcData && (
            <div className="space-y-4">
              <div className="bg-slate-700/40 p-4 rounded-xl">
                <p className="text-sm text-slate-400">Canlı BTC Fiyatı</p>
                <p className="text-2xl font-bold">${btcData.price.toLocaleString('tr-TR')}</p>
              </div>
              <div className="bg-slate-700/20 p-4 rounded-xl text-xs text-slate-400 leading-relaxed">
                ℹ️ {btcData.info}
              </div>
              <button
                onClick={handleManualTrigger}
                disabled={sending || sent}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-cyan-600/20"
              >
                <Zap className="w-5 h-5" />
                {sending ? 'Haber Çevrilip Paylaşılıyor...' : sent ? 'Başarıyla Kanala Gönderildi! 🇹🇷' : 'Şimdi Haber & Görsel Analiz Gönder'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
