"use client";

import { useUser } from "@/components/nav/user-provider";
import { useBrand } from "@/components/branding/brand-kit-provider";
import { HowTo } from "@/components/cyber/how-to";

export default function HowToPage() {
  const { user } = useUser();
  const brand = useBrand();
  if (!user) return null;
  return <HowTo role={user.role} brandName={brand?.brand_name ?? "KERNELiOS"} />;
}
