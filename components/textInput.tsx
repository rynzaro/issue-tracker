import clsx from "clsx";

export default function TextInput({
  id,
  name,
  placeholder,
  value,
  onChange,
  className,
}: {
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <input
      id={id ?? "text"}
      name={name ?? "text"}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={clsx(
        "block rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6",
        className,
      )}
    />
  );
}
