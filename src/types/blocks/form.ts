import { ReactNode } from "react";
import { Button } from "@/types/blocks/base";

type ValidationRule = {
  required?: boolean;
  min?: number;
  max?: number;
  message?: string;
  email?: boolean;
  numeric?: boolean; // 标识字段是否为数字字符串验证
};

export interface FormField {
  name?: string;
  title?: string;
  type?:
    | "customed"
    | "file"
    | "text"
    | "textarea"
    | "number"
    | "switch"
    | "email"
    | "password"
    | "select"
    | "radio"
    | "url"
    | "code_editor"
    | "markdown_editor"
    | "cf_turnstile"
    | "style_selector";
  customedComponent?: ReactNode;
  placeholder?: string;
  options?: {
    title?: string;
    value?: string;
    [key: string]: any;
  }[];
  value?: string;
  tip?: string;
  attributes?: Record<string, any>;
  validation?: ValidationRule;
}

export interface FormSubmit {
  button?: Button;
  handler?: (
    data: FormData,
    passby?: any
  ) => Promise<
    | {
        status: "success" | "error";
        message: string;
        redirect_url?: string;
      }
    | undefined
    | void
  >;
}

export interface Form {
  fields: FormField[];
  data?: any;
  submit?: FormSubmit;
}
