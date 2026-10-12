export type Category = "sport" | "movies" | "news" | "kids" | "music" | "docs" | "other";

const RULES: [Category, RegExp][] = [
  ["sport", /sport|ποδόσφαιρο|μπάσκετ|piłka|mecz|maraton|athlet|boxe|boxing|cyclisme|ufc|nba|nfl|calcio|serie a|bundesliga|premier league|champions|botola|foot|soccer|match|ligue|liga|league|tennis|basket|rugby|f1|moto|رياض|كرة|spor|futebol|fútbol|deporte/i],
  ["movies", /film|movie|cin[eé]|s[ée]rie|series|drama|thriller|com[eé]d|أفلام|فيلم|مسلسل|dizi|filme|película/i],
  ["news", /news|info|journal|actualit|nachricht|noticia|notícia|أخبار|haber|jt\b|politi|m[ée]t[ée]o|weather/i],
  ["kids", /kid|enfant|jeunesse|cartoon|anim|child|kinder|infantil|أطفال|çocuk|niños/i],
  ["music", /music|musique|musik|música|concert|clip|موسيقى|müzik/i],
  ["docs", /docu|nature|histoire|history|science|wissen|وثائقي|belgesel/i],
];

export function categorize(text?: string): Category {
  if (!text) return "other";
  for (const [c, re] of RULES) if (re.test(text)) return c;
  return "other";
}

export const CATEGORY_ICON: Record<Category, string> = {
  sport: "🏆", movies: "🎬", news: "📰", kids: "🧸", music: "🎵", docs: "🌍", other: "📺",
};

export const CATEGORY_LABEL: Record<string, Record<Category, string>> = {
  en: { sport: "Sport / Football", movies: "Movies & Series", news: "News", kids: "Kids", music: "Music", docs: "Documentary", other: "Other" },
  fr: { sport: "Sport / Football", movies: "Films & Séries", news: "Actualités", kids: "Jeunesse", music: "Musique", docs: "Documentaires", other: "Autres" },
  ar: { sport: "رياضة / كرة القدم", movies: "أفلام ومسلسلات", news: "أخبار", kids: "أطفال", music: "موسيقى", docs: "وثائقي", other: "أخرى" },
  es: { sport: "Deporte / Fútbol", movies: "Películas y Series", news: "Noticias", kids: "Infantil", music: "Música", docs: "Documentales", other: "Otros" },
  pt: { sport: "Esporte / Futebol", movies: "Filmes e Séries", news: "Notícias", kids: "Infantil", music: "Música", docs: "Documentários", other: "Outros" },
  de: { sport: "Sport / Fußball", movies: "Filme & Serien", news: "Nachrichten", kids: "Kinder", music: "Musik", docs: "Dokus", other: "Sonstiges" },
  tr: { sport: "Spor / Futbol", movies: "Film & Dizi", news: "Haber", kids: "Çocuk", music: "Müzik", docs: "Belgesel", other: "Diğer" },
};
