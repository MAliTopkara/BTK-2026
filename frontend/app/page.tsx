export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-full px-4 py-1.5 text-sm text-[#888] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
          BTK Akademi Hackathon 2026
        </div>

        <h1 className="font-serif text-5xl md:text-7xl text-white mb-6 leading-tight">
          TrustLens AI
        </h1>

        <p className="text-xl md:text-2xl text-[#888] mb-4 max-w-xl mx-auto">
          &ldquo;Bu ürün güvenilir mi?&rdquo; sorusunu{" "}
          <span className="text-[#00ff88]">8 saniyede</span>, şeffaf gerekçelerle cevaplayan
          AI asistanı.
        </p>

        <p className="text-[#555] mb-12">
          7 paralel yapay zeka katmanı · Gemini 2.5 Pro · Türkiye&apos;ye özel
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/dashboard"
            className="bg-[#00ff88] text-black font-semibold px-8 py-3 rounded-lg hover:bg-[#00cc6a] transition-colors"
          >
            Hemen Dene
          </a>
          <a
            href="https://github.com/MAliTopkara/BTK-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#2a2a2a] text-white px-8 py-3 rounded-lg hover:border-[#444] transition-colors"
          >
            GitHub →
          </a>
        </div>
      </div>

      {/* 7 Katman Grid */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto w-full px-4">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors"
          >
            <div className="text-2xl mb-2">{layer.icon}</div>
            <h3 className="text-sm font-semibold text-white mb-1">{layer.name}</h3>
            <p className="text-xs text-[#666]">{layer.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-16 text-[#444] text-sm">
        TrustLens AI · BTK Akademi Hackathon 2026
      </p>
    </main>
  );
}

const layers = [
  { id: 1, icon: "🔍", name: "Sahte Yorum Tespiti", desc: "TF-IDF + burst analizi + Gemini" },
  { id: 2, icon: "💰", name: "Sahte İndirim", desc: "90 günlük fiyat geçmişi" },
  { id: 3, icon: "🎯", name: "Manipülatif Tasarım", desc: "Dark patterns tespiti" },
  { id: 4, icon: "🏪", name: "Satıcı Profili", desc: "Yaş, puan, ürün analizi" },
  { id: 5, icon: "🖼️", name: "Görsel Doğrulama", desc: "Gemini Vision ile stok fotoğraf" },
  { id: 6, icon: "🌐", name: "Çapraz Platform", desc: "Daha iyi seçenek var mı?" },
  { id: 7, icon: "🛡️", name: "Phishing Tarama", desc: "SMS/email analizi" },
  { id: 8, icon: "🧠", name: "Karar Motoru", desc: "Gemini 2.5 Pro reasoning" },
];
