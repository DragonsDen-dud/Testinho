import { ColorIconBadge } from '../../ui/ColorIconBadge'
import { useDomains } from '../../../state/useDomains'
import { useProject } from '../../../state/useProjects'
import { useCategoryStyleMap } from '../../../state/useCategoryStyles'
import { resolveTaskCategoryStyle } from '../../../lib/taskCategoryStyle'
import type { Todo } from '../../../db/types'

/**
 * Same "closed circuit" contract as Habits' HabitCategoryBadge: goes
 * through resolveCategoryStyle + useCategoryStyleMap (via
 * resolveTaskCategoryStyle), never Project.color/LifeDomain.color
 * directly, so a Pro Settings edit shows up here immediately.
 */
export function TaskCategoryBadge({ todo, size = 'row' }: { todo: Todo; size?: 'row' | 'detail' }) {
  const domains = useDomains(todo.spaceId)
  const domain = domains.find((d) => d.id === todo.domainId)
  const project = useProject(todo.projectId)
  const styleMap = useCategoryStyleMap()

  const style = resolveTaskCategoryStyle(project, domain, styleMap)
  return <ColorIconBadge color={style.color} icon={style.icon} size={size} />
}
