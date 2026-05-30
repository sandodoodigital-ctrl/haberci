import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Veriyi çek
    const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const cryptoData = await cryptoRes.json();
    const price = cryptoData.bitcoin.usd.toLocaleString('tr-TR');

    // 2. Türk Bayraklı ve Profesyonel Grafik (QuickChart)
    // Grafik içine "TR" vurgusu ve estetik görünüm eklendi
    const chartImg = "https://quickchart.io/chart?w=600&h=300&bkg=white&c={type:'line',data:{labels:['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],datasets:[{label:'BTC Fiyatı ($)',data:[71500,72000,71800,72500,73000,73500,73895],borderColor:'#10b981',backgroundColor:'rgba(16, 185, 129, 0.2)',fill:true,tension:0.4}]},options:{title:{display:true,text:'BTC/USDT Günlük Analiz (Barbi Analiz TR)'},legend:{display:false},scales:{yAxes:[{ticks:{beginAtZero:false}}]}}}";

    // 3. Bülten Metni
    const caption = `🚀 <b>GÜNLÜK OTONOM BÜLTEN</b> 🇹🇷\n\n` +
                    `💰 <b>Güncel Fiyat:</b> $${price}\n` +
                    `📰 <b>Analiz:</b> Bitcoin piyasa dinamiklerine göre stabil seyrini sürdürüyor ve yükseliş trendini koruyor.\n\n` +
                    `📢 <b>İletişim:</b> @barbieanaliz\n` +
                    `💎 <b>Kanal:</b> t.me/barbianaliz`;

    // 4. Telegram'a gönder
    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: TARGET_CHANNEL, 
        photo: chartImg, 
        caption: caption, 
        parse_mode: 'HTML' 
      })
    });

    const result = await telegramRes.json();
    
    if (result.ok) {
      return res.status(200).json({ success: true, message: "Tamamlandı ve kanala gönderildi!" });
    } else {
      return res.status(400).json({ success: false, error: result.description });
    }

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
