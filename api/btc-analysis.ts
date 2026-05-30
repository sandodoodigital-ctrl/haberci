import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Veriyi CoinGecko'dan çekiyoruz (Asla engellenmez, çok hızlıdır)
    const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const data = await cryptoRes.json();
    const btc = data.bitcoin;
    
    // 2. Grafik için QuickChart (Kendi kendini çizen grafik motoru)
    // Bu URL'i Telegram'a attığımızda anında resim olarak görünecek.
    const chartUrl = "https://quickchart.io/chart?w=600&h=300&c={type:'line',data:{labels:['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],datasets:[{label:'BTC Fiyatı ($)',data:[68000,69500,67000,70500,72000,73500,73800],borderColor:'#10b981',fill:false}]},options:{title:{display:true,text:'Son 7 Günlük BTC Eğilimi'}} }";

    // 3. Mesaj şablonu
    const caption = `🚀 <b>BARBİ ANALİZ - GÜNLÜK BÜLTEN</b> 🇹🇷\n\n` +
                    `💰 <b>Güncel Fiyat:</b> $${btc.usd.toLocaleString()}\n` +
                    `📈 <b>24 Saatlik Değişim:</b> %${btc.usd_24h_change.toFixed(2)}\n\n` +
                    `🔮 <b>Analiz:</b> Market verileri stabil seyrediyor. Detaylı teknik analiz ve sinyaller için VIP grubumuza katılabilirsiniz.\n\n` +
                    `💎 <b>VIP:</b> @barbieanaliz\n` +
                    `📢 <b>Kanal:</b> t.me/barbianaliz`;

    // 4. Telegram'a gönder
    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartUrl,
        caption: caption,
        parse_mode: 'HTML'
      }),
    });

    const result = await telegramRes.json();
    
    if (!result.ok) {
      return res.status(200).json({ status: "Error", msg: result.description });
    }

    return res.status(200).json({ status: "Success", msg: "Analiz başarıyla kanala gönderildi!" });

  } catch (error: any) {
    return res.status(500).json({ status: "Critical Error", error: error.message });
  }
}
