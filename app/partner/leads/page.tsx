import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Zap, Clock, Info, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export default async function LeadMarketplacePage() {
  const supabase = await createClient()
  
  const { data: listings } = await supabase
    .from('lead_marketplace')
    .select('*')
    .eq('status', 'active')
    .order('listed_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marktplatz</h1>
          <p className="text-muted-foreground font-medium">Finden Sie neue Aufträge in Ihrer Region</p>
        </div>
        <div className="bg-purple-50 px-4 py-2 rounded-lg border border-purple-100 flex items-center gap-3">
          <Badge className="bg-purple-600 hover:bg-purple-600">€ 450.00</Badge>
          <span className="text-xs font-bold text-purple-700 uppercase tracking-tighter">Verfügbares Guthaben</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {listings?.map((listing) => (
          <MarketplaceCard key={listing.id} listing={listing} />
        ))}
        {(!listings || listings.length === 0) && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold">Keine Leads verfügbar</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2 text-sm">
              Aktuell gibt es keine offenen Angebote. Schauen Sie später wieder vorbei oder erweitern Sie Ihre Gebiete.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MarketplaceCard({ listing }: { listing: any }) {
  const preview = listing.lead_preview || {}
  
  return (
    <Card className="overflow-hidden border-purple-100 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex gap-2">
            <Badge className="bg-purple-600">{preview.service_type || 'Elektronik'}</Badge>
            {listing.is_exclusive && <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50">Exklusiv</Badge>}
          </div>
          <span className="text-2xl font-black text-purple-700">€{listing.price.toFixed(2)}</span>
        </div>
        <CardTitle className="text-xl group-hover:text-purple-600 transition-colors uppercase tracking-tight">
          {preview.service_type} - {listing.id.substring(0, 4)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {preview.postcode} {preview.city}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Vor {formatDistanceToNow(new Date(listing.listed_at), { locale: de })} gelistet
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-orange-500" />
            Dringlichkeit: {preview.urgency}
          </div>
        </div>
        
        <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-sm italic text-muted-foreground">
          "{preview.description_preview}..."
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button className="w-full bg-purple-600 hover:bg-purple-700 h-10 font-bold" size="lg">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Lead kaufen
        </Button>
      </CardFooter>
    </Card>
  )
}
