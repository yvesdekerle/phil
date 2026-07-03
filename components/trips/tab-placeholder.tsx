export function TabPlaceholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
      <p className="font-display text-xl text-encre italic">{title}</p>
      <p className="max-w-sm text-sm text-encre-douce">{hint}</p>
    </div>
  );
}
