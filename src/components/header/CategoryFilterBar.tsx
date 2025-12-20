import React, { useMemo } from 'react';
import { LAYOUT_CLASSES } from '@/constants/layout';

export interface Category {
  id: string;
  label: string;
  count: number;
}

interface CategoryFilterBarProps {
  categories: Category[];
  activeCategory: string; // Default 'All'
  onSelect: (categoryLabel: string) => void;
}

/**
 * CategoryFilterBar: Category filter toolbar component
 * 
 * STICKY RULE:
 * Sticky elements float.
 * A CategorySpacer MUST follow this component in layout.
 * 
 * This component is wrapped in a sticky container by PageStack with:
 * - position: sticky
 * - top offset from LAYOUT_CLASSES.STICKY_BELOW_HEADER
 * - z-index: 40
 * 
 * Height: LAYOUT_CLASSES.CATEGORY_BAR_HEIGHT - must match CategorySpacer
 */
export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  activeCategory = 'All',
  onSelect,
}) => {
  // Smart sort logic: Pin "All" and "Today", then sort by count (high to low), then alphabetically
  const sortedCategories = useMemo(() => {
    // Filter out "All" and "Today" from incoming categories to avoid duplicates
    const filteredCategories = categories.filter(
      (cat) => cat.label.toLowerCase() !== 'all' && cat.label.toLowerCase() !== 'today'
    );

    // Sort the rest: Primary by count (high to low), secondary by alphabetical (A-Z)
    const sorted = [...filteredCategories].sort((a, b) => {
      // Primary sort: count (descending)
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      // Secondary sort: alphabetical (ascending)
      return a.label.localeCompare(b.label);
    });

    // Build final display list: "All" first, "Today" second, then sorted rest
    const displayList: Array<{ label: string; count?: number }> = [
      { label: 'All' },
      { label: 'Today' },
      ...sorted,
    ];

    return displayList;
  }, [categories]);

  const handleSelect = (label: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSelect(label);
  };

  return (
    <div
      className={`bg-white dark:bg-slate-950 ${LAYOUT_CLASSES.CATEGORY_BAR_HEIGHT} border-b border-gray-200 dark:border-slate-700`}
    >
      {/* Full-bleed category bar - matches YouTube's unified toolbar approach */}
      <div className={`${LAYOUT_CLASSES.TOOLBAR_PADDING} h-full flex items-center`}>
        <div 
          className="flex gap-2 overflow-x-auto items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          style={{
            maskImage: 'linear-gradient(to right, black 0%, black 98%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black 98%, transparent 100%)',
          }}
        >
          {sortedCategories.map((category, index) => {
            const isActive = activeCategory === category.label;
            const isToday = category.label === 'Today';

            return (
              <button
                key={`${category.label}-${index}`}
                onClick={(e) => handleSelect(category.label, e)}
                className={`
                  whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium transition-all duration-150
                  shrink-0
                  ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : isToday
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }
                `}
                aria-pressed={isActive}
                aria-label={`Filter by ${category.label}`}
              >
                {category.label}
                {category.count !== undefined && category.count > 0 && (
                  <span className="ml-1 opacity-60 text-[12px]">({category.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

