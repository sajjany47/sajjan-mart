"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Puja, PujaItem } from "@/lib/types";

type PujaWithItems = Puja & { items: PujaItem[] };

export function PujaListClient({ pujas }: { pujas: PujaWithItems[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return pujas;
    return pujas.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [q, pujas]);

  return (
    <>
      {/* Search + Count */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pujas — Satyanarayan, Durga, Lakshmi..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{pujas.length}</span>{" "}
          pujas
        </p>
      </div>

      {/* Puja Grid */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/puja/${p.slug}`}
            className="group overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-muted/60">
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-md backdrop-blur-sm">
                🪔 Puja Package
              </span>
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors sm:text-lg">
                {p.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground sm:text-sm">
                {p.description}
              </p>

              {/* Items Tags */}
              {p.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.items.slice(0, 5).map((it) => (
                    <span
                      key={it.id}
                      className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/80"
                    >
                      {it.name}
                    </span>
                  ))}
                  {p.items.length > 5 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      +{p.items.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Price + CTA */}
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <div>
                  <span className="text-lg font-extrabold text-foreground">
                    {formatINR(p.base_price)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Pandit + Samagri included
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                  View Details <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center sm:p-14">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="text-base font-bold">No pujas found</h3>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            {q ? (
              <>
                No results for &quot;{q}&quot;. Try a different search term.
              </>
            ) : (
              "No puja packages available right now."
            )}
          </p>
          {q && (
            <button
              onClick={() => setQ("")}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <X className="h-3.5 w-3.5" /> Clear Search
            </button>
          )}
        </div>
      )}
    </>
  );
}
