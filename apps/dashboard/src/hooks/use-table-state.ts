'use client';

import { useState, useEffect, useCallback } from 'react';

interface HasId {
  id: string;
}

interface UseTableStateOptions {
  initialPage?: number;
  initialPerPage?: number;
  initialSearchQuery?: string;
  debounceDelay?: number;
}

export function useTableState<T extends HasId>({
  initialPage = 1,
  initialPerPage = 20,
  initialSearchQuery = '',
  debounceDelay = 300,
}: UseTableStateOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearchQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, debounceDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, debounceDelay]);

  // Clear selection when page, perPage or debounced search query changes
  useEffect(() => {
    setSelectedIds([]);
  }, [page, perPage, debouncedSearchQuery]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  // Helper function to get selection helpers dynamically based on items on the current page
  const getSelectionHelpers = useCallback(
    (currentItems: T[]) => {
      const allSelected = currentItems.length > 0 && currentItems.every((item) => selectedIds.includes(item.id));
      const someSelected = currentItems.some((item) => selectedIds.includes(item.id)) && !allSelected;

      const handleSelectAll = (checked: boolean) => {
        if (checked) {
          setSelectedIds((prev) => {
            const newIds = [...prev];
            currentItems.forEach((item) => {
              if (!newIds.includes(item.id)) {
                newIds.push(item.id);
              }
            });
            return newIds;
          });
        } else {
          setSelectedIds((prev) => prev.filter((id) => !currentItems.some((item) => item.id === id)));
        }
      };

      const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
          setSelectedIds((prev) => [...prev, id]);
        } else {
          setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
        }
      };

      return {
        allSelected,
        someSelected,
        handleSelectAll,
        handleSelectOne,
      };
    },
    [selectedIds]
  );

  return {
    page,
    setPage,
    perPage,
    setPerPage,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    selectedIds,
    setSelectedIds,
    clearSelection,
    resetPage,
    getSelectionHelpers,
  };
}
