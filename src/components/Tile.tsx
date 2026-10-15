import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react";
import { cn } from "./ui";

export type TileVariant = "paper" | "dark" | "accent" | "recessed" | "dashed" | "photo";

const variants: Record<TileVariant, string> = {
  paper: "bg-paper text-ink px-3.5 py-3 min-h-[104px]",
  dark: "bg-lower text-paper px-3.5 py-3 min-h-[104px]",
  accent: "bg-higher text-on-higher px-3.5 py-3 min-h-[104px]",
  recessed: "bg-tile text-ink px-3.5 py-3 min-h-[104px]",
  dashed: "bg-paper text-ink px-3.5 py-3 min-h-[104px]",
  photo: "relative overflow-hidden bg-lower p-0 min-h-[116px]",
};

type TileProps<T extends ElementType> = {
  as?: T;
  variant?: TileVariant;
  /** The one hero tile per screen: bigger radius and a hard shadow. */
  hero?: boolean;
  /** Span both bento columns. */
  wide?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/** Bento tile: 2.5px ink border, 20px radius, content spread top to bottom. */
export function Tile<T extends ElementType = "div">({
  as,
  variant = "paper",
  hero,
  wide,
  className,
  style,
  ...rest
}: TileProps<T>) {
  const Comp: ElementType = as ?? "div";
  const s: CSSProperties = { ...(variant === "dashed" && { borderStyle: "dashed" }), ...style };
  return (
    <Comp
      className={cn(
        "flex flex-col justify-between rounded-tile text-left no-underline border-poster",
        variants[variant],
        hero && "mr-[5px] rounded-hero shadow-hard",
        wide && "col-span-2",
        className,
      )}
      style={s}
      {...rest}
    />
  );
}

export function Bento({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mt-3.5 grid grid-cols-2 gap-2", className)} {...rest} />;
}

/** Big Anton number inside a tile. */
export function TileNum({ className, ...rest }: ComponentPropsWithoutRef<"span">) {
  return <span className={cn("display text-[44px]", className)} {...rest} />;
}
