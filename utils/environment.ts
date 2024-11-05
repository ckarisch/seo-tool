export const isPreviewEnv = (): boolean => {
  // Check for preview deployment on Vercel
  if (process.env.VERCEL_ENV === 'preview') return true;
  
  // Check for development environment
  if (process.env.NODE_ENV === 'development') return true;
  
  // Check for explicitly set preview flag
  if (process.env.NEXT_PUBLIC_IS_PREVIEW === 'true') return true;
  
  return false;
};