"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewInstanceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/app/admin/instances"); }, [router]);
  return null;
}
