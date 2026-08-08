import { CATEGORY_ICON_GROUPS } from '../../lib/categoryStyle'
import { ColorIconBadge } from '../../components/ui/ColorIconBadge'
import { PRESET_COLORS } from '../../lib/presets'

/** Dev-only contact sheet for reviewing the drawn icon set. Unlinked. */
export function IconSheetPage() {
  let i = 0
  return (
    <div style={{ padding: 16, background: 'var(--stoa-bg)', minHeight: '100%' }}>
      {CATEGORY_ICON_GROUPS.map((g) => (
        <div key={g.labelKey} style={{ marginBottom: 18 }}>
          <div className="font-heading text-[10px] uppercase" style={{ color: 'var(--stoa-text-muted)', marginBottom: 6 }}>
            {g.labelKey.replace('iconGroups.', '')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {g.icons.map((name) => (
              <div key={name} style={{ textAlign: 'center', width: 68 }}>
                <ColorIconBadge color={PRESET_COLORS[i++ % PRESET_COLORS.length]} icon={name} size="detail" />
                <div style={{ fontSize: 9, color: 'var(--stoa-text-muted)', marginTop: 3 }}>{name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
