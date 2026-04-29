'use client'

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users, Navigation } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import 'leaflet/dist/leaflet.css'

// Dynamic import for Leaflet elements (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false })

interface MapProps {
  upcomingShifts: any[]
  activeShifts: any[]
  className?: string
}

const LiveOperationsMap = ({ upcomingShifts, activeShifts, className }: MapProps) => {
  const { locale } = useTranslation()
  // NB: this component already uses the variable `L` for the Leaflet library
  // import. Use `tr` for the locale-switch helper so the two don't collide.
  const tr = (de: string, en: string) => (locale === 'de' ? de : en)
  // Fix for Leaflet marker icons in Next.js
  const L = typeof window !== 'undefined' ? require('leaflet') : null

  const createActiveIcon = (avatarUrl?: string, name?: string) => {
    if (!L) return null
    const initials = name ? name.substring(0, 2).toUpperCase() : 'OP'
    
    const innerHtml = avatarUrl 
      ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
      : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #2563EB; color: white; font-weight: 900; font-size: 11px; text-transform: uppercase;">${initials}</div>`

    return new L.DivIcon({
      className: 'custom-div-icon',
      html: `
        <div style="width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.8); animation: pulse 2s infinite; overflow: hidden; background: white; position: relative; z-index: 2;">
          ${innerHtml}
        </div>
        <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid white; z-index: 1;"></div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
      popupAnchor: [0, -44]
    })
  }

  const idleIcon = useMemo(() => {
    if (!L) return null
    return new L.DivIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #94a3b8; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; opacity: 0.6;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    })
  }, [L])

  // Get current center based on active shifts or default
  const center: [number, number] = useMemo(() => {
    const firstActive = activeShifts.find(s => s.employee?.last_lat && s.employee?.last_lng)
    if (firstActive) return [firstActive.employee.last_lat, firstActive.employee.last_lng]
    const firstUpcoming = upcomingShifts.find(u => u.customer?.latitude && u.customer?.longitude)
    if (firstUpcoming) return [firstUpcoming.customer.latitude, firstUpcoming.customer.longitude]
    return [51.1657, 10.4515] // Center of Germany default
  }, [activeShifts, upcomingShifts])

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-500" />
            {tr('Live-Betrieb', 'Live operations')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {tr(
              'Echtzeit-Verfolgung aktiver Einsätze und anstehender Schichten',
              'Real-time tracking of active missions and upcoming assignments'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex gap-1 items-center border-blue-200 bg-blue-50 text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            {activeShifts.length} {tr('Aktiv', 'Active')}
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center bg-slate-50">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {upcomingShifts.length} {tr('Anstehend', 'Upcoming')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-xl h-[450px]">
        {typeof window !== 'undefined' ? (
          <MapContainer 
            center={center} 
            zoom={6} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Active Shifts - Employee Avatars */}
            {activeShifts.map((shift) => {
              const icon = createActiveIcon(shift.employee?.avatar_url, shift.employee?.full_name)
              return shift.employee?.last_lat && shift.employee?.last_lng && icon && (
                <Marker 
                  key={`active-${shift.id}`} 
                  position={[shift.employee.last_lat, shift.employee.last_lng]}
                  icon={icon}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-sm mb-1">{shift.employee.full_name}</p>
                      <p className="text-xs text-slate-500 mb-2">
                        {tr('Aktive Schicht', 'Active shift')} @ {shift.customer?.name || tr('Unbekannt', 'Unknown')}
                      </p>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none text-[10px]">
                        {tr('Eingestempelt:', 'Clocked in:')} {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Upcoming Shifts - Dim Gray */}
            {upcomingShifts.map((plan) => (
              plan.customer?.latitude && plan.customer?.longitude && idleIcon && (
                <Marker 
                  key={`upcoming-${plan.id}`} 
                  position={[plan.customer.latitude, plan.customer.longitude]}
                  icon={idleIcon}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-sm mb-1">{plan.employee?.full_name}</p>
                      <p className="text-xs text-slate-500 mb-2">
                        {tr('Zugewiesener Einsatz', 'Assigned mission')} @ {plan.customer?.name}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {tr('Beginn:', 'Starts:')} {new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse">
            <span className="text-slate-400">{tr('Live-Karte wird geladen…', 'Loading live operational map…')}</span>
          </div>
        )}
      </CardContent>

      <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .leaflet-container {
          filter: grayscale(10%) contrast(105%);
        }
      `}</style>
    </Card>
  )
}

export default LiveOperationsMap
