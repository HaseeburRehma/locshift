'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface MapSelectorProps {
  onLocationSelect: (lat: number, lng: number) => void
  initialPos?: [number, number]
}

function LocationMarker({ onLocationSelect, initialPos }: MapSelectorProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialPos ? L.latLng(initialPos[0], initialPos[1]) : null
  )
  
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng.lat, e.latlng.lng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  useEffect(() => {
    if (initialPos && !position) {
      setPosition(L.latLng(initialPos[0], initialPos[1]))
    }
  }, [initialPos])

  return position === null ? null : (
    <Marker position={position} icon={icon} />
  )
}

// Component to handle external view changes (like GPS button)
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export default function MapSelector({ onLocationSelect, initialPos = [51.1657, 10.4515] }: MapSelectorProps) {
  return (
    <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-zinc-200 shadow-inner relative z-0">
      <MapContainer
        center={initialPos}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} initialPos={initialPos} />
        <ChangeView center={initialPos} />
      </MapContainer>
      <div className="absolute bottom-2 right-2 z-[1000] bg-white/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-zinc-500 pointer-events-none border border-zinc-200">
        PIN TO SELECT
      </div>
    </div>
  )
}
