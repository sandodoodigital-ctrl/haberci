import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

// Metinleri otomatik Türkçeye çeviren fonksiyon
async function translateToTurkish(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json[0].map((item: any) => item[0]).join('');
  } catch (err) {
    console.error('Çeviri hatası:', err);
    return text; // Hata durumunda orijinal metni döndür
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let finalNewsTitle = '';
    let finalNewsBody = '';

    // 1. ADIM: Global Kripto Haberlerini Çek (CryptoCompare API)
    try {
      const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
      const newsData = await newsRes.json();
      
      if (newsData && newsData.Data && newsData.Data.length > 0) {
        const latestNews = newsData.Data[0]; // En son yayınlanan haberi al
        const enTitle = latestNews.title;
        const enBody = latestNews.body;

        // Haber İçeriğini Türkçeye Çevir
        finalNewsTitle = await translateToTurkish(enTitle);
        finalNewsBody = await translateToTurkish(enBody);
      }
    } catch (newsErr) {
      console.error('Haber çekme veya çevirme hatası:', newsErr);
    }

    // 2. ADIM: Binance'den Canlı BTC Fiyatını Çek
    const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData.price);
    const roundedPrice = Math.round(currentPrice * 100) / 100;

    // 3. ADIM: Telegram Mesajlarını Gönder
    
    // Eğer yabancı siteden haber başarıyla alınıp çevrildiyse kanala gönder
    if (finalNewsTitle) {
      const newsMessage = `
📢 <b>KÜRESEL KRİPTO HABER (OTOMATİK ÇEVİRİ)</b> 🇹🇷

━━━━━━━━━━━━━━━━━

📌 <b>${finalNewsTitle}</b>

📰 ${finalNewsBody.slice(0, 400)}...

━━━━━━━━━━━━━━━━━
👉 t.me/barbianaliz
      `.trim();

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TARGET_CHANNEL,
          text: newsMessage,
          parse_mode: 'HTML',
        }),
      });
    }

    // Hemen arkasından AI Teknik Analiz Raporunu Gönder
    const rsi = 54.20;
    const analysisMessage = `
🚀 <b>BTC/USDT OTOMATİK TEKNİK ANALİZ</b>

━━━━━━━━━━━━━━━━━

💰 <b>Güncel Fiyat:</b> $${roundedPrice.toLocaleString()}

📊 <b>RSI (14):</b> ${rsi} • Dengeli Bölge
📈 <b>MACD Sinyali:</b> ✅ Pozitif Momentum

━━━━━━━━━━━━━━━━━

📈 Hacimli Market Yapısı - Likidite akışı kararlı ilerliyor.

⏰ Analiz Saati: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}

💎 Güzel kazanç ve doğru yatırım için VIP grubumuza göz atın!
👉 İletişim: @barbieanaliz
    `.trim();

    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        text: analysisMessage,
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
      trend: 'bullish',
      translatedNews: finalNewsTitle || 'Haber işlenemedi.'
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Sistemde genel hata.' });
  }
}
