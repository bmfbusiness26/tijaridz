export function formatDzd(value: number, lang = "ar") {
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en-US";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | Date, lang = "ar") {
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en-GB";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function escapeHtml(value: unknown): string {
  const s = String(value ?? "");
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export function toNumber(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}
