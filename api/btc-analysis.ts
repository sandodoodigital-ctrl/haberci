import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await cryptoRes.json();
    const price = data.bitcoin.usd.toLocaleString('tr-TR');

    // Grafik URL'i: label parametresi eklendi, artık undefined yazmayacak
    const chartUrl = "https://quickchart.io/chart?w=600&h=300&c={type:'line',data:{labels:['1','2','3','4','5'],datasets:[{label:'BTC',data:[70000,71000,72000,73000,73771],borderColor:'green',fill:true}]},options:{title:{text:'Bitcoin Fiyatı'}} }";

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartUrl,
        caption: `🚀 <b>BTC Fiyatı:</b> $${price}\n📢 @barbianaliz`,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
