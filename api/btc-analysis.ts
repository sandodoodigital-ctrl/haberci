import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = '8784838463:AAGrZu_RlxzqWWicryIAk_l9Q51FwhJfIDw';
const TARGET_CHANNEL = '@barbianaliz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await cryptoRes.json();
    const price = data.bitcoin.usd.toLocaleString('tr-TR');

    // &format=png zorunlu eklendi
    const chartUrl = "https://quickchart.io/chart?w=600&h=300&format=png&c={type:'line',data:{datasets:[{data:[70000,72000,71000,73000,74000],borderColor:'green'}]}}";

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
