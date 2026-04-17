import { Category, CATEGORIES } from "@/lib/types";

export default function CategoryBadge({
  category,
  size = "sm",
}: {
  category: Category;
  size?: "sm" | "md";
}) {
  const info = CATEGORIES.find((c) => c.id === category);
  if (!info) return null;

  const sizeClasses = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-cream border border-sand ${sizeClasses} text-warm`}>
      <span>{info.icon}</span>
      <span>{info.name}</span>
    </span>
  );
}
