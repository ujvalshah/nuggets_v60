
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  minWidth?: string; 
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
  hideOnMobile?: boolean;
  sticky?: 'left' | 'right';
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onSearch?: (query: string) => void;
  placeholder?: string;
  
  // Sorting Props
  sortKey?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;

  // Row Click Prop
  onRowClick?: (row: T) => void;

  // Expanded Row Props
  expandedRowId?: string | null;
  expandedRowContent?: (row: T) => React.ReactNode;

  // Selection Props
  selection?: {
    selectedIds: string[];
    onSelect: (ids: string[]) => void;
    enabled: boolean;
  };

  // Custom empty state
  emptyState?: React.ReactNode;

  // Virtualization
  virtualized?: boolean;
  virtualHeight?: number; // px
}

export function AdminTable<T extends { id: string }>({ 
  columns, 
  data, 
  isLoading, 
  filters,
  actions,
  pagination,
  onSearch,
  placeholder = "Search...",
  sortKey,
  sortDirection,
  onSortChange,
  onRowClick,
  expandedRowId,
  expandedRowContent,
  selection,
  emptyState,
  virtualized = false,
  virtualHeight = 480
}: AdminTableProps<T>) {

  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable || !onSortChange) return;
    const key = col.sortKey || col.key;
    const newDirection = (key === sortKey && sortDirection === 'desc') ? 'asc' : 'desc';
    onSortChange(key, newDirection);
  };

  const handleHeaderKey = (e: React.KeyboardEvent, col: Column<T>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHeaderClick(col);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!selection) return;
    if (checked) {
      selection.onSelect(data.map(item => item.id));
    } else {
      selection.onSelect([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!selection) return;
    if (checked) {
      selection.onSelect([...selection.selectedIds, id]);
    } else {
      selection.onSelect(selection.selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const renderSkeletonRows = () => {
    const rows = Array.from({ length: 5 });
    return rows.map((_, idx) => (
      <tr key={`skeleton-${idx}`} className="border-b border-slate-50 dark:border-slate-800/50">
        {selection?.enabled && (
          <td className="px-4 py-3 w-10 sticky left-0 z-20 bg-white dark:bg-slate-900">
            <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </td>
        )}
        {columns.map((col, cIdx) => (
          <td 
            key={`skeleton-${idx}-${cIdx}`}
            className={`
              px-4 py-3 align-middle
              ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
              ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
              ${getStickyClass(col, false)}
            `}
          >
            <div className="h-4 rounded bg-slate-200 dark:bg-slate-700/70 animate-pulse w-3/4"></div>
          </td>
        ))}
      </tr>
    ));
  };

  const rowHeight = 56; // px estimate for virtualization

  const virtual = useVirtualizer({
    count: data.length,
    getScrollElement: () => tableBodyRef.current,
    estimateSize: () => rowHeight,
    overscan: 5
  });

  // Improved sticky classes with solid backgrounds to cover content when scrolling
  const getStickyClass = (col: Column<T>, isHeader: boolean) => {
    if (!col.sticky) return '';
    const bgClass = isHeader 
        ? 'bg-slate-50 dark:bg-slate-800' 
        : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40';
    
    if (col.sticky === 'left') return `sticky left-0 z-20 ${bgClass} shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)]`;
    if (col.sticky === 'right') return `sticky right-0 z-20 ${bgClass} shadow-[-1px_0_5px_-2px_rgba(0,0,0,0.1)]`;
    return '';
  };

  const renderRow = (row: T, index: number) => {
    const isSelected = selection?.selectedIds.includes(row.id);
    const isExpanded = expandedRowId === row.id;
    return (
      <>
        <tr 
          key={row.id} 
          onClick={() => onRowClick?.(row)}
          onKeyDown={(e) => {
            if (!onRowClick) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick(row);
            }
          }}
          tabIndex={onRowClick ? 0 : -1}
          role="row"
          className={`
              group border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors
              ${onRowClick ? 'cursor-pointer' : ''}
              ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}
              ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/60' : ''}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
          `}
        >
          {selection?.enabled && (
            <td className={`px-4 py-3 w-10 sticky left-0 z-20 ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10' : isExpanded ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/40'} shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)]`} onClick={e => e.stopPropagation()}>
              <input 
                type="checkbox" 
                aria-label={`Select row ${row.id}`}
                className="rounded border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                checked={isSelected}
                onChange={(e) => handleSelectRow(row.id, e.target.checked)}
              />
            </td>
          )}

          {columns.map((col, colIdx) => (
            <td 
              key={`${row.id}-${col.key || colIdx}`} 
              className={`
                px-4 py-3 align-middle text-sm whitespace-nowrap
                ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                ${getStickyClass(col, false)}
              `}
            >
              {col.render ? col.render(row, index) : (row as any)[col.key]}
            </td>
          ))}
        </tr>
        {isExpanded && expandedRowContent && (
          <tr key={`${row.id}-expanded`} className="border-b border-slate-50 dark:border-slate-800/50">
            <td colSpan={columns.length + (selection?.enabled ? 1 : 0)} className="px-4 py-4 bg-slate-50/50 dark:bg-slate-800/30">
              {expandedRowContent(row)}
            </td>
          </tr>
        )}
      </>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(filters || actions || onSearch) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {onSearch && (
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  aria-label="Search table"
                  placeholder={placeholder}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full md:w-48 lg:w-64 transition-all"
                />
              </div>
            )}
            {filters}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm relative flex flex-col">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-30 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {/* Selection Header */}
                {selection?.enabled && (
                  <th className="px-4 py-3 w-10 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800">
                    <input 
                      type="checkbox" 
                      aria-label="Select all rows"
                      className="rounded border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      checked={data.length > 0 && selection.selectedIds.length === data.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                )}

                {columns.map((col, idx) => (
                  <th 
                    key={col.key || idx} 
                    onClick={() => handleHeaderClick(col)}
                    onKeyDown={(e) => handleHeaderKey(e, col)}
                    style={{ minWidth: col.minWidth }}
                    tabIndex={col.sortable ? 0 : undefined}
                    role={col.sortable ? 'button' : undefined}
                    aria-sort={
                      col.sortable
                        ? sortKey === (col.sortKey || col.key)
                          ? sortDirection === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={`
                      px-4 py-3 text-[13px] font-bold text-slate-600 dark:text-slate-300 select-none whitespace-nowrap
                      ${col.width || ''} 
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                      ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                      ${col.sortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group' : ''}
                      ${getStickyClass(col, true)}
                      ${col.sortable ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2' : ''}
                    `}
                  >
                    <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {col.header}
                        {col.sortable && (
                          <div className="flex flex-col text-slate-400 group-hover:text-primary-500 transition-colors">
                             {sortKey === (col.sortKey || col.key) ? (
                               sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                             ) : (
                               <div className="h-3 w-3 opacity-0 group-hover:opacity-50"><ArrowDown size={12} /></div> 
                             )}
                          </div>
                        )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            {virtualized && !isLoading && data.length > 0 ? (
              <tbody
                ref={tableBodyRef}
                style={{ display: 'block', position: 'relative', height: virtualHeight, overflowY: 'auto' }}
                className="divide-y divide-slate-100 dark:divide-slate-800"
              >
                <tr style={{ height: virtual.getTotalSize(), position: 'relative', display: 'block' }}>
                  <td style={{ padding: 0, margin: 0, border: 0, display: 'block', height: '100%', position: 'relative' }} colSpan={columns.length + (selection?.enabled ? 1 : 0)}>
                    {virtual.getVirtualItems().map((item) => {
                      const row = data[item.index];
                      const isExpanded = expandedRowId === row.id;
                      const rowElements = renderRow(row, item.index);
                      const rows = React.Children.toArray(rowElements);
                      const mainRow = rows[0] as React.ReactElement<React.HTMLAttributes<HTMLTableRowElement>>;
                      const expandedRow = rows[1] as React.ReactElement<React.HTMLAttributes<HTMLTableRowElement>> | undefined;
                      
                      // Calculate height - expanded row needs more space
                      const rowHeight = isExpanded && expandedRow ? item.size * 3 : item.size;
                      
                      return (
                        <div
                          key={row.id}
                          style={{
                            position: 'absolute',
                            top: item.start,
                            left: 0,
                            width: '100%',
                            height: rowHeight,
                            display: 'table',
                            tableLayout: 'fixed'
                          }}
                        >
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {mainRow && (
                                <tr {...(mainRow.props || {})}>
                                  {React.Children.toArray(mainRow.props.children)}
                                </tr>
                              )}
                              {isExpanded && expandedRow && (
                                <tr {...(expandedRow.props || {})}>
                                  {React.Children.toArray(expandedRow.props.children)}
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  renderSkeletonRows()
                ) : data.length === 0 ? (
                  emptyState ? (
                    <tr>
                      <td colSpan={columns.length + (selection?.enabled ? 1 : 0)} className="px-6 py-12 text-center">
                        {emptyState}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={columns.length + (selection?.enabled ? 1 : 0)} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <p className="text-sm font-medium">No records found</p>
                          <p className="text-xs">Try adjusting filters</p>
                        </div>
                      </td>
                    </tr>
                  )
                ) : (
                  data.map((row, index) => renderRow(row, index))
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900 sticky left-0 right-0">
            <span className="text-[10px] font-medium text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 disabled:opacity-50 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 disabled:opacity-50 transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
