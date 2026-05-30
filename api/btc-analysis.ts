import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Veriyi CoinGecko'dan çekiyoruz
    const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const data = await cryptoRes.json();
    const price = data.bitcoin.usd.toLocaleString('tr-TR');
    const change = data.bitcoin.usd_24h_change.toFixed(2);

    // 2. Grafik görseli (Telegram'ın doğrudan kabul edeceği .png formatı)
    // Bu URL, piyasa verilerini temsil eden sabit ve sorunsuz bir görseldir
    const chartPhoto = "https://quickchart.io/chart?w=600&h=300&c={type:'line',data:{labels:['1','2','3','4','5','6','7'],datasets:[{label:'BTC',data:[68000,69500,67000,70500,72000,73500,73895],borderColor:'#10b981',fill:true}]},options:{title:{text:'Günlük BTC Analizi'}}}";

    // 3. Mesaj şablonu
    const caption = `🚀 <b>GÜNLÜK OTONOM BÜLTEN</b> 🇹🇷\n\n` +
                    `💰 <b>Güncel Fiyat:</b> $${price}\n` +
                    `📈 <b>24 Saatlik Değişim:</b> %${change}\n` +
                    `📰 <b>Durum:</b> Bitcoin piyasa dinamiklerine göre stabil seyrini sürdürüyor.\n\n` +
                    `📢 <b>Kanal:</b> t.me/barbianaliz`;

    // 4. Telegram'a gönder (Resim + Caption)
    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartPhoto,
        caption: caption,
        parse_mode: 'HTML'
      })
    });

    const result = await telegramRes.json();
    if (!result.ok) throw new Error(result.description);

    return res.status(200).json({ success: true, message: "Başarıyla gönderildi!" });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
