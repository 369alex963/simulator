// Tailwind class merger. shadcn/ui will replace this with clsx + tailwind-merge
// in Phase 3 once shadcn is initialized.
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
