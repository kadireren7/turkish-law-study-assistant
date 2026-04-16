/** Son başarılı güncelleme bu süreden eskiyse otomatik RSS çekimi tetiklenir (günde bir kez değil). */
export const HABERLER_STALE_AFTER_MS = 45 * 60 * 1000

/** Aynı sekmede ardışık denemeler arası minimum bekleme (Strict Mode / çift tıklama). */
export const HABERLER_AUTO_ATTEMPT_COOLDOWN_MS = 2 * 60 * 1000
