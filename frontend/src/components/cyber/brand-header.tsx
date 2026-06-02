"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useBrand } from "@/components/branding/brand-kit-provider";

type BrandHeaderProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  linkTo?: string;
};

// Use larger displayed sizes — the previous h-7/h-10/h-14 felt too small
const imgSizes = {
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
};

const imgHeights = { sm: 40, md: 56, lg: 80 };

export function BrandHeader({ className = "", size = "md", linkTo }: BrandHeaderProps) {
  const brand = useBrand();
  const [imgFailed, setImgFailed] = useState(false);

  const brandName = brand?.brand_name ?? "KERNELiOS";
  const logo = brand?.logo || "/logo.png";

  // No direct DOM manipulation — use React state. Mutating DOM via
  // appendChild outside React's fiber tree caused the `removeChild` crash
  // on navigation because the unmount path tried to reconcile against a
  // DOM tree it didn't know about.
  const content: ReactNode = imgFailed ? (
    <span className="font-display font-black text-primary tracking-[0.04em] whitespace-nowrap leading-none text-xl">
      {brandName}
    </span>
  ) : (
    <Image
      src={logo}
      alt={brandName}
      width={imgHeights[size] * 4}
      height={imgHeights[size]}
      className={`${imgSizes[size]} w-auto object-contain`}
      style={{ height: "auto", maxHeight: `${imgHeights[size]}px` }}
      unoptimized
      priority
      onError={() => setImgFailed(true)}
    />
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className={`inline-flex items-center ${className}`}>
        {content}
      </Link>
    );
  }

  return <div className={`inline-flex items-center ${className}`}>{content}</div>;
}
