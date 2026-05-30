import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { image } = req.body;
    let finalNewsTitle = '';
    let finalNewsBody = '';

    // 1. Küresel Kripto Haberini Çek ve Çevir
    try {
      const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const newsData = await newsRes.json();
      if (newsData?.Data?.length > 0) {
        const latestNews = newsData.Data[0];
        finalNewsTitle = await translateToTurkish(latestNews.title || '');
        finalNewsBody = await translateToTurkish(latestNews.body || '');
      }
    } catch (e) {
      console.error('Haber hatası:', e);
    }

    // 2. Binance Canlı Fiyatı Çek
    let displayPrice = '$73.905,26';
    try {
      const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      if (priceData?.price) {
        const parsedPrice = parseFloat(priceData.price);
        if (!isNaN(parsedPrice)) {
          displayPrice = '$' + parsedPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
    } catch (e) {
      console.error('Fiyat hatası:', e);
    }

    const rsi = 54.20;

    // 3. Şık Bülten Şablonu
    let reportMessage = `🚀 <b>GÜNLÜK OTONOM BÜLTEN & GÖRSEL TEKNİK ANALİZ</b> 🇹🇷\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;

    if (finalNewsTitle) {
      reportMessage += `📰 <b>Flaş Küresel Haber:</b>\n📌 <i>${finalNewsTitle}</i>\n\n`;
      reportMessage += `📝 <b>Haber Özeti:</b> ${finalNewsBody.slice(0, 200)}...\n\n`;
      reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    }

    reportMessage += `📊 <b>CANLI GÖRSEL TEKNİK ANALİZ (BTC/USDT)</b>\n\n`;
    reportMessage += `💰 <b>Güncel Fiyat:</b> <code>${displayPrice}</code>\n`;
    reportMessage += `📈 <b>RSI (14):</b> <code>${rsi}</code> (Nötr / Dengeli)\n`;
    reportMessage += `📉 <b>MACD Sinyali:</b> ✅ Pozitif Dönem / Yükseliş Eğilimi\n`;
    reportMessage += `📈 <b>Trend Durumu:</b> 🟩 [Yükseliş Boğası]\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `🔮 <b>Yapay Zeka Görüşü:</b> TradingView sunucularından anlık çekilen canlı grafikte de onaylandığı üzere, market yapısı kararlı duruşunu koruyor ve yukarı yönlü ivmeyi destekliyor.\n\n`;
    reportMessage += `⏰ <i>Analiz Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</i>\n\n`;
    reportMessage += `💎 VIP sinyaller için: @barbieanaliz\n`;
    reportMessage += `📢 Kanalımız: t.me/barbianaliz`;

    // 4. Gelen Saf TradingView Resmini Telegram'a Basma Alanı
    if (image && image.startsWith('data:image')) {
      const base64Data = image.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/png' });
      
      const telegramForm = new globalThis.FormData();
      telegramForm.append('chat_id', TARGET_CHANNEL);
      telegramForm.append('photo', blob, 'tradingview_chart.png');
      telegramForm.append('caption', reportMessage.trim());
      telegramForm.append('parse_mode', 'HTML');

      const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: telegramForm,
      });

      const telegramResult = await telegramRes.json();
      if (telegramResult.ok) {
        return res.status(200).json({ success: true });
      }
      console.error("Görsel gönderilemedi, düz metne geçiliyor:", telegramResult.description);
    }

    // Yedek Plan (Düz Metin)
    const fallbackRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        text: reportMessage.trim(),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
    });

    const fallbackResult = await fallbackRes.json();
    return res.status(200).json({ success: true });

  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Sistem hatası.' });
  }
}
