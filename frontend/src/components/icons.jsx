export function Icon({ name, filled = false, className = "", ...props }) {
  return (
    <span className={`material-symbols-outlined${filled ? " filled" : ""}${className ? ` ${className}` : ""}`} {...props}>
      {name}
    </span>
  );
}
