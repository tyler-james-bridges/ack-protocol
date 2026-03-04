export function TwitterSyntax() {
  return (
    <div className="rounded-xl border border-border p-4 card-glow">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="h-4 w-4 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <h3 className="text-sm font-semibold">Tweet Syntax</h3>
      </div>
      <div className="rounded-lg bg-muted/30 border border-border/50 p-3 font-mono text-xs space-y-1.5 overflow-x-auto">
        <Row cmd="@ack_onchain @agent ++" desc="basic kudos" />
        <Row cmd="@ack_onchain @agent ++ reliable" desc="with category" />
        <Row cmd='@ack_onchain @agent ++ "great work!"' desc="with message" />
        <Row
          cmd='@ack_onchain @agent ++ 5 speed "fast!"'
          desc="amount + category + message"
        />
        <Row cmd="@ack_onchain @agent --" desc="negative review" />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Categories: reliability, speed, accuracy, creativity, collaboration,
        security
      </p>
    </div>
  );
}

function Row({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-foreground whitespace-nowrap">{cmd}</span>
      <span className="text-muted-foreground shrink-0">{desc}</span>
    </div>
  );
}
