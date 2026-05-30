import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, TrendingUp, Activity, RefreshCw, Newspaper, BarChart3, Zap, Play, Square } from 'lucide-react';

// Artık BOT_TOKEN, NEWS_SOURCE gibi gizli bilgiler burada yok! 
// Onları Vercel Environment Variables kısmına veya API içinde tutacaksın.

function App() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [btcData, setBtcData] = useState(null);
  const [sendingIds, setSendingIds] = useState(new Set());
  const [sentIds, setSentIds] = useState(new Set());
  const [analysisSending, setAnalysisSending] = useState(false);
  const [analysisSent, setAnalysisSent] = useState(false);

  // Verileri Backend'den Çekme
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Vercel'deki API endpointlerinle eşleşiyor
      const [newsRes, btcRes] = await Promise.all([fetch('/api/get-news'), fetch('/api/get-btc-data')]);
      setNews(await newsRes.json());
      setBtcData(await btcRes.json());
    } catch (err) {
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manuel Haber Paylaşım (Backend'e yönlendirildi)
  const handlePostNews = async (item) => {
    setSendingIds((prev) => new Set(prev).add(item.id));
    try {
      const response = await fetch('/api/post-news', {
        method: 'POST',
        body: JSON.stringify({ newsItem: item }),
      });
      if (response.ok) setSentIds((prev) => new Set(prev).add(item.id));
    } catch (err) {
      alert('Haber gönderilemedi.');
    } finally {
      setSendingIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  };

  // Analiz Tetikleme (Backend'e yönlendirildi)
  const handleGenerateAnalysis = async () => {
    setAnalysisSending(true);
    try {
      const response = await fetch('/api/post-analysis', { method: 'POST' });
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

  return (
    // Burası senin arayüzün (eskisi.txt'deki tasarımın aynısı kalıyor)
    // Sadece butonlarda onClick={handlePostNews} ve onClick={handleGenerateAnalysis} olacak.
    // Artık 'setInterval' ile zamanlayıcı kurmadık, backend'de cron kullanacağız.
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Tasarım kodlarını buraya olduğu gibi yapıştır */}
    </div>
  );
}

export default App;
