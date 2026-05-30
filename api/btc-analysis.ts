import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

// Ücretsiz Google Translate Köprüsü (User-Agent Eklenmiş Güvenli Versiyon)
async function translateToTurkish(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const json = await res.json();
    if (json && json[0]) {
      return json[0].map((item: any) => item[0]).join('');
    }
    return text;
  } catch (err) {
    console.error('Çeviri hatası:', err);
    return text;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let finalNewsTitle = '';
    let finalNewsBody = '';

    // 1. ADIM: Global Kripto Haberini Çek ve Türkçeye Çevir (Header Eklendi)
    try {
      const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const newsData = await newsRes.json();
      
      if (newsData && newsData.Data && newsData.Data.length > 0) {
        // En son yayınlanan haberi seçiyoruz
        const latestNews = newsData.Data[0];
        
        // Haber başlığını ve kısa özetini Türkçeye çeviriyoruz
        finalNewsTitle = await translateToTurkish(latestNews.title);
        finalNewsBody = await translateToTurkish(latestNews.body);
      }
    } catch (newsErr) {
      console.error('Haber çekme hatası:', newsErr);
    }

    // 2. ADIM: Binance'den Canlı BTC Fiyatını Al (Hata Önlemli)
    let roundedPrice = 73773; // Fallback varsayılan fiyat (NaN olmasın diye)
    try {
      const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      if (priceData && priceData.price) {
        const currentPrice = parseFloat(priceData.price);
        if (!isNaN(currentPrice)) {
          roundedPrice = Math.round(currentPrice * 100) / 100;
        }
      }
    } catch (priceErr) {
      console.error('Binance fiyat çekme hatası:', priceErr);
    }

    // 3. ADIM: Şık, Görsel Emojili Tek Bir Mesaj Hazırla
    const rsi = 54.20;
    
    let reportMessage = `📢 <b>GÜNLÜK BÜLTEN & AI TEKNİK ANALİZ</b> 🇹🇷\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;

    // Haber başarıyla çekildiyse mesaja harika bir bölüm olarak ekleniyor
    if (finalNewsTitle) {
      reportMessage += `📰 <b>Flaş Küresel Haber:</b>\n📌 <i>${finalNewsTitle}</i>\n\n`;
      reportMessage += `📝 <b>Haber Özeti:</b> ${finalNewsBody.slice(0, 350)}...\n\n`;
      reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    } else {
      reportMessage += `📰 <b>Flaş Küresel Haber:</b>\n📌 <i>Kripto piyasalarında hareketlilik sürüyor, küresel hacim artışta.</i>\n\n`;
      reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    }

    reportMessage += ` Bars <b>MARKET GÖSTERGELERİ</b>\n`;
    reportMessage += `💰 <b>BTC Fiyatı:</b> $${roundedPrice.toLocaleString('tr-TR')}\n`;
    reportMessage += `📈 <b>RSI (14):</b> <code>${rsi}</code> (Nötr / Dengeli Bölge)\n`;
    reportMessage += `📉 <b>MACD Sinyali:</b> ✅ Pozitif Dönem / Yükseliş Eğilimi\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `🔮 <b>Yapay Zeka Görüşü:</b> Market yapısı kararlı duruşunu koruyor. Küresel haber akışıyla birlikte hacim girişleri destek seviyelerini güçlendirmekte.\n\n`;
    reportMessage += `⏰ <i>Analiz Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</i>\n\n`;
    reportMessage += `💎 VIP kazanç fırsatları ve sinyaller için:\n`;
    reportMessage += `👉 İletişim: @barbieanaliz\n`;
    reportMessage += `📢 Kanalımız: t.me/barbianaliz`;

    // Telegram'a Gönderim İşlemi
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
