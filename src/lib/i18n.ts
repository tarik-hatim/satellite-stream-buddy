export const LANGS = ["ar", "fr", "en", "es", "pt", "de", "tr"] as const;
export type Lang = (typeof LANGS)[number];
export const isSupportedLang = (l: string): l is Lang => (LANGS as readonly string[]).includes(l);
export const isRtl = (l: Lang) => l === "ar";

export const LANG_NAMES: Record<Lang, string> = {
  ar: "العربية", fr: "Français", en: "English", es: "Español", pt: "Português", de: "Deutsch", tr: "Türkçe",
};

const en = {
  tagline: "Satellite TV guide",
  search: "Search channels…",
  tv: "TV",
  radio: "Radio",
  all: "All",
  satellites: "Satellites",
  settings: "Settings",
  language: "Interface language",
  languageHint: "Overrides your device language.",
  satellitesHint: "Turn any satellite on or off. No restrictions.",
  channelLang: "Channel language",
  anyLang: "Any language",
  freeOnly: "Free-to-air only",
  channels: "channels",
  loading: "Loading channel catalog…",
  noResults: "No channels match your filters.",
  showMore: "Show more",
  now: "Now",
  next: "Next",
  noEpg: "No guide data for this channel.",
  loadEpg: "Load TV guide",
  epgLoading: "Loading guide…",
  epgError: "Guide source unreachable. Try again later.",
  encrypted: "Encrypted",
  fta: "Free",
  close: "Close",
  resetAuto: "Reset to automatic detection",
  detected: "Detected region",
  importFile: "Import CHMAX JSON",
  imported: "Catalog imported",
  exitTitle: "Exit PulseEPG?",
  exitBody: "Your satellites and preferences are saved.",
  exit: "Exit",
  stay: "Stay",
  region_MENA: "North Africa & Middle East",
  region_LATAM: "Latin America",
  region_EUROPE: "Europe",
  region_TURKEY: "Turkey",
  region_UNKNOWN: "Unknown",
  frequency: "Frequency",
};
export type Dict = typeof en;

