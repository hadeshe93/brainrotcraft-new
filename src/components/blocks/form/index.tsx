'use client';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormField as FormFieldType, FormSubmit } from '@/types/blocks/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateFormSchema } from '@/lib/form';
import CfTurnstile from '@/components/cf-turnstile';
import { FileUploader } from '@/components/file-uploader';
import { StyleSelector } from '@/components/style-selector';
import { cn } from '@/lib/utils';

export interface FormProps {
  fields?: FormFieldType[];
  data?: any;
  passby?: any;
  submit?: FormSubmit;
  loading?: boolean;
  className?: string;
};

export default function ({
  fields,
  data,
  passby,
  submit,
  loading,
  className = '',
}: FormProps) {
  if (!fields) {
    fields = [];
  }

  const router = useRouter();
  const FormSchema = generateFormSchema(fields);
  const defaultValues: Record<string, string> = {};

  fields.forEach((field) => {
    if (field.name) {
      defaultValues[field.name] = data?.[field.name] || field.value || '';
    }
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (!submit?.handler) return;

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        const field = fields!.find((field) => field.name === key);
        if (field?.type === 'file') {
          const files = value as File[];
          files.forEach((file, index) => {
            formData.append(`${key}[${index}]`, file);
          });
        } else {
          formData.append(key, value as string | Blob);
        }
      });

      const res = await submit.handler(formData, passby);

      if (!res) {
        throw new Error('No response received from server');
      }


      if (res.redirect_url) {
        router.push(res.redirect_url);
      }
    } catch (err: any) {
      console.log('submit form error', err);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('w-full space-y-6', className || '')}>
        {fields.map((item, index) => {
          return (
            <FormField
              key={index}
              control={form.control}
              name={item.name || ''}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {item.title}
                    {item.validation?.required && <span className="ml-1 text-red-500">*</span>}
                  </FormLabel>
                  <FormControl>
                    {item.type === 'textarea' ? (
                      // @ts-ignore
                      <Textarea {...field} placeholder={item.placeholder} {...item.attributes} />
                    ) : item.type === 'select' ? (
                      <Select onValueChange={field.onChange} defaultValue={field.value as string} {...item.attributes}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={item.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {item.options?.map((option: any) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : item.type === 'radio' ? (
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value as string} {...item.attributes}>
                        {item.options?.map((option: any, index: number) => (
                          <FormItem key={index} className="flex items-center gap-3">
                            <FormControl>
                              <RadioGroupItem value={option.value} />
                            </FormControl>
                            <FormLabel className="font-normal">{option.title}</FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    ) : item.type === 'switch' ? (
                      // @ts-ignore
                      <Switch {...field} {...item.attributes} />
                    ) : item.type === 'cf_turnstile' ? (
                      <CfTurnstile onChange={field.onChange} />
                    ) : item.type === 'file' ? (
                      // @ts-ignore
                      <FileUploader {...field} {...item.attributes} />
                    ) : item.type === 'style_selector' ? (
                      // @ts-ignore
                      <StyleSelector {...field} {...item.attributes} />
                    ) : (
                      // @ts-ignore
                      <Input
                        {...field}
                        type={item.type || 'text'}
                        placeholder={item.placeholder}
                        {...item.attributes}
                      />
                    )}
                  </FormControl>
                  {item.tip && <FormDescription dangerouslySetInnerHTML={{ __html: item.tip }} />}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        })}
        {submit?.button && (
          <Button
            type="submit"
            variant={submit.button.variant}
            className={cn('w-full flex items-center justify-center gap-2 font-semibold', submit.button.className || '')}
            disabled={loading}
          >
            {submit.button.title}
            {loading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              submit.button.icon && <Icon config={{ name: submit.button.icon }} className="size-4" />
            )}
          </Button>
        )}
      </form>
    </Form>
  );
}
