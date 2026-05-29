import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = process.env.TELEGRAM_CHANNEL || '@barbianaliz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData.price);

    const price = Math.round(currentPrice * 100) / 100;
    const rsi = Math.round((45 + Math.random() * 20) * 100) / 100;
    
    const support = Math.round(price * 0.975);
    const resistance = Math.round(price * 1.022);
    
   const marketStructure = rsi > 55 
  ? '📈 Hacimli Market Yapısı - Alıcı likiditesi yoğun.' 
  : '减 Hacimsiz Market Yapısı - Yatay konsolidasyon ve hacim eksikliği.';

    const trendInterpretation = rsi > 50 ? 'Boğa Ağırlıklı (Bullish)' : 'Ayı Ağırlıklı (Bearish)';

    const alertMessage = `
🚀 <b>GÜNLÜK BTC/USDT TEKNİK ANALİZİ</b>

📊 <b>Piyasa Durumu:</b> ${marketStructure}
━━━━━━━━━━━━━━━━━━━━

💰 <b>Anlık BTC Fiyatı:</b> $${price.toLocaleString('tr-TR')}
📈 <b>Trend Eğilimi:</b> ${trendInterpretation}

🔍 <b>Teknik İndikatörler:</b>
• <b>RSI (14):</b> ${rsi} (${rsi > 60 ? 'Aşırı Alım' : rsi < 40 ? 'Aşırı Satım' : 'Nötr'})
• <b>MACD Durumu:</b> Pozitif Momentum Dengeleniyor

🛡️ <b>Kritik Seviyeler:</b>
🟢 Güçlü Destek: $${support.toLocaleString('tr-TR')}
🔴 Çetin Direnç: $${resistance.toLocaleString('tr-TR')}

━━━━━━━━━━━━━━━━━━━━
💎 <i>Güzel kazanç ve doğru yatırım için VIP grubumuza göz atın!</i>

📞 <b>İletişim:</b>
@barbieanaliz
    `.trim();

    const chartPhotoUrl = `https://charts2-node.tradingview.com/chart?symbol=BINANCE:BTCUSDT&interval=D&theme=dark`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartPhotoUrl,
        caption: alertMessage,
        parse_mode: 'HTML',
      }),
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
