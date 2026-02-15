"use client";

import { useEffect, useState } from "react";

interface AnimatedSummaryCardsProps {
  workedMs: number;
  breakMs: number;
  overtimeMs: number;
}

function formatHHMMSS(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
}

function AnimatedCounter({ value, formatFn }: { value: number; formatFn: (v: number) => string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 600;
    const startVal = display;
    const diff = value - startVal;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startVal + diff * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span>{formatFn(display)}</span>;
}

export default function AnimatedSummaryCards({ workedMs, breakMs, overtimeMs }: AnimatedSummaryCardsProps) {
  const overtimeHours = overtimeMs / 3600000;

  const cards = [
    {
      label: "Worked Hours",
      value: workedMs,
      format: formatHHMMSS,
      icon: "●",
      color: "text-emerald-400",
      bg: "from-emerald-500/10 to-emerald-600/5",
      border: "border-emerald-500/20"
    },
    {
      label: "Break Hours",
      value: breakMs,
      format: formatHHMMSS,
      icon: "●",
      color: "text-amber-400",
      bg: "from-amber-500/10 to-amber-600/5",
      border: "border-amber-500/20"
    },
    {
      label: "Overtime Hours",
      value: overtimeMs,
      format: (ms: number) => `${(ms / 3600000).toFixed(2)}h`,
      icon: "●",
      color: "text-rose-400",
      bg: "from-rose-500/10 to-rose-600/5",
      border: "border-rose-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`animate-fade-in-up rounded-xl border bg-gradient-to-br p-6 backdrop-blur-sm shadow-lg transition-shadow hover:shadow-xl ${card.bg} ${card.border}`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${card.color}`}>
            <span>{card.icon}</span>
            {card.label}
          </div>
          <p className={`font-mono text-3xl font-bold ${card.color}`}>
            <AnimatedCounter value={card.value} formatFn={card.format} />
          </p>
        </div>
      ))}
    </div>
  );
}
