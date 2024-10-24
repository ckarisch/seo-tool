// app/api/types.ts
export interface ErrorResponse {
    error: string
  }
  
  export interface CheckoutResponse {
    clientSecret: string
  }
  
  export interface SessionResponse {
    status: string | null
    customer_email: string | null
  }