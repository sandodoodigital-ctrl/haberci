backgroundColor: '#131722'
      }
    };

    const chartUrl = `https://quickchart.io/chart?w=800&h=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    // 4. Telegram Mesaj Metni Formatlama (Temizlendi & Yasal Uyarı Eklendi)
    const captionText = `🚀 <b>BTC GÜNLÜK TEKNİK ANALİZ</b>

💰 <b>Güncel BTC Fiyatı:</b> $${escapeHtml(currentPrice.toLocaleString('en-US'))}
📊 <b>RSI (14):</b> ${escapeHtml(rsiValue.toFixed(2))}
📈 <b>MACD:</b> ${escapeHtml(macdData.macd.toFixed(2))} (Sinyal: ${escapeHtml(macdData.signal.toFixed(2))})
📉 <b>Trend Yorumu:</b> ${escapeHtml(trendComment)}
🎯 <b>Destek Seviyesi:</b> $${escapeHtml(support1.toFixed(2))}
🚀 <b>Direnç Seviyesi:</b> $${escapeHtml(resistance1.toFixed(2))}

⚠️ <i>YASAL UYARI: Bu analiz ve sinyaller yatırım tavsiyesi içermez, tamamen bilgi amaçlıdır.</i>`;

    // --- Görseldeki O Jilet Gibi Butonların Tanımlandığı Kısım ---
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🔐 VIP Grup Bilgisi", url: "https://t.me/barbi_iletisim_bot" }
        ],
        [
          { text: "💬 Barbi ile İletişime Geç", url: "https://t.me/barbieanaliz" }
        ]
      ]
    };

    // 5. Telegram'a Gönderme (sendPhoto - Butonlar Dahil Edildi)
    let telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TARGET_CHANNEL,
        photo: chartUrl,
        caption: captionText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard // Butonları buraya bağladık kanka
      })
    });

    let result = await telegramRes.json();

    if (!result.ok) {
      // Hata durumunda devreye giren yedek mekanizma (sendMessage - Butonlar Dahil Edildi)
      telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TARGET_CHANNEL,
          text: captionText,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard // Yedek bota da butonları çaktık
        })
      });
      result = await telegramRes.json();
    }

    if (result.ok) {
      return res.status(200).json({ success: true, ...result });
    } else {
      return res.status(200).json({ success: false, error: result.description || 'Telegram API Error' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
