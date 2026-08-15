import { forwardRef } from "react";
import { extractUzDigits, formatUzPhoneDisplay, toCanonicalUzPhone } from "../utils/phone";

// O'zbekiston mobil raqami uchun mask'langan input: "+998 (90) 123-45-67".
// `value`/`onChange` tashqariga har doim "toza" kanonik shaklda ("+998901234567")
// beriladi — vizual formatlash faqat ko'rinish uchun, saqlanadigan/solishtiriladigan
// qiymatga hech qanday bo'shliq yoki tinish belgilari aralashmaydi.
export const PhoneInput = forwardRef(function PhoneInput({ value, onChange, className, ...rest }, ref) {
  const digits = extractUzDigits(value);
  const display = formatUzPhoneDisplay(digits);

  const handleChange = (e) => {
    const inputType = e.nativeEvent?.inputType;
    let newDigits = extractUzDigits(e.target.value);
    if (inputType === "deleteContentBackward" && newDigits.length === digits.length && digits.length > 0) {
      newDigits = digits.slice(0, -1);
    }
    onChange(toCanonicalUzPhone(newDigits));
  };

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="numeric"
      className={className || "form-input"}
      value={display}
      onChange={handleChange}
      {...rest}
    />
  );
});
