import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { SelectableDropdown, SelectableDropdownOption } from './SelectableDropdown';
import { normalizeCategoryLabel } from '@/utils/formatters';
import { storageService } from '@/services/storageService';

interface TagSelectorProps {
  selected: string[];
  availableCategories: string[];
  onSelectedChange: (selected: string[]) => void;
  onAvailableCategoriesChange: (categories: string[]) => void;
  error: string | null;
  touched: boolean;
  onTouchedChange: (touched: boolean) => void;
  onErrorChange: (error: string | null) => void;
  comboboxRef?: React.RefObject<HTMLDivElement | null>;
  listboxRef?: React.RefObject<HTMLDivElement | null>;
}

export function TagSelector({
  selected,
  availableCategories,
  onSelectedChange,
  onAvailableCategoriesChange,
  error,
  touched,
  onTouchedChange,
  onErrorChange,
  comboboxRef,
  listboxRef,
}: TagSelectorProps) {
  const [searchValue, setSearchValue] = useState('');

  const validateTags = (): string | null => {
    if (selected.length === 0) {
      return "Please add at least one tag. Tags enable smarter news discovery.";
    }
    return null;
  };

  // Validate tags when selected changes (if touched)
  useEffect(() => {
    if (touched) {
      const error = validateTags();
      onErrorChange(error);
    }
  }, [selected, touched, onErrorChange]);

  const tagOptions: SelectableDropdownOption[] = availableCategories
    .filter(c => typeof c === 'string' && c.trim() !== '')
    .map(cat => ({ id: cat, label: cat }));

  const handleSelect = async (optionId: string) => {
    const normalized = normalizeCategoryLabel(optionId);
    if (normalized) {
      const cleanCat = normalized.replace(/^#/, '');
      if (!selected.includes(cleanCat)) {
        onSelectedChange([...selected, cleanCat]);
        setSearchValue('');
        if (!touched) onTouchedChange(true);
        // Clear error immediately when tag is added
        if (error) {
          const newError = validateTags();
          onErrorChange(newError);
        }
        // Add to available categories if missing
        if (!availableCategories.includes(cleanCat)) {
          await storageService.addCategory(cleanCat);
          onAvailableCategoriesChange([...availableCategories, cleanCat].sort());
        }
      }
    }
  };

  const handleDeselect = (optionId: string) => {
    onSelectedChange(selected.filter(id => id !== optionId));
    if (!touched) onTouchedChange(true);
    // Validate tags when category is removed
    if (touched) {
      const newError = validateTags();
      onErrorChange(newError);
    }
  };

  const handleCreateNew = async (searchValue: string) => {
    await handleSelect(searchValue);
  };

  const filterOptions = (options: SelectableDropdownOption[], search: string): SelectableDropdownOption[] => {
    return options.filter(opt => 
      typeof opt.label === 'string' && 
      opt.label.trim() !== '' && 
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  };

  const canCreateNew = (search: string, options: SelectableDropdownOption[]): boolean => {
    if (!search) return false;
    const normalized = normalizeCategoryLabel(search);
    if (!normalized) return false;
    const cleanCat = normalized.replace(/^#/, '');
    return !options.some(opt => opt.label.toLowerCase() === cleanCat.toLowerCase());
  };

  const handleBlur = () => {
    if (!touched) onTouchedChange(true);
    const newError = validateTags();
    onErrorChange(newError);
  };

  return (
    <SelectableDropdown
      id="tags-combobox"
      label="Tags"
      required
      selected={selected}
      options={tagOptions}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onCreateNew={handleCreateNew}
      placeholder="Search or type to create tags..."
      helperText="Tags enable smarter news discovery."
      error={error}
      warning={touched && !error && selected.length === 0 ? "Tags are required before submitting." : undefined}
      onBlur={handleBlur}
      touched={touched}
      emptyPlaceholder="Add tags (required)..."
      renderOption={(option, isSelected) => (
        <>
          <span>#{option.label}</span>
          {isSelected && <Check size={14} className="text-primary-600 dark:text-primary-400" />}
        </>
      )}
      filterOptions={filterOptions}
      canCreateNew={canCreateNew}
      comboboxRef={comboboxRef}
      listboxRef={listboxRef}
      icon={<div className="text-slate-500 dark:text-slate-400 font-bold text-xs">#</div>}
    />
  );
}

