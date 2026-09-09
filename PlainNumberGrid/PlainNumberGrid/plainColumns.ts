/**
 * Which whole-number columns should render plain in a grid: exactly those that
 * carry the Plain Number control on a main form of that table. Read once per
 * session from systemform.formxml, cached in sessionStorage so the first paint
 * of later grids already knows.
 */
const CACHE_KEY = "kk.plainnumber.columns.v1";
const CACHE_TTL_MS = 10 * 60 * 1000;
const FORM_CONTROL = /<customControl[^>]*name="[^"]*KK\.PlainNumber"[^>]*>\s*<parameters>\s*<value>([^<]+)<\/value>/g;

export type ColumnMap = Record<string, string[]>;

export class PlainColumns {
  private byEntity: ColumnMap = {};
  private all = new Set<string>();
  private loading: Promise<void> | null = null;

  constructor(private readonly webApi: ComponentFramework.WebApi) {
    this.fromCache();
  }

  /** True when the column should render plain. Entity may be unknown (subgrids). */
  public has(entity: string | undefined, column: string | undefined): boolean {
    if (!column) return false;
    const col = column.toLowerCase();
    if (entity) {
      const cols = this.byEntity[entity.toLowerCase()];
      if (cols) return cols.includes(col);
    }
    return this.all.has(col);
  }

  /** Refresh from the server; safe to call on every init. */
  public refresh(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = this.load().finally(() => { this.loading = null; });
    return this.loading;
  }

  private async load(): Promise<void> {
    const map: ColumnMap = {};
    const collect = (entity: string, formxml: string) => {
      for (const m of formxml.matchAll(FORM_CONTROL)) {
        const key = entity.toLowerCase();
        const col = m[1].trim().toLowerCase();
        const cols = (map[key] ??= []);
        if (!cols.includes(col)) cols.push(col);
      }
    };
    try {
      const r = await this.webApi.retrieveMultipleRecords("systemform", "?$select=objecttypecode,formxml&$filter=type eq 2 and contains(formxml,'KK.PlainNumber')");
      for (const f of r.entities) collect(String(f.objecttypecode), String(f.formxml ?? ""));
    } catch {
      return; // keep whatever the cache had
    }
    this.apply(map);
    this.toCache(map);
  }

  private apply(map: ColumnMap): void {
    this.byEntity = map;
    this.all = new Set(Object.values(map).flat());
  }

  private fromCache(): void {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const { at, map } = JSON.parse(raw) as { at: number; map: ColumnMap };
      if (Date.now() - at < CACHE_TTL_MS) this.apply(map);
    } catch {
      // no cache
    }
  }

  private toCache(map: ColumnMap): void {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), map })); } catch { /* quota or private mode */ }
  }
}

/** Whole number to text with no digit grouping. */
export function toText(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value).toString() : "";
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d-]/g, ""));
    return value.trim() !== "" && Number.isFinite(n) ? Math.trunc(n).toString() : value;
  }
  return "";
}
