import React, { useMemo } from 'react';

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
      className="sticky top-[64px] z-40 bg-white/95 backdrop-blur-sm py-3 px-4 border-b border-gray-100"
      style={{
        maskImage: 'linear-gradient(to right, black 0%, black 95%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0%, black 95%, transparent 100%)',
      }}
    >
      <div className="flex gap-3 overflow-x-auto items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {sortedCategories.map((category, index) => {
          const isActive = activeCategory === category.label;
          const isToday = category.label === 'Today';

          return (
            <button
              key={`${category.label}-${index}`}
              onClick={(e) => handleSelect(category.label, e)}
              className={`
                whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200
                active:scale-95 shrink-0
                ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : isToday
                    ? 'bg-orange-50 text-orange-800 font-semibold hover:bg-orange-100'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              aria-pressed={isActive}
              aria-label={`Filter by ${category.label}`}
            >
              {category.label}
              {category.count !== undefined && category.count > 0 && (
                <span className="ml-1.5 opacity-70">({category.count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

