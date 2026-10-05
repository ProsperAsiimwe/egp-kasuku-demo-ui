import emblem from "./kasuku-emblem.png";

const KASUKU_NAME = "EGP 2.0 KASUKU";

export function KasukuMark({
  className,
  alt = KASUKU_NAME,
}: {
  className?: string;
  alt?: string;
}) {
  return <img src={emblem} alt={alt} className={className} draggable={false} />;
}
