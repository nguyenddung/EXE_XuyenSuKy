/** The "S scroll" logo with its wordmark (xuyen-su-ky-logo-turtle-files). Use the cream version on dark backgrounds. */
export function BrandLogo({ onDark = false }: { onDark?: boolean }) {
  return <img className="brand-logo" src={onDark ? '/images/brand/xuyen-su-ky-logo-on-dark.svg' : '/images/brand/xuyen-su-ky-logo.svg'} alt="Xuyên Sử Ký" width={155} height={36} />
}
