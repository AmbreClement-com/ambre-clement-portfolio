export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-label="Chargement" role="status">
      <div className="size-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
    </div>
  );
}
