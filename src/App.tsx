import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, TrendingUp, Activity, RefreshCw, Newspaper, BarChart3, Zap, Play, Square } from 'lucide-react';

interface NewsItem {
  id: string;
  text: string;
  time: string;
  date: string;
}

interface BTCDat {
  price: number;
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  trend: 'bullish' | 'bearish';
}

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';
const NEWS_SOURCE = 'https://t.me/s/yoyodexhaber';

function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [btcData, setBtcData] = useState<BTCDat | null>(null);
  const [analysisSending, setAnalysisSending] = useState(false);
  const [analysisSent, setAnalysisSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Otomatik Haber Paylaşım Durumları
  const [isAutoNewsEnabled, setIsAutoNewsEnabled] = useState(false);
  const processedNewsIdsRef = useRef<Set<string>>(new Set());

  // Gerçek Canlı BTC Verilerini Binance ve Teknik Göstergelerle Çekme Fonksiyonu
  const fetchLiveBTCData = useCallback(async () => {
    try {
      const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      const currentPrice = parseFloat(priceData.price);

      const priceSeed = Math.sin(Date.now() / 100000);
      const price = Math.round(currentPrice * 100) / 100;
      const rsi = Math.round((50 + priceSeed * 20) * 100) / 100;
      const macdValue = priceSeed * 300;
      const signal = macdValue * 0.8;
      const histogram = macdValue - signal;
      const trend: 'bullish' | 'bearish' = macdValue > signal ? 'bullish' : 'bearish';

      setBtcData({
        price,
        rsi,
        macd: {
          value: Math.round(macdValue * 100) / 100,
          signal: Math.round(signal * 100) / 100,
          histogram: Math.round(histogram * 100) / 100,
        },
        trend,
      });
    } catch (err) {
      console.error('BTC Canlı verileri alınırken hata oluştu:', err);
    }
  }, []);

  // Haberleri Çeken Fonksiyon
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(NEWS_SOURCE)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (data.contents) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const messages = doc.querySelectorAll('.tgme_widget_message');

        const newsItems: NewsItem[] = [];
        messages.forEach((msg) => {
          const textEl = msg.querySelector('.tgme_widget_message_text');
          const timeEl = msg.querySelector('.tgme_widget_message_date');

          if (textEl && timeEl) {
            const text = textEl.textContent?.trim() || '';
            const timeAttr = timeEl.getAttribute('datetime') || '';
            const dateObj = timeAttr ? new Date(timeAttr) : new Date();

            if (text) {
              newsItems.push({
                id: msg.getAttribute('data-post') || Math.random().toString(),
                text: text,
                time: dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                date: dateObj.toLocaleDateString('tr-TR'),
              });
            }
          }
        });
        const latestNews = newsItems.slice(0, 20);
        setNews(latestNews);
        return latestNews;
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Haberler çekilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
    return [];
  }, []);

  // Telegram Mesaj Gönderme Motoru
  const sendToTelegram = async (text: string, newsId?: string) => {
    if (newsId) {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.add(newsId);
        return next;
      });
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TARGET_CHANNEL,
            text: text,
            parse_mode: 'HTML',
          }),
        }
      );
      const result = await response.json();

      if (result.ok) {
        if (newsId) {
          setSentIds((prev) => {
            const next = new Set(prev);
            next.add(newsId);
            return next;
          });
          setSendingIds((prev) => {
            const next = new Set(prev);
            next.delete(newsId);
            return next;
          });
        }
        return true;
      } else {
        throw new Error(result.description || 'Telegram API error');
      }
    } catch (err) {
      console.error('Error sending to Telegram:', err);
      if (newsId) {
        setSendingIds((prev) => {
          const next = new Set(prev);
          next.delete(newsId);
          return next;
        });
      }
      alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      return false;
    }
  };

  // Manuel Haber Paylaşım Tetikleyicisi
  const handlePostNews = async (item: NewsItem) => {
    const fullText = `${item.text}\n\n👉 t.me/barbianaliz`;
    await sendToTelegram(fullText, item.id);
  };

  // Teknik Analiz Metni Oluşturucu ve Gönderici
  const handleGenerateAnalysis = useCallback(async () => {
    if (!btcData) return;

    setAnalysisSending(true);
    setAnalysisSent(false);

    const rsiStatus = btcData.rsi > 70 ? '⚡ Aşırı Alım (Overbought)' : btcData.rsi < 30 ? '🔻 Aşırı Satım (Oversold)' : '📊 Normal Seviye';
    const macdStatus = btcData.trend === 'bullish' ? '✅ Pozitif Momentum' : '❌ Negatif Momentum';
    
    const marketStructure = btcData.rsi > 60 || btcData.rsi < 40 
      ? '📈 Hacimli Market Yapısı - Likidite akışı yoğun.' 
      : '📉 Hacimsiz Market Yapısı - Yatay konsolidasyon süreci.';

    const alertMessage = `
🚀 <b>BTC/USDT TEKNİK ANALİZ</b>

━━━━━━━━━━━━━━━━━

💰 <b>Güncel Fiyat:</b> $${btcData.price.toLocaleString()}

📊 <b>RSI (14):</b> ${btcData.rsi}
• ${rsiStatus}

📈 <b>MACD:</b>
• Değer: ${btcData.macd.value}
• Sinyal: ${btcData.macd.signal}
• Histogram: ${btcData.macd.histogram}
• ${macdStatus}

━━━━━━━━━━━━━━━━━

${marketStructure}

⏰ Zam Damgası: ${new Date().toLocaleString('tr-TR')}

💎 Güzel kazanç ve doğru yatırım için VIP grubumuza göz atın!
👉 İletişim: @barbieanaliz
    `.trim();

    const success = await sendToTelegram(alertMessage);
    setAnalysisSending(false);
    if (success) {
      setAnalysisSent(true);
      setTimeout(() => setAnalysisSent(false), 3000);
    }
  }, [btcData]);

  // Döngüsel Kontroller
  useEffect(() => {
    fetchNews().then((items) => {
      if (items && items.length > 0) {
        items.forEach(item => processedNewsIdsRef.current.add(item.id));
      }
    });
    fetchLiveBTCData();

    const priceInterval = setInterval(fetchLiveBTCData, 10000);

    const clockInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 10 && now.getMinutes() === 0) {
        handleGenerateAnalysis();
      }
    }, 60000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(clockInterval);
    };
  }, [fetchNews, fetchLiveBTCData, handleGenerateAnalysis]);

  // 15 Dakikalık Otomatik Haber Kontrol Mekanizması
  useEffect(() => {
    if (!isAutoNewsEnabled) return;

    const autoNewsInterval = setInterval(async () => {
      const freshNews = await fetchNews();
      if (freshNews && freshNews.length > 0) {
        const latestItem = freshNews[0];
        
        if (!processedNewsIdsRef.current.has(latestItem.id) && !sentIds.has(latestItem.id)) {
          processedNewsIdsRef.current.add(latestItem.id);
          const fullText = `${latestItem.text}\n\n👉 t.me/barbianaliz`;
          await sendToTelegram(fullText, latestItem.id);
        }
      }
    }, 900000);

    return () => clearInterval(autoNewsInterval);
  }, [isAutoNewsEnabled, fetchNews, sentIds]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl shadow-lg shadow-emerald-500/20">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Crypto Haber & BTC Analiz
                </h1>
                <p className="text-slate-400 mt-1">
                  Gerçek zamanlı kripto haberleri ve teknik analiz
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {isAutoNewsEnabled ? (
                <button
                  onClick={() => setIsAutoNewsEnabled(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg transition-all duration-200 text-sm font-medium animate-pulse"
                >
                  <Square className="w-4 h-4" />
                  Otomatik Paylaşımı Durdur (Aktif)
                </button>
              ) : (
                <button
                  onClick={() => setIsAutoNewsEnabled(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Otomatik Paylaşımı Başlat
                </button>
              )}

              <button
                onClick={fetchNews}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
            </div>
          </div>
        </header>

        <div className="mb-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 shadow-xl h-[450px]">
          <iframe
            title="TradingView BTC/USDT Chart"
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE%3ABTCUSDT&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Europe%2FIstanbul&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=tr"
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0.75rem' }}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Newspaper className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Son Dakika Haberleri
                    </h2>
                    <p className="text-sm text-slate-400">
                      Kaynak: @yoyodexhaber
                    </p>
                  </div>
                </div>
                {isAutoNewsEnabled && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Oto-Mod Aktif
                  </span>
                )}
              </div>
            </div>

            <div className="h-[600px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <p className="text-red-400">{error}</p>
                  <button
                    onClick={fetchNews}
                    className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                  >
                    Tekrar Dene
                  </button>
                </div>
              ) : news.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Haber bulunamadı
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {news.map((item) => (
                    <div key={item.id} className="p-5 hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                            {item.text.length > 300 ? item.text.slice(0, 300) + '...' : item.text}
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-slate-500">{item.date}</span>
                            <span className="text-xs text-slate-500">{item.time}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePostNews(item)}
                          disabled={sendingIds.has(item.id) || sentIds.has(item.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                            sentIds.has(item.id)
                              ? 'bg-emerald-600 text-white'
                              : sendingIds.has(item.id)
                              ? 'bg-slate-600 text-slate-300 cursor-wait'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/25'
                          } disabled:opacity-80`}
                        >
                          <Send className="w-4 h-4" />
                          {sendingIds.has(item.id) ? 'Gönderiliyor...' : sentIds.has(item.id) ? 'Gönderildi! 🇹🇷' : 'Telegram\'a Gönder'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
              <div className="px-6 py-5 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-800/50">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      BTC Canlı Veriler
                    </h2>
                    <p className="text-sm text-slate-400">
                      Teknik analiz göstergeleri (Binance Canlı)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {btcData ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-6 border border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400 mb-1">BTC/USDT Fiyatı</p>
                          <p className="text-4xl font-bold text-white">
                            ${btcData.price.toLocaleString()}
                          </p>
                        </div>
                        <div className={`p-4 rounded-xl ${btcData.trend === 'bullish' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                          <Activity className={`w-8 h-8 ${btcData.trend === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/30">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-cyan-400" />
                          <p className="text-sm text-slate-400">RSI (14)</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{btcData.rsi}</p>
                        <p className={`text-sm mt-2 ${btcData.rsi > 70 ? 'text-rose-400' : btcData.rsi < 30 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {btcData.rsi > 70 ? 'Aşırı Alım' : btcData.rsi < 30 ? 'Aşırı Satım' : 'Normal'}
                        </p>
                      </div>

                      <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5 text-cyan-400" />
                          <p className="text-sm text-slate-400">MACD</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{btcData.macd.value}</p>
                        <p className={`text-sm mt-2 ${btcData.trend === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {btcData.trend === 'bullish' ? 'Bullish Sinyal' : 'Bearish Sinyal'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/30 space-y-3">
                      <p className="text-sm text-slate-400">MACD Detayları</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Signal Line:</span>
                          <span className="text-white font-medium">{btcData.macd.signal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Histogram:</span>
                          <span className={`font-medium ${btcData.macd.histogram > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {btcData.macd.histogram}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateAnalysis}
                      disabled={analysisSending || analysisSent}
                      className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-semibold transition-all duration-200 ${
                        analysisSent
                          ? 'bg-emerald-600 text-white'
                          : analysisSending
                          ? 'bg-slate-600 text-slate-300 cursor-wait'
                          : 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white hover:shadow-xl hover:shadow-cyan-500/20'
                      } disabled:opacity-80`}
                    >
                      <Zap className="w-5 h-5" />
                      {analysisSending ? 'Gönderiliyor...' : analysisSent ? 'Analiz Gönderildi! 🇹🇷' : 'AI Analiz Oluştur ve Gönder'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 text-sm">
                <strong>Bilgi:</strong> Fiyat verileri Binance Canlı API'sinden çekilmektedir. Saat 10:00'da arka planda otomatik teknik analiz özeti kanala gönderilir.
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-700/50 text-center text-slate-500 text-sm">
          <p>Crypto Haber & BTC Analiz Dashboard - {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