const fr: Dict = {
  tagline: "Guide TV satellite", search: "Rechercher des chaînes…", tv: "TV", radio: "Radio", all: "Tous",
  satellites: "Satellites", settings: "Paramètres", language: "Langue de l'interface",
  languageHint: "Remplace la langue de l'appareil.", satellitesHint: "Activez ou désactivez n'importe quel satellite.",
  channelLang: "Langue des chaînes", anyLang: "Toutes les langues", freeOnly: "Chaînes en clair uniquement",
  channels: "chaînes", loading: "Chargement du catalogue…", noResults: "Aucune chaîne ne correspond.",
  showMore: "Afficher plus", now: "En cours", next: "Ensuite", noEpg: "Pas de programme pour cette chaîne.",
  loadEpg: "Charger le guide TV", epgLoading: "Chargement du guide…", epgError: "Source du guide injoignable.",
  encrypted: "Crypté", fta: "Clair", close: "Fermer", resetAuto: "Revenir à la détection automatique",
  detected: "Région détectée", importFile: "Importer un JSON CHMAX", imported: "Catalogue importé",
  exitTitle: "Quitter PulseEPG ?", exitBody: "Vos satellites et préférences sont enregistrés.", exit: "Quitter",
  stay: "Rester", region_MENA: "Afrique du Nord & Moyen-Orient", region_LATAM: "Amérique latine",
  region_EUROPE: "Europe", region_TURKEY: "Turquie", region_UNKNOWN: "Inconnue", frequency: "Fréquence",
};
const ar: Dict = {
  tagline: "دليل القنوات الفضائية", search: "ابحث عن قناة…", tv: "تلفزيون", radio: "راديو", all: "الكل",
  satellites: "الأقمار الصناعية", settings: "الإعدادات", language: "لغة الواجهة", languageHint: "تتجاوز لغة الجهاز.",
  satellitesHint: "فعّل أو عطّل أي قمر صناعي بدون قيود.", channelLang: "لغة القناة", anyLang: "كل اللغات",
  freeOnly: "القنوات المجانية فقط", channels: "قناة", loading: "جارٍ تحميل القنوات…", noResults: "لا توجد قنوات مطابقة.",
  showMore: "عرض المزيد", now: "الآن", next: "التالي", noEpg: "لا يوجد دليل برامج لهذه القناة.",
  loadEpg: "تحميل دليل البرامج", epgLoading: "جارٍ تحميل الدليل…", epgError: "تعذّر الوصول إلى مصدر الدليل.",
  encrypted: "مشفّرة", fta: "مجانية", close: "إغلاق", resetAuto: "العودة إلى الاكتشاف التلقائي",
  detected: "المنطقة المكتشفة", importFile: "استيراد ملف CHMAX JSON", imported: "تم استيراد القائمة",
  exitTitle: "الخروج من PulseEPG؟", exitBody: "تم حفظ الأقمار والتفضيلات.", exit: "خروج", stay: "البقاء",
  region_MENA: "شمال أفريقيا والشرق الأوسط", region_LATAM: "أمريكا اللاتينية", region_EUROPE: "أوروبا",
  region_TURKEY: "تركيا", region_UNKNOWN: "غير معروفة", frequency: "التردد",
};
const es: Dict = {
  tagline: "Guía de TV satelital", search: "Buscar canales…", tv: "TV", radio: "Radio", all: "Todos",
  satellites: "Satélites", settings: "Ajustes", language: "Idioma de la interfaz", languageHint: "Sustituye el idioma del dispositivo.",
  satellitesHint: "Activa o desactiva cualquier satélite sin restricciones.", channelLang: "Idioma del canal",
  anyLang: "Cualquier idioma", freeOnly: "Solo canales abiertos", channels: "canales", loading: "Cargando catálogo…",
  noResults: "Ningún canal coincide.", showMore: "Ver más", now: "Ahora", next: "Después", noEpg: "Sin guía para este canal.",
  loadEpg: "Cargar guía TV", epgLoading: "Cargando guía…", epgError: "Fuente de la guía no disponible.",
  encrypted: "Codificado", fta: "Abierto", close: "Cerrar", resetAuto: "Volver a la detección automática",
  detected: "Región detectada", importFile: "Importar JSON CHMAX", imported: "Catálogo importado",
  exitTitle: "¿Salir de PulseEPG?", exitBody: "Tus satélites y preferencias están guardados.", exit: "Salir",
  stay: "Quedarse", region_MENA: "Norte de África y Oriente Medio", region_LATAM: "América Latina",
  region_EUROPE: "Europa", region_TURKEY: "Turquía", region_UNKNOWN: "Desconocida", frequency: "Frecuencia",
};
const pt: Dict = {
  tagline: "Guia de TV por satélite", search: "Buscar canais…", tv: "TV", radio: "Rádio", all: "Todos",
  satellites: "Satélites", settings: "Configurações", language: "Idioma da interface", languageHint: "Substitui o idioma do aparelho.",
  satellitesHint: "Ative ou desative qualquer satélite sem restrições.", channelLang: "Idioma do canal",
  anyLang: "Qualquer idioma", freeOnly: "Apenas canais abertos", channels: "canais", loading: "Carregando catálogo…",
  noResults: "Nenhum canal encontrado.", showMore: "Mostrar mais", now: "Agora", next: "A seguir", noEpg: "Sem guia para este canal.",
  loadEpg: "Carregar guia de TV", epgLoading: "Carregando guia…", epgError: "Fonte do guia indisponível.",
  encrypted: "Codificado", fta: "Aberto", close: "Fechar", resetAuto: "Voltar à detecção automática",
  detected: "Região detectada", importFile: "Importar JSON CHMAX", imported: "Catálogo importado",
  exitTitle: "Sair do PulseEPG?", exitBody: "Seus satélites e preferências estão salvos.", exit: "Sair",
  stay: "Ficar", region_MENA: "Norte da África e Oriente Médio", region_LATAM: "América Latina",
  region_EUROPE: "Europa", region_TURKEY: "Turquia", region_UNKNOWN: "Desconhecida", frequency: "Frequência",
};
const de: Dict = {
  tagline: "Satelliten-TV-Guide", search: "Sender suchen…", tv: "TV", radio: "Radio", all: "Alle",
  satellites: "Satelliten", settings: "Einstellungen", language: "Sprache der Oberfläche", languageHint: "Ersetzt die Gerätesprache.",
  satellitesHint: "Jeden Satelliten frei ein- oder ausschalten.", channelLang: "Sendersprache", anyLang: "Alle Sprachen",
  freeOnly: "Nur frei empfangbar", channels: "Sender", loading: "Senderliste wird geladen…", noResults: "Keine passenden Sender.",
  showMore: "Mehr anzeigen", now: "Jetzt", next: "Danach", noEpg: "Keine Programmdaten für diesen Sender.",
  loadEpg: "TV-Programm laden", epgLoading: "Programm wird geladen…", epgError: "Programmquelle nicht erreichbar.",
  encrypted: "Verschlüsselt", fta: "Frei", close: "Schließen", resetAuto: "Automatische Erkennung wiederherstellen",
  detected: "Erkannte Region", importFile: "CHMAX-JSON importieren", imported: "Senderliste importiert",
  exitTitle: "PulseEPG beenden?", exitBody: "Satelliten und Einstellungen sind gespeichert.", exit: "Beenden",
  stay: "Bleiben", region_MENA: "Nordafrika & Naher Osten", region_LATAM: "Lateinamerika", region_EUROPE: "Europa",
  region_TURKEY: "Türkei", region_UNKNOWN: "Unbekannt", frequency: "Frequenz",
};
const tr: Dict = {
  tagline: "Uydu TV rehberi", search: "Kanal ara…", tv: "TV", radio: "Radyo", all: "Tümü",
  satellites: "Uydular", settings: "Ayarlar", language: "Arayüz dili", languageHint: "Cihaz dilini geçersiz kılar.",
  satellitesHint: "Herhangi bir uyduyu kısıtlamasız açıp kapatın.", channelLang: "Kanal dili", anyLang: "Tüm diller",
  freeOnly: "Yalnızca şifresiz", channels: "kanal", loading: "Kanal listesi yükleniyor…", noResults: "Eşleşen kanal yok.",
  showMore: "Daha fazla", now: "Şimdi", next: "Sonra", noEpg: "Bu kanal için yayın akışı yok.",
  loadEpg: "Yayın akışını yükle", epgLoading: "Yayın akışı yükleniyor…", epgError: "Yayın akışı kaynağına ulaşılamıyor.",
  encrypted: "Şifreli", fta: "Şifresiz", close: "Kapat", resetAuto: "Otomatik algılamaya dön",
  detected: "Algılanan bölge", importFile: "CHMAX JSON içe aktar", imported: "Liste içe aktarıldı",
  exitTitle: "PulseEPG'den çıkılsın mı?", exitBody: "Uydularınız ve tercihleriniz kaydedildi.", exit: "Çık",
  stay: "Kal", region_MENA: "Kuzey Afrika ve Orta Doğu", region_LATAM: "Latin Amerika", region_EUROPE: "Avrupa",
  region_TURKEY: "Türkiye", region_UNKNOWN: "Bilinmiyor", frequency: "Frekans",
};

