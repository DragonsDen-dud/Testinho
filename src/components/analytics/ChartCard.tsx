import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { exportSvgAsPng } from '../../lib/chartExport'

/** Article 46 — every analytics chart gets the same PNG export affordance. */
export function ChartCard({ title, filename, children }: { title: string; filename: string; children: ReactNode }) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    setExporting(true)
    try {
      await exportSvgAsPng(svg, filename)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          className="text-xs text-[var(--stoa-text-muted)] hover:text-[var(--stoa-text)] disabled:opacity-40"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? t('common.loading') : t('analytics.exportPng')}
        </button>
      </div>
      <div ref={containerRef}>{children}</div>
    </section>
  )
}
