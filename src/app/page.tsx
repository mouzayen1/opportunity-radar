"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardStats, Product, ProductFilters, ProductsResponse } from "@/lib/types";
import { StatsBar } from "@/components/StatsBar";
import { FilterSidebar } from "@/components/FilterSidebar";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";

function ProductSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-8 rounded bg-muted" />
        <div className="h-8 rounded bg-muted" />
      </div>
      <div className="flex gap-1">
        <div className="h-5 w-12 rounded-full bg-muted" />
        <div className="h-5 w-12 rounded-full bg-muted" />
      </div>
      <div className="mt-auto h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    pageSize: 20,
    sortBy: "pain_score",
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch {
      // Stats are non-critical, don't block
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.minPainScore) params.set("minPainScore", String(filters.minPainScore));
      if (filters.minDisruptionScore) params.set("minDisruptionScore", String(filters.minDisruptionScore));
      if (filters.minPlatformCount) params.set("minPlatformCount", String(filters.minPlatformCount));
      if (filters.painCategory) params.set("painCategory", filters.painCategory);
      if (filters.trendingDirection) params.set("trendingDirection", filters.trendingDirection);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data: ProductsResponse = await res.json();
      setProducts(data.data);
      setTotal(data.total);

      // Extract unique categories from the first page
      const cats = Array.from(
        new Set(data.data.map((p) => p.category).filter(Boolean) as string[])
      ).sort();
      if (cats.length > 0) setCategories((prev) => {
        const merged = Array.from(new Set([...prev, ...cats])).sort();
        return merged;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.ceil(total / (filters.pageSize || 20));
  const currentPage = filters.page || 1;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            B2B software pain signals ranked by disruption opportunity
          </p>
        </div>

        {/* Stats */}
        {stats && <StatsBar stats={stats} className="mb-6" />}

        {/* Search */}
        <SearchBar
          value={filters.search || ""}
          onChange={(search) => setFilters((prev) => ({ ...prev, search, page: 1 }))}
          className="mb-6"
        />

        {/* Main content */}
        <div className="flex gap-6">
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            categories={categories}
          />

          <div className="min-w-0 flex-1">
            {/* Error */}
            {error && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
                <AlertCircle size={32} className="text-destructive" />
                <p className="text-sm text-foreground">{error}</p>
                <button
                  onClick={fetchProducts}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && !error && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && products.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-12 text-center">
                <p className="text-sm font-medium text-foreground">
                  No products found
                </p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your filters or search terms
                </p>
              </div>
            )}

            {/* Products grid */}
            {!loading && !error && products.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: Math.max(1, currentPage - 1),
                        }))
                      }
                      disabled={currentPage <= 1}
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: Math.min(totalPages, currentPage + 1),
                        }))
                      }
                      disabled={currentPage >= totalPages}
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
