'use client'

import React, { useState } from 'react'

const CHIPS = ['Tagesplan', 'Dienstplan', 'Berichte', 'Urlaub']

export function FilterChips() {
  const [active, setActive] = useState('Tagesplan')

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex gap-2 px-1">
        {CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => setActive(chip)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all ${
              active === chip 
                ? 'bg-white text-[#0064E0] border-2 border-[#0064E0] shadow-sm' 
                : 'bg-[#F0F4FF] text-gray-500 border-2 border-transparent hover:bg-blue-50'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
