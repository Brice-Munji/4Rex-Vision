import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      <Reveal>
        <Badge variant="default" className="mb-4">
          {eyebrow}
        </Badge>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.1}>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground md:text-lg">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
