import React, { useState, KeyboardEvent } from 'react';
import { X, Tag } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  placeholder = "Add tags...",
  disabled = false,
  maxTags = 10
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !tags.includes(trimmedValue) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedValue]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onTagsChange(newTags);
  };

  const handleBlur = () => {
    addTag();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              disabled={disabled}
              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
          />
        )}
      </div>
      {tags.length >= maxTags && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Maximum {maxTags} tags allowed
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Press Enter or comma to add tags. Press Backspace to remove the last tag.
      </p>
    </div>
  );
};
