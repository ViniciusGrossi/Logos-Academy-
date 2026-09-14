"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import styles from "./admin-experience.module.css";

export type AcademySelectItem = { value: string; label: string };

type AcademySelectProps = {
  items: readonly AcademySelectItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
};

// Signature replacement for native <select>: the trigger keeps the tokenized
// `.select` look; the open panel is rendered in tokens (reveal + orange hover)
// instead of OS chrome. `name`/`defaultValue` keep FormData submission working
// via Radix's hidden native select.
export function AcademySelect({ items, value, defaultValue, onValueChange, name, required, disabled, placeholder, ariaLabel }: AcademySelectProps) {
  return (
    <Select.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} name={name} required={required} disabled={disabled}>
      <Select.Trigger className={`${styles.select} ${styles.selectTrigger}`} aria-label={ariaLabel}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild><ChevronDown className={styles.selectChevron} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={styles.selectContent} position="popper" sideOffset={6}>
          <Select.Viewport className={styles.selectViewport}>
            {items.map((item) => (
              <Select.Item key={item.value} value={item.value} className={styles.selectItem}>
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator asChild><Check className={styles.selectItemCheck} aria-hidden="true" /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
