import { db } from '../db/db'
import { newId } from '../lib/id'
import type { LifeDomain } from '../db/types'

export async function createDomain(data: {
  spaceId: string
  name: string
  color: string
  icon: string
}): Promise<LifeDomain> {
  const count = await db.lifeDomains.where('spaceId').equals(data.spaceId).count()
  const domain: LifeDomain = {
    id: newId(),
    spaceId: data.spaceId,
    name: data.name,
    color: data.color,
    icon: data.icon,
    sortOrder: count,
    createdAt: new Date().toISOString(),
  }
  await db.lifeDomains.add(domain)
  return domain
}

export async function updateDomain(id: string, patch: Partial<LifeDomain>): Promise<void> {
  await db.lifeDomains.update(id, patch)
}

export async function archiveDomain(id: string): Promise<void> {
  await db.lifeDomains.update(id, { archivedAt: new Date().toISOString() })
}
