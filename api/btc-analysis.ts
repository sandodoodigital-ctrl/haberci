import type { VercelRequest, VercelResponse } from '@vercel/node';

interface BinanceCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// HTML Karakterlerini Kaçırma Fonksiyonu
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// RSI (Relative Strength Index) Hesaplama
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// EMA (Exponential Moving Average) Hesaplama
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  const initialValue = sum / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(0);
    } else if (i === period - 1) {
      ema.push(initialValue);
    } else {
      const currentEma = data[i] * k + ema[i - 1] * (1 - k);
      ema.push(currentEma);
    }
  }
  return ema;
}

// MACD Hesaplama
function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  
  const validMacd = macdLine.slice(25);
  const signalLineRaw = calculateEMA(validMacd, 9);
  const signalLine = new Array(25).fill(0).concat(signalLineRaw);
  
  const lastIndex = closes.length - 1;
  const currentMacd = macdLine[lastIndex];
  const currentSignal = signalLine[lastIndex];
  const currentHistogram = currentMacd - currentSignal;
  
  return {
    macd: currentMacd,
    signal: currentSignal,
    histogram: currentHistogram
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
  const TARGET_CHANNEL = process.env.TELEGRAM_CHANNEL || '@barbianaliz';

  try {
    // Ülke veya IP engellerini aşmak için alternatif yedek api uç noktaları listesi
    const endpoints = [
      'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100',
      'https://api1.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100',
      'https://api2.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100',
      'https://api3.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100',
      'https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100'
    ];

    let binanceRes: any = null;
    let rawData: any = null;

    // Sırayla çalışan bir uç nokta bulana kadar döngü kuruyoruz
    for (const url of endpoints) {
      try {
        binanceRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (binanceRes.ok) {
          rawData = await binanceRes.json();
          if (Array.isArray(rawData) && rawData.length > 0) {
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Eğer tüm alternatifler başarısız olduysa Coingecko verisiyle fallback (yedek) mekanizması çalıştır
    if (!rawData) {
      try {
        const fallbackRes = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=100&interval=daily');
        if (fallbackRes.ok) {
          const geckoData = await fallbackRes.json();
          // Grafik ve teknik analiz için fiyat dizisi oluşturma
          const geckoPrices: [number, number][] = geckoData.prices;
          rawData = geckoPrices.map((p, idx) => {
            const open = idx > 0 ? geckoPrices[idx - 1][1] : p[1];
            return [p[0], open, p[1] * 1.01, p[1] * 0.99, p[1], 100];
          });
        }
      } catch (geckoError) {
        throw new Error('Hem Binance API uç noktaları hem de yedek Coingecko servisi yanıt vermiyor.');
      }
    }

    const candles: BinanceCandle[] = rawData.map((d: any) => ({
      openTime: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    }));

    const closes = candles.map(c => c.close);
    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;

    // 2. Teknik Göstergelerin Hesaplamaları
    const rsiValue = calculateRSI(closes, 14);
    const macdData = calculateMACD(closes);

    // Pivot Noktaları ile Destek ve Direnç Hesaplama
    const prevCandle = candles[candles.length - 2];
    const pivot = (prevCandle.high + prevCandle.low + prevCandle.close) / 3;
    const support1 = 2 * pivot - prevCandle.high;
    const resistance1 = 2 * pivot - prevCandle.low;

    // Trend Yorumu Belirleme
    let trendComment = "Yatay Seviye Görünümü";
    if (rsiValue > 60 && macdData.histogram > 0) {
      trendComment = "Pozitif / Yukarı Yönlü Eğilim";
    } else if (rsiValue < 40 && macdData.histogram < 0) {
      trendComment = "Negatif / Aşağı Yönlü Eğilim";
    }

    // 3. QuickChart Konfigürasyonu
    const chartLabels = candles.map((c, i) => i % 15 === 0 ? new Date(c.openTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '');
    
    const chartConfig = {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'BTC/USDT Günlük Kapanış',
          data: closes,
          borderColor: '#f2a900',
          backgroundColor: 'rgba(242, 169, 0, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true
        }]
      },
      options: {
        title: {
          display: true,
          text: 'Bitcoin (BTC) Günlük Değişim Grafiği',
          fontSize: 16,
          fontColor: '#ffffff'
        },
        legend: { display: false },
        scales: {
          xAxes: [{ gridLines: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { fontColor: '#aaaaaa' } }],
          yAxes: [{ gridLines: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { fontColor: '#aaaaaa' } }]
        },
        backgroundColor: '#131722'
      }
    };

    const chartUrl = `https://quickchart.io/chart?w=800&h=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    // 4. Telegram Mesaj Metni Formatlama (Temizlendi & Yasal Uyarı Eklendi)
    const captionText = `🚀 <b>BTC GÜNLÜK TEKNİK ANALİZ</b>

💰 <b>Güncel BTC Fiyatı:</b> $${escapeHtml(currentPrice.toLocaleString('en-US'))}
📊 <b>RSI (14):</b> ${escapeHtml(rsiValue.toFixed(2))}
📈 <b>MACD:</b> ${escapeHtml(macdData.macd.toFixed(2))} (Sinyal: ${escapeHtml(macdData.signal.toFixed(2))})
📉 <b>Trend Yorumu:</b> ${escapeHtml(trendComment)}
🎯 <b>Destek Seviyesi:</b> $${escapeHtml(support1.toFixed(2))}
🚀 <b>Direnç Seviyesi:</b> $${escapeHtml(resistance1.toFixed(2))}

⚠️ <i>YASAL UYARI: Bu analiz ve sinyaller yatırım tavsiyesi içermez, tamamen bilgi amaçlıdır.</i>`;

    // --- Telegram Yerel Buton Konfigürasyonu ---
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🔐 VIP Grup Bilgisi", url: "https://t.me/barbi_iletisim_bot" }
        ],
        [
          { text: "💬 Barbi ile İletişime Geç", url: "https://t.me/barbieanaliz" }
        ]
      ]
    };

    // 5. Telegram'a Gönderme (sendPhoto - Butonlar Tanımlandı)
    let telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartUrl,
        caption: captionText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard // Sihirli butonlar buraya bağlandı
      })
    });

    let result = await telegramRes.json();

    if (!result.ok) {
      // Hata durumunda devreye giren yedek mekanizma (sendMessage)
      telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TARGET_CHANNEL,
          text: captionText,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard // Butonlar yedek mesaja da eklendi
        })
      });
      result = await telegramRes.json();
    }

    if (result.ok) {
      return res.status(200).json({ success: true, ...result });
    } else {
      return res.status(200).json({ success: false, error: result.description || 'Telegram API Error' });
    }

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
