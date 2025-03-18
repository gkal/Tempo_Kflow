import { useState, useCallback, useRef } from 'react';
import { formatPhoneNumber } from '@/lib/utils';

/**
 * Custom hook for handling phone number formatting with specific requirements:
 * 1. If input starts with '2': format as xxx-xx.xx.xxx
 * 2. If input starts with '6': format as xxxx-xx.xx.xx
 * 3. If input starts with '+': preserves the + for international numbers
 * 4. If input starts with any other digit, character, or symbol: no formatting is applied
 * 5. If user is deleting characters, no formatting is applied
 * 6. As soon as a non-formatting character is typed, formatting stops and free editing is allowed
 * 7. Maintains cursor position when editing in the middle of formatted numbers
 */
export const usePhoneFormat = (initialValue: string = '') => {
  const [phoneValue, setPhoneValue] = useState(initialValue);
  const [previousValue, setPreviousValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cursorPositionRef = useRef<number | null>(null);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const newValue = input.value;
    const cursorPosition = input.selectionStart;
    
    // Store current cursor position and input reference
    cursorPositionRef.current = cursorPosition;
    inputRef.current = input;
    
    // Save previous value
    setPreviousValue(phoneValue);
    
    // Apply formatting using the utility function
    const formattedValue = formatPhoneNumber(newValue, phoneValue);
    setPhoneValue(formattedValue);
    
    // Return the name and formatted value for easy use with other form handlers
    return {
      name: e.target.name,
      value: formattedValue
    };
  }, [phoneValue]);

  // Function to reset or update the phone number programmatically
  const setPhone = useCallback((value: string) => {
    setPreviousValue(phoneValue);
    setPhoneValue(value);
  }, [phoneValue]);

  return {
    phoneValue,
    handlePhoneChange,
    setPhone,
    inputRef
  };
}; 