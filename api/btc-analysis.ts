import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Canlı veriyi Binance'ten güvenli şekilde çek
    const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const priceData = await priceRes.json();
    const price = parseFloat(priceData.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

    // 2. Telegram'ın asla reddetmeyeceği, sabit ve bot-dostu grafik resmi (.png)
    // TradingView linkleri yerine bu sabit resmi kullanıyoruz
    const chartPhoto = "https://s3.tradingview.com/snapshots/b/BTCUSDT.png";

    // 3. Bülten Metnini Hazırla
    const caption = `🚀 <b>GÜNLÜK OTONOM BÜLTEN</b> 🇹🇷\n\n` +
                    `💰 <b>Güncel BTC Fiyatı:</b> <code>$${price}</code>\n` +
                    `📊 <b>Piyasa Durumu:</b> Stabil seyir ve analiz süreci aktif.\n\n` +
                    `💎 <b>VIP Sinyaller:</b> @barbieanaliz\n` +
                    `📢 <b>Kanal:</b> t.me/barbianaliz`;

    // 4. Telegram'a resimli mesaj olarak gönder (Link önizlemesiyle uğraşma!)
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartPhoto, // Sabit ve güvenli grafik resmi
        caption: caption,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (result.ok) {
      return res.status(200).json({ success: true, message: "Başarıyla gönderildi!" });
    } else {
      throw new Error(result.description);
    }

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
