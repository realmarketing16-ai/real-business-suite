import { brand } from '@/lib/brand';

type BrandMarkProps = {
  tone?: 'light' | 'dark';
  compact?: boolean;
};

export function BrandMark({ tone = 'dark', compact = false }: BrandMarkProps) {
  return (
    <span className={`brandMark ${tone === 'light' ? 'light' : ''} ${compact ? 'compact' : ''}`}>
      <img src={compact ? brand.iconPath : brand.logoPath} alt={`${brand.name} logo`} />
      {compact && <b>{brand.shortName}</b>}
    </span>
  );
}
