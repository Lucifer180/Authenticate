import type { InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const Field = ({ label, value, onChange, ...rest }: Props) => (
  <label className="field">
    <span>{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} {...rest} />
  </label>
);

export default Field;
