import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [btcPrice, setBtcPrice] = useState('...');

  // Binance'den arayüz için anlık fiyatı çekme (Arayüz görseli için)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const data = await res.json();
        if (data && data.price) {
          const parsed = parseFloat(data.price);
          setBtcPrice('$' + parsed.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      } catch (e) {
        console.error('Fiyat yüklenemedi:', e);
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  // Otomatik Fotoğraflı Gönderim Tetikleyicisi
  const handleSendAnalysis = async () => {
    setLoading(true);
    try {
      // Ekranda TradingView grafiğinin olduğu div konteynerini ID ile yakalıyoruz
      const element = document.getElementById('tradingview-container');
      
      if (!element) {
        alert('Grafik alanı bulunamadı!');
        setLoading(false);
        return;
      }

      // Grafik alanının o anki canlı görüntüsünün fotoğrafını çekiyoruz
      const canvas = await html2canvas(element, {
        useCORS: true, // Dış kaynaklı TradingView grafik verisine izin ver
        logging: false,
        backgroundColor: '#131722' // Arka planın koyu temada kalmasını garanti et
      });
      
      // Fotoğrafı Telegram'ın okuyabileceği ham base64 resim datasına çeviriyoruz
      const screenshotImage = canvas.toDataURL('image/png');

      // Hazırlanan resmi backend API'mize postalıyoruz
      const response = await fetch('/api/btc-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: screenshotImage }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Bülten ve Canlı Grafik Ekranı Kanala Başarıyla Gönderildi! 🎉');
      } else {
        alert('Telegram gönderim hatası: ' + data.error);
      }
    } catch (error: any) {
      console.error(error);
      alert('Sistem tetiklenirken bir hata oluştu: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px' }}>
      
      {/* Üst Başlık Alanı */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          📈 Barbi Analiz Otonom Panel
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px' }}>7/24 Arka Plan Akıllı Haber ve Görsel Analiz Sistemi</p>
      </div>

      {/* CANLI TRADINGVIEW GRAFİK ALANI (Fotoğrafı Tam Buradan Çekecek) */}
      <div 
        id="tradingview-container" 
        style={{ 
          maxWidth: '900px', 
          margin: '0 auto 40px auto', 
          backgroundColor: '#131722', 
          borderRadius: '12px', 
          padding: '15px', 
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          border: '1px solid #1e293b'
        }}
      >
        <div style={{ height: '450px', width: '100%' }}>
          <iframe
            title="TradingView Chart"
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE%3ABTCUSDT&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Europe%2FIstanbul"
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
          />
        </div>
      </div>

      {/* Kontrol ve Durum Kutusu */}
      <div style={{ maxWidth: '450px', margin: '0 auto', backgroundColor: '#1e293b', borderRadius: '12px', padding: '25px', border: '1px solid #334155', textAlign: 'center' }}>
        <h3 style={{ fontSize: '16px', color: '#38bdf8', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📡 Otonom Bot Durumu
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Canlı BTC Fiyatı</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{btcPrice}</span>
        </div>

        {/* Tetikleme Butonu */}
        <button
          onClick={handleSendAnalysis}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: loading ? '#0d9488' : '#10b981',
            color: '#white',
            fontWeight: 'bold',
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}
        >
          {loading ? '⚡ Fotoğraf Çekiliyor & Paylaşılıyor...' : '⚡ Şimdi Haber & Görsel Analiz Gönder'}
        </button>
      </div>

    </div>
  );
}
