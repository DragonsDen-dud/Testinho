import { useTranslation } from 'react-i18next'
import type { ConnectivityState, ConnectivityStatuses } from '../../lib/connectivity'

function StatusDot({ state }: { state: ConnectivityState }) {
  return (
    <span
      aria-hidden
      className={`w-1.5 h-1.5 rounded-full ${
        state === 'online' ? 'bg-[var(--stoa-accent)]' : state === 'offline' ? 'bg-[var(--stoa-danger)]' : 'bg-[var(--stoa-text-muted)]'
      }`}
    />
  )
}

/** Article 44 — the three-status Connectivity Check module (app/network/
 * Claude API), completing E.9's original scope: previously only a single
 * Claude-specific indicator existed (in Settings → AI reports). */
export function ConnectivityPanel({ statuses }: { statuses: ConnectivityStatuses }) {
  const { t } = useTranslation()

  const items: { key: keyof ConnectivityStatuses; label: string }[] = [
    { key: 'app', label: t('dashboard.connectivityApp') },
    { key: 'network', label: t('dashboard.connectivityNetwork') },
    { key: 'claudeApi', label: t('dashboard.connectivityClaudeApi') },
  ]

  return (
    <div className="flex items-center gap-4 text-xs text-[var(--stoa-text-muted)]">
      {items.map((item) => (
        <span key={item.key} className="flex items-center gap-1.5" title={t(`settings.connectivity_${statuses[item.key]}`)}>
          <StatusDot state={statuses[item.key]} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
