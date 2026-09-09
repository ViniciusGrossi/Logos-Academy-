"use client";

import { motion, useReducedMotion, useSpring } from "framer-motion";
import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

type SmoothInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  helper: string;
  icon?: React.ReactNode;
};

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(function SmoothInput(
  { id, label, helper, icon, value, defaultValue = "", onChange, onFocus, onBlur, onSelect, type = "text", ...props },
  forwardedRef,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-help`;
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue));
  const [selection, setSelection] = useState(String(value ?? defaultValue).length);
  const [focused, setFocused] = useState(false);
  const text = String(isControlled ? value : internalValue);
  const mirroredText = (type === "password" ? "•".repeat(text.length) : text).slice(0, selection);
  const prefersReducedMotion = useReducedMotion();
  const caretX = useSpring(0, { stiffness: 560, damping: 44, mass: .35 });

  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  useLayoutEffect(() => {
    const target = mirrorRef.current?.getBoundingClientRect().width ?? 0;
    if (prefersReducedMotion) caretX.jump(target);
    else caretX.set(target);
  }, [caretX, mirroredText, prefersReducedMotion]);

  function syncSelection(element: HTMLInputElement) {
    setSelection(element.selectionStart ?? element.value.length);
  }

  return (
    <div className="smooth-field">
      {icon && <span className="smooth-field-icon" aria-hidden="true">{icon}</span>}
      <div className="smooth-input-wrap">
        <input
          {...props}
          ref={inputRef}
          id={inputId}
          type={type}
          value={isControlled ? value : internalValue}
          placeholder=" "
          aria-describedby={helperId}
          onChange={(event) => {
            if (!isControlled) setInternalValue(event.target.value);
            syncSelection(event.target);
            onChange?.(event);
          }}
          onFocus={(event) => { setFocused(true); syncSelection(event.target); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          onSelect={(event) => { syncSelection(event.currentTarget); onSelect?.(event); }}
        />
        <label htmlFor={inputId}>{label}</label>
        <span className="smooth-measure" ref={mirrorRef} aria-hidden="true">{mirroredText}</span>
        {focused && <motion.span className="smooth-caret" style={{ x: caretX }} aria-hidden="true" />}
      </div>
      <small id={helperId}>{helper}</small>
    </div>
  );
});
