export function publicBrandName() {
  return (process.env.NEXT_PUBLIC_BRAND_NAME || process.env.BRAND_NAME || 'Real Business Suite').trim();
}

export function publicSupportContact() {
  return (process.env.NEXT_PUBLIC_SUPPORT_CONTACT || process.env.SUPPORT_CONTACT || 'your company contact').trim();
}
