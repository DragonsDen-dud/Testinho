import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { findOrphans, clearOrphanReference, deleteOrphanRecord, type OrphanRecord } from '../lib/integrityCheck'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

const TABLE_LABEL_KEYS: Record<string, string> = {
  appSettings: 'integrity.tableAppSettings',
  spaces: 'integrity.tableSpaces',
  lifeDomains: 'integrity.tableLifeDomains',
  timeBlocks: 'integrity.tableTimeBlocks',
  priorityLevels: 'integrity.tablePriorityLevels',
  habits: 'integrity.tableHabits',
  habitLogs: 'integrity.tableHabitLogs',
  todos: 'integrity.tableTodos',
  planEntries: 'integrity.tablePlanEntries',
  projects: 'integrity.tableProjects',
  journalPrompts: 'integrity.tableJournalPrompts',
  journalEntries: 'integrity.tableJournalEntries',
  diagnosticEntries: 'integrity.tableDiagnosticEntries',
  reminderStates: 'integrity.tableReminderStates',
}

/** Article 53 — user-triggered scan for dangling foreign-key references
 * anywhere in the local database, with two explicit resolution actions per
 * orphan found. Never resolves anything automatically/silently. */
export function IntegrityCheckPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [orphans, setOrphans] = useState<OrphanRecord[] | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  async function runScan() {
    setOrphans(null)
    setOrphans(await findOrphans())
  }

  useEffect(() => {
    runScan()
  }, [])

  function orphanKey(o: OrphanRecord): string {
    return `${o.fromTable}:${o.recordId}:${o.field}`
  }

  async function handleClear(orphan: OrphanRecord) {
    setResolving(orphanKey(orphan))
    try {
      await clearOrphanReference(orphan)
      await runScan()
    } finally {
      setResolving(null)
    }
  }

  async function handleDelete(orphan: OrphanRecord) {
    if (!confirm(t('integrity.deleteRecordConfirm'))) return
    setResolving(orphanKey(orphan))
    try {
      await deleteOrphanRecord(orphan)
      await runScan()
    } finally {
      setResolving(null)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('integrity.title')}</h1>
        <div className="w-10" />
      </div>

      <p className="text-xs text-[var(--stoa-text-muted)]">{t('integrity.hint')}</p>

      <Button variant="secondary" onClick={runScan} disabled={orphans === null}>
        {t('integrity.rescan')}
      </Button>

      {orphans === null && <p className="text-sm text-[var(--stoa-text-muted)] text-center py-4">{t('integrity.scanning')}</p>}

      {orphans !== null && orphans.length === 0 && <EmptyState text={t('integrity.noIssues')} />}

      {orphans !== null && orphans.length > 0 && (
        <ul className="flex flex-col gap-2">
          {orphans.map((o) => {
            const key = orphanKey(o)
            const isResolving = resolving === key
            return (
              <li
                key={key}
                className="flex flex-col gap-2 rounded-xl border border-[var(--stoa-danger)]/30 bg-[var(--stoa-danger)]/5 px-3.5 py-3"
              >
                <div className="text-sm">
                  {t('integrity.orphanDescription', {
                    table: t(TABLE_LABEL_KEYS[o.fromTable] ?? o.fromTable),
                    field: o.field,
                    count: o.danglingIds.length,
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={isResolving} onClick={() => handleClear(o)}>
                    {t('integrity.clearReference')}
                  </Button>
                  <Button variant="danger" disabled={isResolving} onClick={() => handleDelete(o)}>
                    {t('integrity.deleteRecord')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
