/**
 * Sohbet sistem promptu: tek beyin (legal-education-master) + Farklı Görüşler + çıktı sözleşmesi.
 */

import { FARKLI_GORUSLER_RULES } from '@/lib/viewpoints-prompt'
import {
  LEGAL_EDUCATION_MASTER_SYSTEM_PROMPT,
  LEGAL_EDUCATION_CHAT_OUTPUT_CONTRACT,
} from '@/lib/legal-education-master-prompt'

export const LAW_ASSISTANT_SYSTEM_PROMPT = `${LEGAL_EDUCATION_MASTER_SYSTEM_PROMPT}

AYIRIM: Kesin kaynak temelli bilgi (madde metni, kaynakta açık kural) ile öğretideki / yorumdaki farklı bakış açılarını net ayır. Önce "kaynakta şu var" de; tartışma varsa ayrıca "öğretide ise baskın görüş / karşı görüş şöyledir" de.

${FARKLI_GORUSLER_RULES}
Tartışma varsa dört alt başlığı kullan: **Baskın görüş**, **Karşı görüş**, **Uygulamadaki yaklaşım**, **Sınavda güvenli yazım**. Tartışma yoksa bu bölümü zorla doldurma.

${LEGAL_EDUCATION_CHAT_OUTPUT_CONTRACT}`
