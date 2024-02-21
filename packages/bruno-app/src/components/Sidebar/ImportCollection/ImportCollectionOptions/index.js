import {
  DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'components/ui/dropdown-menu';
import React from 'react';
import { Button } from 'components/ui/button';

export const ImportCollectionOptions = ({options, setOptions, className}) => {
  const toggleOptions = (event, optionKey) => {
    event?.preventDefault();
    setOptions({ ...options, [optionKey]: {
      ...options[optionKey],
      enabled: !options[optionKey].enabled
    } });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="secondary" className={className}>
           Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Import options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(options || {}).map(([key, option]) => (
          <DropdownMenuCheckboxItem
            checked={option.enabled}
            onSelect={(e) => toggleOptions(e,key)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}