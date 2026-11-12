export default function BrandLogo({ decorative = false }: { decorative?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element -- This static WebP is already sized and encoded for the site's logo slots.
  return <img className="star-plan-logo" src="/media/star-plan-logo.webp" alt={decorative ? "" : "星光计划"} width={720} height={328} />;
}
