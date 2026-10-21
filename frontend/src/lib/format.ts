const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(iso: string): string {
  const date = parse(iso);
  return date ? dateTime.format(date) : "Data indisponível";
}

export function formatDate(iso: string): string {
  const date = parse(iso);
  return date ? dateOnly.format(date) : "Data indisponível";
}
