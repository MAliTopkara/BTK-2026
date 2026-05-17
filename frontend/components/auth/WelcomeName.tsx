"use client";

import { useEffect, useState } from "react";

/**
 * Login sayfası sol panelinde kişiselleştirilmiş karşılama.
 * localStorage'dan önceki oturumda kaydedilen adı okur.
 * İlk render sunucu-uyumlu (isim yok), hydration sonrası isim gösterilir.
 */
export function WelcomeName() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tl_display_name");
    if (stored) setName(stored);
  }, []);

  if (!name) {
    return <span className="italic text-[var(--accent)]">hoş geldin</span>;
  }

  return (
    <>
      <span className="italic text-[var(--accent)]">hoş geldin</span>
      {", "}
      <span className="italic text-[var(--accent)]">{name}</span>
    </>
  );
}
