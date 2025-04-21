// components/ui/form.tsx
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";

import { cn } from "../../utils";
import { Label } from "../ui/global";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};

// lib/validators/video.ts
import { z } from "zod";

export const videoSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required",
  }),
  videoId: z.string().min(1, {
    message: "Video ID is required",
  }),
  thumb: z.string().min(1, {
    message: "Thumbnail URL is required",
  }),
  type: z.enum(["MINISTRACAO", "TESTEMUNHO", "DEVOCIONAL", "PARA_FAMILIA"], {
    required_error: "Please select a video type.",
  }),
});

export type VideoFormValues = z.infer<typeof videoSchema>;

// types/index.ts
export interface Video {
  id: string;
  title: string;
  videoId: string;
  thumb: string;
  type: "MINISTRACAO" | "TESTEMUNHO" | "DEVOCIONAL" | "PARA_FAMILIA";
  createdAt: string;
}

export interface VideoCreate {
  title: string;
  videoId: string;
  thumb: string;
  type: "MINISTRACAO" | "TESTEMUNHO" | "DEVOCIONAL" | "PARA_FAMILIA";
}



import { Resolver, ResolverOptions, ResolverResult } from "react-hook-form"

export function zodResolver<T extends z.ZodType<any, any>>(
  schema: T,
  schemaOptions?: Partial<z.ZodTypeAny>
): Resolver<z.infer<T>, any> {
  return async (
    values: any,
    _context: unknown,
    options: ResolverOptions<FieldValues>
  ): Promise<ResolverResult<z.infer<T>>> => {
    try {
      const validatedData = await schema.parseAsync(values, schemaOptions as any)
      return {
        values: validatedData,
        errors: {}
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.reduce((acc, curr) => {
          const path = curr.path.join('.')
          acc[path] = {
            type: curr.code,
            message: curr.message
          }
          return acc
        }, {} as Record<string, { type: string; message: string }>)

        return {
          values: {},
          errors: errors
        }
      }

      return {
        values: {},
        errors: {
          root: {
            type: 'validation',
            message: 'Validation failed'
          }
        }
      }
    }
  }
}


export type VideoFormData = z.infer<typeof videoSchema>

