import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

// İngilizce Haberleri Türkçe'ye Çeviren Fonksiyon
async function translateToTurkish(text: string): Promise<string> {
  if (!text) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    return json?.[0]?.map((item: any) => item[0]).join('') || text;
  } catch (err) {
    console.error('Çeviri hatası:', err);
    return text;
  }
}

// 1. GERÇEK RSI HESAPLAMA FONKSİYONU (Wilder's RSI - 14 Periyot)
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const difference = closes[i] - closes[i - 1];
    if (difference > 0) gains += difference;
    else losses -= difference;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const difference = closes[i] - closes[i - 1];
    const gain = difference > 0 ? difference : 0;
    const loss = difference < 0 ? -difference : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

// 2. GERÇEK MACD HESAPLAMA FONKSİYONU (12, 26, 9 EMA)
function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const calculateEMA = (data: number[], p: number) => {
    const k = 2 / (p + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  };

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;
  
  // Basitleştirilmiş kararlı sinyal hattı yaklaşımı
  const signalLine = macdLine * 0.2 + (closes[closes.length - 2] ? (calculateEMA(closes.slice(0, -1), 12) - calculateEMA(closes.slice(0, -1), 26)) * 0.8 : 0);
  const histogram = macdLine - signalLine;

  return {
    macd: parseFloat(macdLine.toFixed(2)),
    signal: parseFloat(signalLine.toFixed(2)),
    histogram: parseFloat(histogram.toFixed(2))
  };
}

