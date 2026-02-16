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

export function handleInput<T extends Record<string, unknown>>(
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setValues: Dispatch<SetStateAction<FormState<T>>>,
) {
  const { name, value } = event.target;
  setValues((prevFormData) => ({
    ...prevFormData,
    [name]: { ...prevFormData[name], value },
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
  setValues((prev) => {
    const updatedValues = { ...prev };

    for (const key in updatedValues) {
      updatedValues[key] = {
        ...updatedValues[key],
        error: null,
      };
    }

    return updatedValues;
  });
}
