"use client"

import * as React from "react"
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/utils"
import { Button, buttonVariants } from "@/components/ui/global"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    captionLayout = "label",
    buttonVariant = "ghost",
    formatters,
    components,
    ...props
}: React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
    const defaultClassNames = getDefaultClassNames()

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn(
                "bg-transparent group/calendar p-3 [--cell-size:2rem] rounded-md",
                String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
                String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
                className
            )}
            captionLayout={captionLayout}
            formatters={{
                formatMonthDropdown: (date) =>
                    date.toLocaleString("pt-BR", { month: "short" }),
                ...formatters,
            }}
            classNames={{
                root: cn("w-fit", defaultClassNames.root),
                months: cn(
                    "flex gap-4 flex-col md:flex-row relative",
                    defaultClassNames.months
                ),
                month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
                nav: cn(
                    "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
                    defaultClassNames.nav
                ),
                button_previous: cn(
                    buttonVariants({ variant: buttonVariant }),
                    "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
                    defaultClassNames.button_previous
                ),
                button_next: cn(
                    buttonVariants({ variant: buttonVariant }),
                    "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
                    defaultClassNames.button_next
                ),
                month_caption: cn(
                    "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
                    defaultClassNames.month_caption
                ),
                dropdowns: cn(
                    "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
                    defaultClassNames.dropdowns
                ),
                dropdown_root: cn(
                    "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
                    defaultClassNames.dropdown_root
                ),
                dropdown: cn(
                    "absolute bg-popover inset-0 opacity-0",
                    defaultClassNames.dropdown
                ),
                caption_label: cn(
                    "select-none font-medium text-black dark:text-white",
                    captionLayout === "label"
                        ? "text-sm"
                        : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-black/50 dark:[&>svg]:text-white/50 [&>svg]:size-3.5",
                    defaultClassNames.caption_label
                ),
                month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
                weekdays: cn("flex mb-1", defaultClassNames.weekdays),
                weekday: cn(
                    "text-black/50 dark:text-white/50 rounded-md flex-1 font-normal text-xs select-none text-center py-1",
                    defaultClassNames.weekday
                ),
                week: cn("flex w-full", defaultClassNames.week),
                week_number_header: cn(
                    "select-none w-(--cell-size)",
                    defaultClassNames.week_number_header
                ),
                week_number: cn(
                    "text-[0.8rem] select-none text-black/40 dark:text-white/40",
                    defaultClassNames.week_number
                ),
                day: cn(
                    "relative w-full h-full p-0.5 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
                    defaultClassNames.day
                ),
                range_start: cn(
                    "rounded-l-md bg-black/[0.06] dark:bg-white/[0.06]",
                    defaultClassNames.range_start
                ),
                range_middle: cn("rounded-none", defaultClassNames.range_middle),
                range_end: cn("rounded-r-md bg-black/[0.06] dark:bg-white/[0.06]", defaultClassNames.range_end),
                today: cn(
                    "bg-black/[0.06] dark:bg-white/[0.06] rounded-md data-[selected=true]:rounded-none",
                    defaultClassNames.today
                ),
                outside: cn(
                    "text-black/30 dark:text-white/30 aria-selected:text-black/30 dark:aria-selected:text-white/30",
                    defaultClassNames.outside
                ),
                disabled: cn(
                    "text-black/30 dark:text-white/30 opacity-50",
                    defaultClassNames.disabled
                ),
                hidden: cn("invisible", defaultClassNames.hidden),
                ...classNames,
            }}
            components={{
                Root: ({ className, rootRef, ...props }) => {
                    return (
                        <div
                            data-slot="calendar"
                            ref={rootRef}
                            className={cn(className)}
                            {...props}
                        />
                    )
                },
                Chevron: ({ className, orientation, ...props }) => {
                    if (orientation === "left") {
                        return (
                            <ChevronLeftIcon className={cn("size-4", className)} {...props} />
                        )
                    }

                    if (orientation === "right") {
                        return (
                            <ChevronRightIcon
                                className={cn("size-4", className)}
                                {...props}
                            />
                        )
                    }

                    return (
                        <ChevronDownIcon className={cn("size-4", className)} {...props} />
                    )
                },
                DayButton: CalendarDayButton,
                WeekNumber: ({ children, ...props }) => {
                    return (
                        <td {...props}>
                            <div className="flex size-(--cell-size) items-center justify-center text-center">
                                {children}
                            </div>
                        </td>
                    )
                },
                ...components,
            }}
            {...props}
        />
    )
}

function CalendarDayButton({
    className,
    day,
    modifiers,
    ...props
}: React.ComponentProps<typeof DayButton>) {
    const defaultClassNames = getDefaultClassNames()

    const ref = React.useRef<HTMLButtonElement>(null)
    React.useEffect(() => {
        if (modifiers.focused) ref.current?.focus()
    }, [modifiers.focused])

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString()}
            data-selected-single={
                modifiers.selected &&
                !modifiers.range_start &&
                !modifiers.range_end &&
                !modifiers.range_middle
            }
            data-range-start={modifiers.range_start}
            data-range-end={modifiers.range_end}
            data-range-middle={modifiers.range_middle}
            className={cn(
                "data-[selected-single=true]:bg-black dark:data-[selected-single=true]:bg-white data-[selected-single=true]:text-white dark:data-[selected-single=true]:text-black data-[range-middle=true]:bg-black/10 dark:data-[range-middle=true]:bg-white/10 data-[range-middle=true]:text-black dark:data-[range-middle=true]:text-white data-[range-start=true]:bg-black dark:data-[range-start=true]:bg-white data-[range-start=true]:text-white dark:data-[range-start=true]:text-black data-[range-end=true]:bg-black dark:data-[range-end=true]:bg-white data-[range-end=true]:text-white dark:data-[range-end=true]:text-black group-data-[focused=true]/day:border-black/30 dark:group-data-[focused=true]/day:border-white/30 group-data-[focused=true]/day:ring-black/20 dark:group-data-[focused=true]/day:ring-white/20 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] flex aspect-square h-8 w-8 min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
                defaultClassNames.day,
                className
            )}
            {...props}
        />
    )
}

export { Calendar, CalendarDayButton }
