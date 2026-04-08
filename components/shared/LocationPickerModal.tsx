'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Loader2, Check, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Dynamic import for Leaflet elements (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })

import { useMapEvents } from 'react-leaflet'

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (data: { address: string; lat: number; lng: number }) => void
  initialAddress?: string
}

// Helper component to handle map clicks
function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: any) {
      onClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

const LocationPickerModal = ({ isOpen, onClose, onSelect, initialAddress }: LocationPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState(initialAddress || '')
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Fix for Leaflet marker icons in Next.js
  const L = typeof window !== 'undefined' ? require('leaflet') : null
  const customIcon = useMemo(() => {
    if (!L) return null
    return new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }, [L])

  // Search address using Nominatim
  const handleSearch = async (query: string) => {
    if (!query) return
    setLoading(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reverse geocode coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      setSelectedAddress(data.display_name)
      setSearchQuery(data.display_name)
      setPosition([lat, lng])
    } catch (error) {
      console.error('Reverse geocode error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setPosition([lat, lon])
    setSelectedAddress(result.display_name)
    setSearchQuery(result.display_name)
    setSearchResults([])
  }

  const handleConfirm = () => {
    if (position) {
      onSelect({
        address: selectedAddress,
        lat: position[0],
        lng: position[1]
      })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl h-[85vh] max-h-[800px] flex flex-col p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl" showCloseButton={true}>
        <DialogHeader className="p-6 bg-white border-b border-slate-100 shrink-0 text-left">
          <DialogTitle className="text-lg font-bold text-slate-800 tracking-tight">Mission Location Picker</DialogTitle>
          
          <div className="mt-4 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0064E0] transition-colors" />
            <Input 
              placeholder="Search for terminal, street, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="h-12 pl-11 pr-12 rounded-xl border-slate-200 bg-slate-50 font-medium focus:bg-white focus:shadow-sm focus:border-[#0064E0]/30 transition-all text-sm"
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
            
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectResult(res)}
                    className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-none"
                  >
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 line-clamp-1">{res.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-slate-100 min-h-0 w-full">
          {typeof window !== 'undefined' ? (
            <MapContainer 
              center={[51.1657, 10.4515]} // Germany
              zoom={6}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapEvents onClick={reverseGeocode} />
              {position && customIcon && (
                <Marker position={position} icon={customIcon} />
              )}
            </MapContainer>
          ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-sm animate-pulse">
               Loading Map Interface...
             </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 flex items-center justify-between sm:justify-between shrink-0">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 mb-0.5">Selected Location</span>
            <span className="text-sm font-medium text-slate-900 truncate max-w-[200px] sm:max-w-[350px]">
              {selectedAddress || 'Click map or search...'}
            </span>
          </div>
          <div className="flex gap-2">
             <Button variant="ghost" onClick={onClose} className="h-10 rounded-lg px-4 font-medium text-slate-500 hover:text-slate-900 text-sm">
               Cancel
             </Button>
             <Button 
               onClick={handleConfirm}
               disabled={!position || loading}
               className="h-10 rounded-lg px-6 bg-[#0064E0] hover:bg-blue-700 text-white font-medium shadow-sm transition-all text-sm disabled:opacity-50"
             >
               Confirm Location
             </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <style jsx global>{`
        .leaflet-container {
          filter: grayscale(10%) contrast(105%);
          cursor: crosshair !important;
        }
      `}</style>
    </Dialog>
  )
}

export default LocationPickerModal
