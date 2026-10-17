type AvatarProps = {
  name?: string | null;
  src?: string | null;
  className?: string;
  alt?: string;
};

export default function Avatar({ name, src, className = "", alt = "" }: AvatarProps) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (src) {
    return <img src={src} alt={alt || name || "User avatar"} className={className} />;
  }

  return (
    <span
      aria-label={alt || `${name || "User"} avatar`}
      className={`inline-flex items-center justify-center bg-secondary text-secondary-foreground font-semibold ${className}`}
    >
      {initials}
    </span>
  );
}