// 主 Vercel API İşleyicisi
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Ayarları
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. BINANCE API'DEN SON 100 GÜNLÜK MUM VERİSİNİ ÇEKME
    const binanceRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100');
    if (!binanceRes.ok) throw new Error('Binance verisi çekilemedi.');
    const klines = await binanceRes.json();

    const closePrices: number[] = klines.map((k: any) => parseFloat(k[4]));
    const highPrices: number[] = klines.map((k: any) => parseFloat(k[2]));
    const lowPrices: number[] = klines.map((k: any) => parseFloat(k[3]));
    
    // Grafik için son 30 günün kapanış fiyatlarını ve tarihlerini ayıralım (Görsel netlik için)
    const graphCloses = closePrices.slice(-30);
    const graphLabels = klines.slice(-30).map((k: any) => {
      const d = new Date(k[0]);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const currentPrice = closePrices[closePrices.length - 1];

    // 2. TEKNİK İNDİKATÖRLERİN GERÇEK HESAPLAMALARI
    const rsi = calculateRSI(closePrices, 14);
    const macdData = calculateMACD(closePrices);

    // Pivot Noktaları Algoritması ile Destek ve Direnç Hesaplama
    const lastHigh = highPrices[highPrices.length - 2];
    const lastLow = lowPrices[lowPrices.length - 2];
    const lastClose = closePrices[closePrices.length - 2];
    
    const pivot = (lastHigh + lastLow + lastClose) / 3;
    const support = parseFloat((2 * pivot - lastHigh).toFixed(2));
    const resistance = parseFloat((2 * pivot - lastLow).toFixed(2));

    // Trend Analizi Belirleme
    let trend = "🟨 Yatay / Kararsız Market";
    if (currentPrice > pivot && rsi > 52) trend = "🟩 Yükseliş Boğası (Güçlü Alım)";
    else if (currentPrice < pivot && rsi < 48) trend = "🟥 Düşüş Ayısı (Yoğun Satış)";

    // 3. EN SON KRİPTO HABERİNİ ÇEKME VE ÇEVİRME
    let finalNews = 'Küresel piyasalarda veri akışı sakin, BTC yatay hareketini koruyor.';
    try {
      const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
      const newsData = await newsRes.json();
      if (newsData?.Data?.length > 0) {
        finalNews = await translateToTurkish(newsData.Data[0].title || '');
      }
    } catch (e) {
      console.error('Haber yüklenemedi:', e);
    }

    const formattedPrice = '$' + currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    const formattedSupport = '$' + support.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    const formattedResistance = '$' + resistance.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    const timeString = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

    // 4. ŞIK TELEGRAM METNİ (Caption)
    let captionMessage = `🚀 <b>BTC GÜNLÜK OTONOM TEKNİK ANALİZ</b> 🇹🇷\n`;
    captionMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    captionMessage += `💰 <b>Güncel Fiyat:</b> <code>${formattedPrice}</code>\n`;
    captionMessage += `📊 <b>RSI (14):</b> <code>${rsi}</code>\n`;
    captionMessage += `📈 <b>MACD Sinyali:</b> <code>${macdData.histogram > 0 ? '✅ Pozitif' : '❌ Negatif'} (${macdData.macd})</code>\n`;
    captionMessage += `🎯 <b>Destek Seviyesi:</b> <code>${formattedSupport}</code>\n`;
    captionMessage += `🚀 <b>Direnç Seviyesi:</b> <code>${formattedResistance}</code>\n`;
    captionMessage += `📉 <b>Trend Durumu:</b> <b>${trend}</b>\n\n`;
    captionMessage += `━━━━━━━━━━━━━━━━━\n`;
    captionMessage += `📰 <b>Son Kripto Haberi:</b>\n📌 <i>${finalNews}</i>\n`;
    captionMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    captionMessage += `⏰ <i>Analiz Zamanı: ${timeString}</i>\n`;
    captionMessage += `📞 <b>İletişim:</b> @barbieanaliz\n`;
    captionMessage += `📢 <b>Kanalımız:</b> t.me/barbianaliz`;

    // 5. BACKEND İÇİNDE QUICKCHART MOTORUYLA %100 GERÇEK ÇİZGİ GRAFİK PNG'Sİ ÜRETME
    const chartConfig = {
      type: 'line',
      data: {
        labels: graphLabels,
        datasets: [{
          label: 'BTC/USDT Kapanış Fiyatı ($)',
          data: graphCloses,
          borderColor: '#10b981',
          borderWidth: 3,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        title: {
          display: true,
          text: `BTC/USDT Günlük Grafik Analizi - ${timeString.split(' ')[0]}`,
          fontColor: '#ffffff',
          fontSize: 16
        },
        legend: { labels: { fontColor: '#94a3b8' } },
        scales: {
          xAxes: [{ gridLines: { color: '#1e293b' }, ticks: { fontColor: '#94a3b8' } }],
          yAxes: [{ gridLines: { color: '#1e293b' }, ticks: { fontColor: '#94a3b8' } }]
        }
      }
    };

    // QuickChart URL yapısı (Arka planda doğrudan jilet gibi bir PNG üretir)
    const generatedChartUrl = `https://quickchart.io/chart?bkg=%230f172a&w=800&h=450&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    // 6. TELEGRAM'A DOĞRUDAN GERÇEK RESİM VE ALTI YAZISI (sendPhoto) POSTALAMA
    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: generatedChartUrl,
        caption: captionMessage.trim(),
        parse_mode: 'HTML'
      }),
    });

    const result = await telegramRes.json();

    // 7. TELEGRAM HATA YÖNETİMİ & FALLBACK (YEDEK PLAN) MEKANİZMASI
    if (!result.ok) {
      console.warn("Görsel gönderilemedi, yedek plan (Metin) tetikleniyor:", result.description);
      
      const fallbackRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TARGET_CHANNEL,
          text: captionMessage.trim(),
          parse_mode: 'HTML',
          disable_web_page_preview: true
        }),
      });
      
      const fallbackResult = await fallbackRes.json();
      if (fallbackResult.ok) {
        return res.status(200).json({ success: true, message: "Grafik hatası nedeniyle sadece bülten metni gönderildi." });
      }
      return res.status(400).json({ success: false, error: fallbackResult.description });
    }

    return res.status(200).json({ success: true, message: "Görsel ve analiz başarıyla kanala gönderildi!" });

  } catch (error: any) {
    console.error("Sistem çökmesi engellendi:", error);
    return res.status(500).json({ error: error.message || 'Sistem genel hatası.' });
  }
}