const X = {
  en: ["Live now","TV Grid","Favorites","Category","Sat","Bouquet","Zone","Genre","All genres","Catch-up","Today","Remind me","Reminder set","left","LIVE","Upcoming","Ended","programmes","Guide zones","Choose which epgshare01 regions to download.","No favorites yet. Tap the heart on a channel.","channels displayed out of","active programmes","Programme synopsis","Audio","All day","Morning","Afternoon","Evening","Night","Starting now","Refresh guide","Programme schedule","min"],
  fr: ["En direct","Grille TV","Favoris","Catégorie","Sat","Bouquet","Zone","Genre","Tous les genres","Replay","Aujourd'hui","Me rappeler","Rappel activé","restant","DIRECT","À venir","Terminé","programmes","Zones du guide","Choisissez les régions epgshare01 à télécharger.","Aucun favori. Touchez le cœur d'une chaîne.","chaînes affichées sur","programmes en cours","Synopsis","Audio","Toute la journée","Matin","Après-midi","Soirée","Nuit","Commence maintenant","Actualiser le guide","Programme de la journée","min"],
  ar: ["مباشر الآن","شبكة البرامج","المفضلة","الفئة","القمر","الباقة","المنطقة","النوع","كل الأنواع","إعادة","اليوم","ذكّرني","تم ضبط التذكير","متبقية","مباشر","قادم","انتهى","برامج","مناطق الدليل","اختر مناطق epgshare01 للتحميل.","لا توجد مفضلة بعد. اضغط على القلب.","قناة معروضة من","برنامج جارٍ","ملخص البرنامج","الصوت","طوال اليوم","الصباح","الظهيرة","المساء","الليل","يبدأ الآن","تحديث الدليل","جدول البرامج","د"],
  es: ["En directo","Parrilla TV","Favoritos","Categoría","Sat","Paquete","Zona","Género","Todos los géneros","Diferido","Hoy","Recordarme","Recordatorio activado","restantes","EN VIVO","Próximo","Terminado","programas","Zonas de la guía","Elige qué regiones de epgshare01 descargar.","Sin favoritos. Toca el corazón de un canal.","canales mostrados de","programas en emisión","Sinopsis","Audio","Todo el día","Mañana","Tarde","Noche","Madrugada","Empieza ahora","Actualizar guía","Programación","min"],
  pt: ["Ao vivo","Grade de TV","Favoritos","Categoria","Sat","Pacote","Zona","Gênero","Todos os gêneros","Catch-up","Hoje","Lembrar","Lembrete ativado","restantes","AO VIVO","A seguir","Encerrado","programas","Zonas do guia","Escolha quais regiões do epgshare01 baixar.","Sem favoritos. Toque no coração de um canal.","canais exibidos de","programas no ar","Sinopse do programa","Áudio","O dia todo","Manhã","Tarde","Noite","Madrugada","Começando agora","Atualizar guia","Programação","min"],
  de: ["Jetzt live","TV-Raster","Favoriten","Kategorie","Sat","Paket","Zone","Genre","Alle Genres","Rückblick","Heute","Erinnern","Erinnerung aktiv","übrig","LIVE","Demnächst","Beendet","Sendungen","Guide-Zonen","Wähle die epgshare01-Regionen zum Laden.","Noch keine Favoriten. Tippe auf das Herz.","Sender angezeigt von","laufende Sendungen","Inhalt","Audio","Ganzer Tag","Morgen","Nachmittag","Abend","Nacht","Beginnt jetzt","Guide aktualisieren","Tagesprogramm","Min"],
  tr: ["Şimdi canlı","TV Akışı","Favoriler","Kategori","Uydu","Paket","Bölge","Tür","Tüm türler","Geçmiş","Bugün","Hatırlat","Hatırlatıcı kuruldu","kaldı","CANLI","Yakında","Bitti","program","Rehber bölgeleri","İndirilecek epgshare01 bölgelerini seçin.","Henüz favori yok. Kanaldaki kalbe dokunun.","kanal gösteriliyor /","yayındaki program","Program özeti","Ses","Tüm gün","Sabah","Öğleden sonra","Akşam","Gece","Şimdi başlıyor","Rehberi yenile","Yayın akışı","dk"],
} as const;
const XK = ["liveNow","grid","favorites","category","sat","bouquet","zone","genre","allGenres","catchup","today","remindMe","reminderSet","left","live","upcoming","ended","programmes","epgZones","zonesHint","noFavorites","displayedOf","activeProgs","synopsis","audio","allDay","morning","afternoon","evening","night","startingNow","refreshEpg","schedule","min"] as const;
type Extra = Record<(typeof XK)[number], string>;
const ext = (l: Lang) => Object.fromEntries(XK.map((k, i) => [k, X[l][i]])) as Extra;
export type FullDict = Dict & Extra;
export const DICTS: Record<Lang, FullDict> = {
  en: { ...en, ...ext("en") }, fr: { ...fr, ...ext("fr") }, ar: { ...ar, ...ext("ar") }, es: { ...es, ...ext("es") },
  pt: { ...pt, ...ext("pt") }, de: { ...de, ...ext("de") }, tr: { ...tr, ...ext("tr") },
};

/** Normalises ISO 639-1/639-2 audio tags (ara, fre, fra, ger, deu…) to UI codes. */
const AUDIO_MAP: Record<string, string> = {
  ar: "ar", ara: "ar", fr: "fr", fra: "fr", fre: "fr", en: "en", eng: "en", es: "es", spa: "es",
  pt: "pt", por: "pt", de: "de", deu: "de", ger: "de", tr: "tr", tur: "tr", it: "it", ita: "it",
  fa: "fa", per: "fa", fas: "fa", ru: "ru", rus: "ru", pl: "pl", pol: "pl", nl: "nl", dut: "nl", nld: "nl",
};
export const normalizeAudioLang = (l: string) => AUDIO_MAP[l.toLowerCase()] ?? null;
export const CHANNEL_LANGS = ["ar", "fr", "en", "es", "pt", "de", "tr", "it", "fa", "ru", "pl", "nl"] as const;
