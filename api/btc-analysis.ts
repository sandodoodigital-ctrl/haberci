import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL || '@barbianaliz';

// Telegram'ın genellikle sorunsuz kabul ettiği statik snapshot örneği
const CHART_IMAGE =
  'https://s3.tradingview.com/snapshots/b/BTCUSDT.png';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getBTCPrice(): Promise<number> {
  const res = await fetch(
    'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
  );

  const data = await res.json();

  return Number(data.price);
}

async function getLatestNews(): Promise<{
  title: string;
  body: string;
}> {
  const res = await fetch(
    'https://min-api.cryptocompare.com/data/v2/news/?lang=EN'
  );

  const data = await res.json();

  const latest = data?.Data?.[0];

  return {
    title: latest?.title || 'Kripto piyasasında yeni gelişmeler',
    body: latest?.body || '',
  };
}

async function translateToTurkish(text: string): Promise<string> {
  if (!text) return '';

  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=' +
      encodeURIComponent(text);

    const res = await fetch(url);
    const data = await res.json();

    return data?.[0]?.map((x: any) => x[0]).join('') || text;
  } catch {
    return text;
  }
}

async function sendPhoto(caption: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        photo: CHART_IMAGE,
        caption,
        parse_mode: 'HTML',
      }),
    }
  );

  return res.json();
}

async function sendMessage(text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    }
  );

  return res.json();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const btcPrice = await getBTCPrice();

    const news = await getLatestNews();

    const translatedTitle = await translateToTurkish(news.title);

    const translatedBody = await translateToTurkish(
      news.body.slice(0, 400)
    );

    const priceFormatted = btcPrice.toLocaleString('tr-TR', {
      maximumFractionDigits: 0,
    });

    const bulletin = [
      '🚀 <b>BTC GÜNLÜK PİYASA BÜLTENİ</b>',
      '',
      `💰 <b>BTC Fiyatı:</b> <code>$${priceFormatted}</code>`,
      '',
      '📊 <b>Son Gelişme</b>',
      `${escapeHtml(translatedTitle)}`,
      '',
      `<i>${escapeHtml(translatedBody)}</i>`,
      '',
      '📈 <b>Piyasa Takibi Devam Ediyor</b>',
      '',
      '━━━━━━━━━━━━',
      '',
      '📞 <b>İletişim</b>',
      '@barbieanaliz',
    ].join('\n');

    try {
      const photoResult = await sendPhoto(bulletin);

      if (!photoResult.ok) {
        throw new Error(
          photoResult.description || 'sendPhoto failed'
        );
      }

      return res.status(200).json({
        success: true,
        method: 'sendPhoto',
        result: photoResult,
      });
    } catch (photoError) {
      console.error('sendPhoto failed:', photoError);

      const fallback = await sendMessage(bulletin);

      return res.status(200).json({
        success: true,
        method: 'fallback-sendMessage',
        result: fallback,
      });
    }
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
    });
  }
}
