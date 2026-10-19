import type {ImgHTMLAttributes} from 'react';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width' | 'height'>;
/** Static variants also work on the legacy runtime and during service outages. */
export default function BrandLogo({alt = 'Francesco Fracchia — Lezioni private', sizes = '265px', ...props}: Props) {
 // eslint-disable-next-line @next/next/no-img-element -- Pre-generated responsive files keep the logo available without image-server dependencies.
 return <img {...props} src="/francesco-fracchia-logo-512.webp"
  srcSet="/francesco-fracchia-logo-256.webp 256w, /francesco-fracchia-logo-512.webp 512w, /francesco-fracchia-logo-768.webp 768w"
  sizes={sizes} alt={alt} width={2172} height={724} decoding="async"/>;
}
