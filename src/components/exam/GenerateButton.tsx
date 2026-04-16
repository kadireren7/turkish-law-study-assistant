'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

type GenerateButtonProps = {
  loading: boolean
  disabled?: boolean
  className?: string
}

function GenerateButtonInner({ loading, disabled, className = '' }: GenerateButtonProps) {
  return (
    <motion.button
      type="submit"
      disabled={disabled || loading}
      whileHover={disabled || loading ? undefined : { scale: 1.01 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      className={`btn-primary gradient-teal w-full px-6 py-3.5 text-[15px] font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${className}`}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-hidden
          />
          Hazırlanıyor
        </span>
      ) : (
        'Soruları oluştur'
      )}
    </motion.button>
  )
}

export const GenerateButton = memo(GenerateButtonInner)
