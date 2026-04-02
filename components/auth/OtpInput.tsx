//components/auth/OtpInput.tsx

'use client'

import React, { useRef, useState, useCallback } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Bug 1 fix: Remove useEffect entirely. Derive digits directly from the
  // controlled `value` prop on every render — no local state, no race condition.
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  const update = useCallback((newDigits: string[]) => {
    onChange(newDigits.join(''))
  }, [onChange])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(-1)
    if (!val && e.target.value !== '') return

    const newDigits = [...digits]
    newDigits[index] = val
    update(newDigits)

    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current cell
        const newDigits = [...digits]
        newDigits[index] = ''
        update(newDigits)
      } else if (index > 0) {
        // Move back and clear previous cell
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        update(newDigits)
        inputsRef.current[index - 1]?.focus()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
    const newDigits = Array.from({ length: 6 }, (_, i) => pastedData[i] ?? '')
    update(newDigits)
    const nextIndex = Math.min(pastedData.length, 5)
    inputsRef.current[nextIndex]?.focus()
  }

  const inputClass =
    'w-[52px] h-[58px] text-center border border-gray-200 rounded-xl text-[24px] font-bold text-gray-900 focus:border-[#0064E0] focus:ring-1 focus:ring-[#0064E0] outline-none transition-all placeholder:text-gray-200 disabled:opacity-40'

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      <div className="flex gap-2">
        {digits.slice(0, 3).map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={digit}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            disabled={disabled}
            maxLength={1}
            className={inputClass}
            placeholder="0"
          />
        ))}
      </div>

      <div className="text-gray-300 mx-1">
        <div className="w-4 h-[2px] bg-gray-300 rounded-full" />
      </div>

      <div className="flex gap-2">
        {digits.slice(3, 6).map((digit, i) => (
          <input
            key={i + 3}
            ref={(el) => { inputsRef.current[i + 3] = el }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={digit}
            onChange={(e) => handleChange(e, i + 3)}
            onKeyDown={(e) => handleKeyDown(e, i + 3)}
            onPaste={handlePaste}
            disabled={disabled}
            maxLength={1}
            className={inputClass}
            placeholder="0"
          />
        ))}
      </div>
    </div>
  )
}
