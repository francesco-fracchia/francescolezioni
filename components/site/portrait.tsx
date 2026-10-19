type Props = {className?: string; placement: 'home' | 'profile'};
const widths = [160, 320, 480, 640, 960];
const sources = (format: string) => widths.map(width => `/images/francesco-ritratto-${width}.${format} ${width}w`).join(', ');
export default function Portrait({className, placement}: Props) {
 const sizes = placement === 'home' ? '(max-width: 780px) 160px, 220px' : '(max-width: 480px) 144px, (max-width: 780px) 160px, 250px';
 return <picture><source type="image/avif" srcSet={sources('avif')} sizes={sizes}/>
  <img className={className} src="/images/francesco-ritratto-480.webp" srcSet={sources('webp')} sizes={sizes}
   alt="Francesco Fracchia" width={1113} height={1413} loading={placement === 'home' ? 'lazy' : 'eager'} decoding="async"/>
 </picture>;
}
