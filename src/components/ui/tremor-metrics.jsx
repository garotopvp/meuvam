import * as React from "react"
import { cn } from "../../lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

/**
 * MetricCard - Inspirado no Tremor para Dashboards Esportivos
 */
export function MetricCard({
  title,
  metric,
  subtext,
  delta,
  deltaType = "increase", // increase | decrease | neutral
  icon: Icon,
  accentColor = "cyan", // cyan | orange | green | blue
  className,
}) {
  const accentGradients = {
    cyan: "from-cyan-500/10 to-blue-500/5 text-cyan-500 border-cyan-500/20",
    orange: "from-orange-500/10 to-amber-500/5 text-orange-500 border-orange-500/20",
    green: "from-emerald-500/10 to-teal-500/5 text-emerald-500 border-emerald-500/20",
    blue: "from-blue-500/10 to-indigo-500/5 text-blue-500 border-blue-500/20",
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border bg-gradient-to-br",
              accentGradients[accentColor] || accentGradients.cyan
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {metric}
        </span>
        {delta && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-bold",
              deltaType === "increase"
                ? "text-emerald-500"
                : deltaType === "decrease"
                ? "text-red-500"
                : "text-slate-400"
            )}
          >
            {deltaType === "increase" && <TrendingUp className="h-3.5 w-3.5" />}
            {deltaType === "decrease" && <TrendingDown className="h-3.5 w-3.5" />}
            {deltaType === "neutral" && <Minus className="h-3.5 w-3.5" />}
            <span>{delta}</span>
          </div>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
      )}
    </div>
  )
}

/**
 * ProgressBar - Barra de progresso esportiva Tremor
 */
export function ProgressBar({ value = 0, max = 100, label, currentLabel, color = "cyan" }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colorStyles = {
    cyan: "bg-gradient-to-r from-cyan-400 to-blue-500",
    orange: "bg-gradient-to-r from-orange-500 to-amber-500",
    green: "bg-gradient-to-r from-emerald-400 to-teal-500",
  }

  return (
    <div className="w-full space-y-1.5">
      {(label || currentLabel) && (
        <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>{label}</span>
          <span>{currentLabel || `${Math.round(percentage)}%`}</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorStyles[color] || colorStyles.cyan)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * ZoneBadge - Indicador visual das 5 Zonas de Treinamento
 */
export function ZoneBadge({ zone = 1 }) {
  const zones = {
    1: { name: "Z1 • Regenerativo", bg: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
    2: { name: "Z2 • Rodagem Base", bg: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    3: { name: "Z3 • Ritmo Moderado", bg: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    4: { name: "Z4 • Limiar / VAM", bg: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
    5: { name: "Z5 • Tiros Máximos", bg: "bg-red-500/15 text-red-600 border-red-500/30" },
  }

  const current = zones[zone] || zones[1]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
        current.bg
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      {current.name}
    </span>
  )
}
