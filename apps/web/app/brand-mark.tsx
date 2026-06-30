import { brand } from '@/lib/brand';

type BrandMarkProps = {
  tone?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
};

export function BrandMark({ tone = 'dark', compact = false, className = '' }: BrandMarkProps) {
  const classNames = ['brandMark', tone === 'light' ? 'light' : '', compact ? 'compact' : '', className].filter(Boolean).join(' ');
  return (
    <span className={classNames}>
      <img src={compact ? brand.iconPath : brand.logoPath} alt={`${brand.name} logo`} />
      {compact && <b>{brand.shortName}</b>}
    </span>
  );
}
