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
  /** True once a usable map is known, from cache or from the server. */
  public ready = false;
  private byEntity: ColumnMap = {};
  private all = new Set<string>();
  private loading: Promise<void> | null = null;
  private readyResolvers: (() => void)[] = [];

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

  /** Resolves when the first load (or cache hit) has happened. */
  public whenReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve) => this.readyResolvers.push(resolve));
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
      this.markReady(); // keep whatever the cache had; do not block cells forever
      return;
    }
    this.apply(map);
    this.toCache(map);
    this.markReady();
  }

  private markReady(): void {
    this.ready = true;
    const waiting = this.readyResolvers;
    this.readyResolvers = [];
    for (const r of waiting) r();
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
      if (Date.now() - at < CACHE_TTL_MS) {
        this.apply(map);
        this.ready = true;
      }
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
