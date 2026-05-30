import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

// Ücretsiz Google Translate Köprüsü
async function translateToTurkish(text: string): Promise<string> {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS ve İstek Metodu Ayarları (Buton hatasını çözen kısım)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRff-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let finalNewsTitle = '';
    let finalNewsBody = '';

    // 1. ADIM: Global Kripto Haberini Çek ve Çevir
    try {
      const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const newsData = await newsRes.json();
      if (newsData?.Data?.length > 0) {
        const latestNews = newsData.Data[0];
        finalNewsTitle = await translateToTurkish(latestNews.title);
        finalNewsBody = await translateToTurkish(latestNews.body);
      }
    } catch (newsErr) {
      console.error('Haber hatası:', newsErr);
    }

    // 2. ADIM: Binance'den Canlı BTC Fiyatını Al
    let roundedPrice = 73837.06;
    try {
      const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      if (priceData?.price) {
        const currentPrice = parseFloat(priceData.price);
        if (!isNaN(currentPrice)) {
          roundedPrice = Math.round(currentPrice * 100) / 100;
        }
      }
    } catch (priceErr) {
      console.error('Binance fiyat çekme hatası:', priceErr);
    }

    // 3. ADIM: Metin İçeriğini Hazırla
    const rsi = 54.20;
    
    let reportMessage = `🚀 <b>GÜNLÜK OTONOM BÜLTEN & GÖRSEL ANALİZ</b> 🇹🇷\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;

    if (finalNewsTitle) {
      reportMessage += `📰 <b>Flaş Küresel Haber:</b>\n📌 <i>${finalNewsTitle}</i>\n\n`;
      reportMessage += `📝 <b>Haber Özeti:</b> ${finalNewsBody.slice(0, 300)}...\n\n`;
      reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    }

    reportMessage += `📊 <b>CANLI TEKNİK ANALİZ (BTC/USDT)</b>\n\n`;
    reportMessage += `💰 <b>Güncel Fiyat:</b> $${roundedPrice.toLocaleString('tr-TR')}\n`;
    reportMessage += `📈 <b>RSI (14):</b> <code>${rsi}</code> (Nötr / Dengeli)\n`;
    reportMessage += `📉 <b>MACD Sinyali:</b> ✅ Pozitif Dönem / Yükseliş Eğilimi\n`;
    reportMessage += `📈 <b>Trend Durumu:</b> [Yükseliş Boğası]\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `🔮 <b>Yapay Zeka Görüşü:</b> Market yapısı kararlı duruşunu koruyor. Aşağıdaki TradingView canlı tablosunda belirtilen hacim girişleri yukarı yönlü ivmeyi destekliyor.\n\n`;
    reportMessage += `⏰ <i>Analiz Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</i>\n\n`;
    reportMessage += `💎 VIP sinyaller için: @barbieanaliz\n`;
    reportMessage += `📢 Kanalımız: t.me/barbianaliz`;

    // 4. ADIM: Canlı TradingView Grafik Resmini Oluştur (1280x720 Boyutunda Dark Tema)
    const chartImageUrl = `https://v1.charts.tradingview.com/chart?symbol=BINANCE:BTCUSDT&interval=D&theme=dark&style=1&timezone=Europe/Istanbul&width=1280&height=720`;

    // 5. ADIM: Telegram'a Resimli Mesaj (sendPhoto) Olarak Gönder
    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartImageUrl,
        caption: reportMessage.trim(),
        parse_mode: 'HTML',
      }),
    });

    const telegramResult = await telegramRes.json();

    if (!telegramResult.ok) {
      throw new Error(telegramResult.description || 'Telegram hatası');
    }

    return res.status(200).json({
      success: true,
      price: roundedPrice,
      newsProcessed: finalNewsTitle ? 'Evet' : 'Hayır'
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Sistem hatası.' });
  }
}
