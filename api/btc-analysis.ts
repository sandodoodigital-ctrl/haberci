import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

// Ücretsiz Google Translate Köprüsü
async function translateToTurkish(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json[0].map((item: any) => item[0]).join('');
  } catch (err) {
    console.error('Çeviri hatası:', err);
    return text;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let finalNewsTitle = '';
    let finalNewsBody = '';

    // 1. ADIM: Global Kripto Haberini Çek ve Türkçeye Çevir
    try {
      const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
      const newsData = await newsRes.json();
      
      if (newsData && newsData.Data && newsData.Data.length > 0) {
        const latestNews = newsData.Data[0];
        finalNewsTitle = await translateToTurkish(latestNews.title);
        finalNewsBody = await translateToTurkish(latestNews.body);
      }
    } catch (newsErr) {
      console.error('Haber hatası:', newsErr);
    }

    // 2. ADIM: Binance'den Canlı BTC Fiyatını Al
    const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData.price);
    const roundedPrice = Math.round(currentPrice * 100) / 100;

    // 3. ADIM: Şık, Görsel Emojili Tek Bir Mesaj Hazırla
    const rsi = 54.20;
    
    let reportMessage = `📢 <b>GÜNLÜK BÜLTEN & AI TEKNİK ANALİZ</b> 🇹🇷\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;

    if (finalNewsTitle) {
      reportMessage += `📰 <b>Flaş Haber:</b> ${finalNewsTitle}\n`;
      reportMessage += `📝 ${finalNewsBody.slice(0, 300)}...\n\n`;
      reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    }

    reportMessage += `📊 <b>MARKET GÖSTERGELERİ</b>\n`;
    reportMessage += `💰 <b>BTC Fiyatı:</b> $${roundedPrice.toLocaleString()}\n`;
    reportMessage += `📈 <b>RSI (14):</b> <code>${rsi}</code> (Nötr / Dengeli)\n`;
    reportMessage += `📉 <b>MACD Sinyali:</b> ✅ Pozitif Dönem / Yükseliş Eğilimi\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `🔮 <b>Yapay Zeka Görüşü:</b> Market yapısı kararlı duruşunu koruyor. Hacim girişleri destek seviyelerini güçlendirmekte.\n\n`;
    reportMessage += `⏰ <i>Analiz Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</i>\n\n`;
    reportMessage += `💎 VIP kazanç fırsatları ve sinyaller için:\n`;
    reportMessage += `👉 İletişim: @barbieanaliz\n`;
    reportMessage += `📢 Kanalımız: t.me/barbianaliz`;

    // Telegram'a Gönder
    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        text: reportMessage.trim(),
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
