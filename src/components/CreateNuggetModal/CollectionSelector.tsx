import React, { useState } from 'react';
import { Globe, Lock, Check } from 'lucide-react';
import { SelectableDropdown, SelectableDropdownOption } from './SelectableDropdown';
import { Collection } from '@/types';

interface CollectionSelectorProps {
  selected: string[];
  availableCollections: Collection[];
  visibility: 'public' | 'private';
  onSelectedChange: (selected: string[]) => void;
  comboboxRef?: React.RefObject<HTMLDivElement | null>;
  listboxRef?: React.RefObject<HTMLDivElement | null>;
}

export function CollectionSelector({
  selected,
  availableCollections,
  visibility,
  onSelectedChange,
  comboboxRef,
  listboxRef,
}: CollectionSelectorProps) {
  const [searchValue, setSearchValue] = useState('');

  const visibleCollections = availableCollections.filter(c => c.type === visibility);

  const collectionOptions: SelectableDropdownOption[] = visibleCollections.map(col => ({
    id: col.name,
    label: col.name,
  }));

  const handleSelect = (optionId: string) => {
    if (!selected.includes(optionId)) {
      onSelectedChange([...selected, optionId]);
    }
    setSearchValue('');
  };

  const handleDeselect = (optionId: string) => {
    onSelectedChange(selected.filter(id => id !== optionId));
  };

  const handleCreateNew = (searchValue: string) => {
    if (!selected.includes(searchValue)) {
      onSelectedChange([...selected, searchValue]);
    }
    setSearchValue('');
  };

  const filterOptions = (options: SelectableDropdownOption[], search: string): SelectableDropdownOption[] => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  };

  const canCreateNew = (search: string, options: SelectableDropdownOption[]): boolean => {
    if (!search) return false;
    return !options.some(opt => opt.label.toLowerCase() === search.toLowerCase());
  };

  const label = visibility === 'public' ? 'Community Collection' : 'Private Collection';
  const placeholder = visibility === 'public' 
    ? 'Find or create community collection...' 
    : 'Find or create private collection...';
  const helperText = visibility === 'public'
    ? 'Create or Add your nugget to a Community Collection'
    : 'Save this nugget to your private collection.';
  const emptyPlaceholder = visibility === 'public'
    ? 'Add to community collection'
    : 'Add to your private collection';
  const createText = visibility === 'public'
    ? 'Create community collection'
    : 'Create private collection';

  return (
    <SelectableDropdown
      id="collections-combobox"
      label={label}
      selected={selected}
      options={collectionOptions}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onCreateNew={handleCreateNew}
      placeholder={placeholder}
      helperText={helperText}
      emptyPlaceholder={emptyPlaceholder}
      filterOptions={filterOptions}
      canCreateNew={canCreateNew}
      comboboxRef={comboboxRef}
      listboxRef={listboxRef}
      icon={visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
      renderOption={(option, isSelected) => (
        <>
          <span>{option.label}</span>
          {isSelected && <Check size={14} className="text-primary-600 dark:text-primary-400" />}
        </>
      )}
    />
  );
}

