import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Activity, RefreshCw, Newspaper, Zap, Play, Square } from 'lucide-react';

interface NewsItem {
  id: string;
  text: string;
  time: string;
  date: string;
}

interface BTCDat {
  price: number;
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  trend: 'bullish' | 'bearish';
}

function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [btcData, setBtcData] = useState<BTCDat | null>(null);
  const [analysisSending, setAnalysisSending] = useState(false);
  const [analysisSent, setAnalysisSent] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Backend'den Verileri Çekme
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [newsRes, btcRes] = await Promise.all([
        fetch('/api/news'),
        fetch('/api/btc-data')
      ]);
      const newsData = await newsRes.json();
      const btcData = await btcRes.json();
      setNews(newsData);
      setBtcData(btcData);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, [fetchData]);

  // Yeni API üzerinden Analiz Gönderme
  const handleGenerateAnalysis = async () => {
    setAnalysisSending(true);
    try {
      const response = await fetch('/api/btc-analysis', { method: 'POST' });
      if (response.ok) {
        setAnalysisSent(true);
        setTimeout(() => setAnalysisSent(false), 3000);
      }
    } catch (err) {
      alert('Analiz gönderilemedi.');
    } finally {
      setAnalysisSending(false);
    }
  };

  // Yeni API üzerinden Haber Gönderme
  const handlePostNews = async (item: NewsItem) => {
    setSendingIds((prev) => new Set(prev).add(item.id));
    try {
      const response = await fetch('/api/news-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsItem: item }),
      });
      if (response.ok) {
        setSentIds((prev) => new Set(prev).add(item.id));
      }
    } catch (err) {
      alert('Haber gönderilemedi.');
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold">Crypto Haber & BTC Analiz</h1>
          <button onClick={fetchData} className="bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2">
            <RefreshCw size={18} /> Yenile
          </button>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Haberler Bölümü */}
          <section className="bg-slate-800 p-6 rounded-2xl">
            <h2 className="text-xl mb-4 flex items-center gap-2"><Newspaper /> Son Dakika</h2>
            {news.map((item) => (
              <div key={item.id} className="mb-4 p-4 bg-slate-700/50 rounded-xl">
                <p className="text-sm mb-2">{item.text}</p>
                <button 
                  onClick={() => handlePostNews(item)}
                  disabled={sentIds.has(item.id)}
                  className={`px-3 py-1 rounded text-xs ${sentIds.has(item.id) ? 'bg-emerald-600' : 'bg-cyan-600'}`}
                >
                  {sentIds.has(item.id) ? 'Gönderildi! 🇹🇷' : 'Telegram\'a Gönder'}
                </button>
              </div>
            ))}
          </section>

          {/* Analiz Bölümü */}
          <section className="bg-slate-800 p-6 rounded-2xl">
            <h2 className="text-xl mb-4 flex items-center gap-2"><TrendingUp /> BTC Analiz</h2>
            {btcData && (
              <div className="space-y-4">
                <p className="text-2xl font-bold">${btcData.price.toLocaleString()}</p>
                <button 
                  onClick={handleGenerateAnalysis}
                  disabled={analysisSending || analysisSent}
                  className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 p-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <Zap /> {analysisSent ? 'Analiz Gönderildi! 🇹🇷' : 'AI Analiz Oluştur ve Gönder'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
