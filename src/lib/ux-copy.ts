import type { Lang } from "./i18n";

export const UX_COPY: Record<Lang, { filters: string; clear: string; results: string; device: string; auto: string; mobile: string; poster: string }> = {
  fr: { filters: "Filtres", clear: "Effacer", results: "Voir les résultats", device: "Appareil", auto: "Automatique", mobile: "Mobile / tactile", poster: "Affiche indisponible" },
  en: { filters: "Filters", clear: "Clear", results: "Show results", device: "Device", auto: "Automatic", mobile: "Mobile / touch", poster: "Poster unavailable" },
  ar: { filters: "الفلاتر", clear: "مسح", results: "عرض النتائج", device: "الجهاز", auto: "تلقائي", mobile: "الهاتف / اللمس", poster: "الملصق غير متوفر" },
  es: { filters: "Filtros", clear: "Borrar", results: "Ver resultados", device: "Dispositivo", auto: "Automático", mobile: "Móvil / táctil", poster: "Póster no disponible" },
  pt: { filters: "Filtros", clear: "Limpar", results: "Ver resultados", device: "Dispositivo", auto: "Automático", mobile: "Celular / toque", poster: "Pôster indisponível" },
  de: { filters: "Filter", clear: "Zurücksetzen", results: "Ergebnisse anzeigen", device: "Gerät", auto: "Automatisch", mobile: "Mobil / Touch", poster: "Poster nicht verfügbar" },
  tr: { filters: "Filtreler", clear: "Temizle", results: "Sonuçları göster", device: "Cihaz", auto: "Otomatik", mobile: "Mobil / dokunmatik", poster: "Afiş mevcut değil" },
};