import type { GraphRagChunk, GraphRagRelation } from '@/features/chat/model/graph-rag'

function buildRelationId(
  locale: GraphRagChunk['locale'],
  sourceEntityId: string,
  targetEntityId: string,
  type: GraphRagRelation['type'],
): string {
  return `${locale}:${type}:${sourceEntityId}:${targetEntityId}`
}

function sortEntityPair(entityIds: [string, string]): [string, string] {
  return entityIds[0] < entityIds[1]
    ? entityIds
    : [entityIds[1], entityIds[0]]
}

export function buildGraphRagRelations(
  chunks: GraphRagChunk[],
): GraphRagRelation[] {
  const relationMap = new Map<string, GraphRagRelation>()
  const chunksBySlug = new Map<string, GraphRagChunk[]>()

  for (const chunk of chunks) {
    const slugChunks = chunksBySlug.get(chunk.slug) ?? []
    slugChunks.push(chunk)
    chunksBySlug.set(chunk.slug, slugChunks)

    for (let sourceIndex = 0; sourceIndex < chunk.entityIds.length; sourceIndex += 1) {
      for (
        let targetIndex = sourceIndex + 1;
        targetIndex < chunk.entityIds.length;
        targetIndex += 1
      ) {
        const [sourceEntityId, targetEntityId] = sortEntityPair([
          chunk.entityIds[sourceIndex],
          chunk.entityIds[targetIndex],
        ])
        const relationId = buildRelationId(
          chunk.locale,
          sourceEntityId,
          targetEntityId,
          'co_occurs',
        )
        const existingRelation = relationMap.get(relationId)

        if (!existingRelation) {
          relationMap.set(relationId, {
            id: relationId,
            locale: chunk.locale,
            sourceEntityId,
            targetEntityId,
            type: 'co_occurs',
            weight: 1,
          })
          continue
        }

        existingRelation.weight += 1
      }
    }
  }

  for (const slugChunks of chunksBySlug.values()) {
    if (slugChunks.length < 2) {
      continue
    }

    const allEntityIds = [...new Set(slugChunks.flatMap((chunk) => chunk.entityIds))]

    for (let sourceIndex = 0; sourceIndex < allEntityIds.length; sourceIndex += 1) {
      for (
        let targetIndex = sourceIndex + 1;
        targetIndex < allEntityIds.length;
        targetIndex += 1
      ) {
        const [sourceEntityId, targetEntityId] = sortEntityPair([
          allEntityIds[sourceIndex],
          allEntityIds[targetIndex],
        ])
        const relationId = buildRelationId(
          slugChunks[0].locale,
          sourceEntityId,
          targetEntityId,
          'same_slug',
        )
        const existingRelation = relationMap.get(relationId)

        if (!existingRelation) {
          relationMap.set(relationId, {
            id: relationId,
            locale: slugChunks[0].locale,
            sourceEntityId,
            targetEntityId,
            type: 'same_slug',
            weight: 1,
          })
          continue
        }

        existingRelation.weight += 1
      }
    }
  }

  return [...relationMap.values()]
}
