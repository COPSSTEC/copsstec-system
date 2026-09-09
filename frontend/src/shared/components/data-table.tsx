"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export type DataTableSortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "date-range" | "select";
  filterPlaceholder?: string;
  filterOptions?: Array<{ value: string; label: string }>;
  hideable?: boolean;
  defaultVisible?: boolean;
  width?: string;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  pagination?: DataTablePagination;
  sortBy?: string | null;
  sortDir?: DataTableSortDirection;
  filters?: Record<string, string>;
  visibleColumnIds?: string[];
  isLoading?: boolean;
  emptyMessage?: string;
  toolbar?: ReactNode;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (columnId: string, direction: DataTableSortDirection) => void;
  onFilterChange?: (columnId: string, value: string) => void;
  onVisibleColumnsChange?: (columnIds: string[]) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  pagination,
  sortBy,
  sortDir = "asc",
  filters = {},
  visibleColumnIds,
  isLoading = false,
  emptyMessage = "No hay registros para mostrar.",
  toolbar,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,
  onVisibleColumnsChange,
}: DataTableProps<T>) {
  const [columnsOpen, setColumnsOpen] = useState(false);

  const visibleColumns = useMemo(() => {
    if (!visibleColumnIds) {
      return columns.filter((column) => column.defaultVisible !== false);
    }

    const visible = new Set(visibleColumnIds);
    return columns.filter((column) => visible.has(column.id));
  }, [columns, visibleColumnIds]);

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  function toggleColumn(columnId: string) {
    if (!onVisibleColumnsChange) {
      return;
    }

    const current = visibleColumnIds ?? columns.filter((column) => column.defaultVisible !== false).map((column) => column.id);
    if (current.includes(columnId)) {
      if (current.length === 1) {
        return;
      }
      onVisibleColumnsChange(current.filter((id) => id !== columnId));
      return;
    }

    onVisibleColumnsChange([...current, columnId]);
  }

  function handleSort(column: DataTableColumn<T>) {
    if (!column.sortable || !onSortChange) {
      return;
    }

    const nextDirection: DataTableSortDirection =
      sortBy === column.id && sortDir === "asc" ? "desc" : "asc";
    onSortChange(column.id, nextDirection);
  }

  return (
    <section className="data-table-shell">
      <div className="data-table-toolbar">
        <div className="data-table-toolbar-main">{toolbar}</div>
        {onVisibleColumnsChange ? (
          <div className="column-picker">
            <button
              className="secondary-button"
              onClick={() => setColumnsOpen((open) => !open)}
              type="button"
            >
              Columnas
            </button>
            {columnsOpen ? (
              <div className="column-picker-menu">
                {columns
                  .filter((column) => column.hideable !== false)
                  .map((column) => {
                    const checked = visibleColumns.some((item) => item.id === column.id);
                    return (
                      <label key={column.id}>
                        <input
                          checked={checked}
                          onChange={() => toggleColumn(column.id)}
                          type="checkbox"
                        />
                        {column.header}
                      </label>
                    );
                  })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="table-scroll">
        <table className="data-table members-table">
          <thead>
            <tr>
              {visibleColumns.map((column) => {
                const isActive = sortBy === column.id;
                return (
                  <th key={column.id} style={column.width ? { width: column.width } : undefined}>
                    {column.sortable ? (
                      <button
                        className={isActive ? "sort-button is-active" : "sort-button"}
                        onClick={() => handleSort(column)}
                        type="button"
                      >
                        {column.header}
                        <span>{isActive ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
            {onFilterChange ? (
              <tr className="filter-row">
                {visibleColumns.map((column) => (
                  <th key={`${column.id}-filter`}>
                    {column.filterable === false ? null : column.filterType === "date-range" ? (
                      <div className="range-filter">
                        <input
                          onChange={(event) =>
                            onFilterChange(`${column.id}_from`, event.target.value)
                          }
                          type="date"
                          value={filters[`${column.id}_from`] ?? ""}
                        />
                        <input
                          onChange={(event) =>
                            onFilterChange(`${column.id}_to`, event.target.value)
                          }
                          type="date"
                          value={filters[`${column.id}_to`] ?? ""}
                        />
                      </div>
                    ) : column.filterType === "select" ? (
                      <select
                        onChange={(event) => onFilterChange(column.id, event.target.value)}
                        value={filters[column.id] ?? ""}
                      >
                        <option value="">Todos</option>
                        {(column.filterOptions ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        onChange={(event) => onFilterChange(column.id, event.target.value)}
                        placeholder={column.filterPlaceholder ?? "Filtrar"}
                        type="search"
                        value={filters[column.id] ?? ""}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="muted" colSpan={visibleColumns.length}>
                  Cargando registros...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td className="muted" colSpan={visibleColumns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)}>
                  {visibleColumns.map((column) => (
                    <td key={`${rowKey(row)}-${column.id}`}>{column.cell(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <footer className="data-table-pagination">
          <span className="muted">
            {pagination.total === 0
              ? "0 registros"
              : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )} de ${pagination.total}`}
          </span>
          <div className="pagination-controls">
            {onPageSizeChange ? (
              <select
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                value={pagination.pageSize}
              >
                {[10, 15, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / página
                  </option>
                ))}
              </select>
            ) : null}
            <button
              className="secondary-button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              type="button"
            >
              Anterior
            </button>
            <span>
              {pagination.page} / {totalPages}
            </span>
            <button
              className="secondary-button"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
