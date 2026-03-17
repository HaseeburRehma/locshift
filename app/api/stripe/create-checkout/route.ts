import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type StripePaymentMethod = 'card' | 'sepa_debit' | 'sofort' | 'giropay'

const PAYMENT_METHOD_MAP: Record<string, StripePaymentMethod[]> = {
  sepa_debit: ['sepa_debit'],
  sofort: ['sofort'],
  giropay: ['giropay'],
  card: ['card'],
}

export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, credits, paymentMethod = 'sepa_debit' } = await request.json()

    if (!amount || amount < 10) {
      return NextResponse.json({ error: 'Minimum amount is 10€' }, { status: 400 })
    }

    const paymentMethods = PAYMENT_METHOD_MAP[paymentMethod] ?? ['card']
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethods as any[],
      mode: 'payment',
      currency: 'eur',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `FixDone Credits — ${credits} Credits`,
              description: `Top up your FixDone account with ${credits} credits`,
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        description: `FixDone credit top-up — ${credits} credits`,
        metadata: {
          user_id: user.id,
          credits: credits.toString(),
        },
      },
      customer_email: user.email ?? undefined,
      billing_address_collection: 'auto',
      success_url: `${appUrl}/dashboard/finance?success=true&session_id={CHECKOUT_SESSION_ID}&credits=${credits}`,
      cancel_url: `${appUrl}/dashboard/finance/add-credits?cancelled=true`,
      metadata: {
        user_id: user.id,
        credits: credits.toString(),
        payment_method: paymentMethod,
      },
      // 30-minute expiry
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    })

    // Log pending payment — fails gracefully if table doesn't exist yet
    try {
      await supabase
        .from('stripe_payments' as any)
        .insert({
          stripe_session_id: session.id,
          user_id: user.id,
          amount,
          credits_to_add: credits,
          status: 'pending',
          payment_method: paymentMethod,
        })
    } catch (err: any) {
      console.warn('[create-checkout] stripe_payments table may not exist yet:', err?.message)
    }

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: any) {
    console.error('[create-checkout] Error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
