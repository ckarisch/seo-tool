// types/stripe.d.ts
declare global {
    namespace NodeJS {
      interface ProcessEnv {
        STRIPE_SECRET_KEY: string
        NEXT_PUBLIC_API_DOMAIN: string
        NEXT_PUBLIC_FE_DOMAIN: string
        PREMIUM_PRICE_ID: string
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
      }
    }
  }
  
  export {}