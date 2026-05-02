"use client";
// ThemeLogo — always uses /logo.png (light theme only, single logo file).
// Place your logo at: public/logo.png
import Image from "next/image";

interface ThemeLogoProps {
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  alt?: string;
  imgClassName?: string;
}

export default function ThemeLogo({
  className = "",
  width = 144,
  height = 32,
  fill = false,
  priority = false,
  alt = "ManaGenz",
  imgClassName = "object-contain",
}: ThemeLogoProps) {
  if (fill) {
    return (
      <div className={`relative ${className}`}>
        <Image src="/logo.png" alt={alt} fill className={imgClassName} priority={priority} />
      </div>
    );
  }
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={width}
      height={height}
      className={`${imgClassName} ${className}`}
      priority={priority}
    />
  );
}