export function normalizeYear(year: unknown): number {
  if (typeof year === "number" && Number.isFinite(year)) {
    return year;
  }

  if (typeof year === "string") {
    const match = year.match(/\d{4}/);
    if (match) {
      return Number(match[0]);
    }
  }

  return 0;
}
