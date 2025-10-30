'use client';

import { Sku } from '@/lib/types';
import { useDraggable } from '@dnd-kit/core';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface SkuPaletteProps {
  skus: Sku[];
}

function DraggableSku({ sku }: { sku: Sku }) {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: sku.skuId,
        data: { type: 'sku', sku },
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="p-2 border rounded-md cursor-grab active:cursor-grabbing bg-white hover:bg-gray-50 hover:shadow-md transition-all"
        >
            <img src={sku.imageUrl} alt={sku.name} className="h-20 object-contain mx-auto pointer-events-none" />
            <p className="text-center text-xs mt-2 font-medium text-gray-700 line-clamp-2">{sku.name}</p>
            <p className="text-center text-[10px] text-gray-500 mt-1">{sku.productType}</p>
        </div>
    )
}

// Empty state component
function EmptyState({ searchQuery, selectedCategory, onClear }: { searchQuery: string; selectedCategory: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">No products found</h3>
      <p className="text-xs text-gray-500 text-center mb-4">
        {searchQuery && selectedCategory !== 'all'
          ? `No results for "${searchQuery}" in ${selectedCategory}`
          : searchQuery
          ? `No results for "${searchQuery}"`
          : `No products in ${selectedCategory}`}
      </p>
      <button
        onClick={onClear}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Clear filters
      </button>
    </div>
  );
}

export function SkuPalette({ skus }: SkuPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Extract unique categories from SKUs
  const categories = useMemo(() => {
    const uniqueCategories = new Set(skus.map(sku => sku.productType));
    return ['all', ...Array.from(uniqueCategories).sort()];
  }, [skus]);

  // Filter SKUs based on search and category
  const filteredSkus = useMemo(() => {
    let filtered = skus;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(sku => sku.productType === selectedCategory);
    }

    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(sku =>
        sku.name.toLowerCase().includes(query) ||
        sku.productType.toLowerCase().includes(query) ||
        sku.skuId.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [skus, debouncedSearch, selectedCategory]);

  // Virtual scrolling for performance with large lists
  const rowVirtualizer = useVirtualizer({
    count: filteredSkus.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 145, // Estimated height of each SKU card (including margin)
    overscan: 3, // Render 3 items above/below viewport for smooth scrolling
  });

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('all');
  }, []);

  // Keyboard shortcut: Focus search with Ctrl+F or Cmd+F
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('sku-search') as HTMLInputElement;
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <aside className="max-h-screen overflow-hidden p-4 bg-gray-100 rounded-lg shadow-md w-full md:w-64 flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <h2 className="text-lg font-bold text-gray-800">Products</h2>
        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
          {filteredSkus.length}
        </span>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <input
          id="sku-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-9 pr-8 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category Filter */}
      {/* <div className="mb-3">
        <label htmlFor="category-filter" className="block text-xs font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 text-sm  text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>       */}
      {/* Clear Filters Button */}
      {(searchQuery || selectedCategory !== 'all') && (
        <button
          onClick={handleClearFilters}
          className="mb-3 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 justify-center py-1 transition-opacity"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear filters
        </button>
      )}{/* SKU List with Virtual Scrolling */}
      <div 
        ref={parentRef}
        className="flex-grow overflow-y-auto pr-2 -mr-2"
        style={{ contain: 'strict' }}
      >
        {filteredSkus.length === 0 ? (
          <EmptyState
            searchQuery={debouncedSearch}
            selectedCategory={selectedCategory}
            onClear={handleClearFilters}
          />
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const sku = filteredSkus[virtualRow.index];
              return (
                <div
                  key={sku.skuId}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-3" // spacing between items
                >
                  <DraggableSku sku={sku} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Info */}
      {filteredSkus.length > 0 && (debouncedSearch || selectedCategory !== 'all') && (
        <div className="mt-3 pt-3 border-t text-xs text-gray-500 text-center">
          Showing {filteredSkus.length} of {skus.length} products
        </div>
      )}
    </aside>
  );
}