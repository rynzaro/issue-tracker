import { ChangeEvent, Dispatch, SetStateAction } from "react";

export type FieldState<T> = {
  value: T;
  error?: string | null;
  touched: boolean;
  required: boolean;
};

export type FormState<T> = {
  [key in keyof T]: FieldState<T[key]>;
};

export function setFormErrors<T>(
  values: FormState<T>,
  errors: Partial<Record<keyof T, string>>,
): FormState<T> {
  const nextValues = { ...values };

  for (const key in values) {
    const typedKey = key as keyof T;
    nextValues[typedKey] = {
      ...values[typedKey],
      error: errors[typedKey] ?? null,
    };
  }

  return nextValues;
}

export function handleInput<T extends Record<string, unknown>>(
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setValues: Dispatch<SetStateAction<FormState<T>>>,
) {
  const { name, value } = event.target;
  setValues((prevFormData) => ({
    ...prevFormData,
    [name]: { ...prevFormData[name], value, error: null },
  }));
}

export function handleCheckbox<T extends Record<string, unknown>, K extends keyof T>(
  checked: boolean,
  setValues: Dispatch<SetStateAction<FormState<T>>>,
  name: K,
) {
  setValues((prevFormData) => ({
    ...prevFormData,
    [name]: {
      ...prevFormData[name],
      value: checked as T[K],
      error: null,
    },
  }));
}

export function extractFormStateValues<T>(values: FormState<T>) {
  const result = {} as {
    [key in keyof T]: T[key];
  };
  for (const key in values) {
    result[key] = values[key].value;
  }
  return result;
}

export function clearErrors<T>(
  setValues: Dispatch<SetStateAction<FormState<T>>>,
) {
  setValues((prev) => setFormErrors(prev, {}));
}
