export type CdsTrialCardSuggestionAction = {
  type?: string
  description?: string
  resource?: Record<string, unknown>
}

export type CdsTrialCardSuggestion = {
  label?: string
  uuid?: string
  actions?: CdsTrialCardSuggestionAction[]
}

export type CdsTrialCard = {
  uuid: string
  summary: string
  detail?: string
  indicator?: string
  source?: {
    label?: string
    url?: string
  }
  suggestions?: CdsTrialCardSuggestion[]
}

export type TrialCardServiceRequest = {
  authoredOn: string
  patientReference: string
  episodeOfCareReference: string
  performerDisplay: string
  description: string
}

export function isCdsTrialCard(card: CdsTrialCard): boolean {
  if (/^NCT\d+$/i.test(card.uuid)) {
    return true
  }

  return Array.isArray(card.suggestions)
    ? card.suggestions.some((suggestion) =>
        Array.isArray(suggestion.actions) &&
        suggestion.actions.some(
          (action) =>
            action.resource &&
            typeof action.resource === 'object' &&
            (action.resource as Record<string, unknown>).resourceType === 'ServiceRequest',
        ),
      )
    : false
}

function getTrialCardNctId(card: CdsTrialCard) {
  const suggestions = card.suggestions ?? []

  for (const suggestion of suggestions) {
    for (const action of suggestion.actions ?? []) {
      const resource = action.resource as Record<string, unknown> | undefined
      const code = resource?.code as
        | {
            coding?: Array<{ code?: string }>
          }
        | undefined

      const nctId = code?.coding?.[0]?.code?.trim()

      if (nctId) {
        return nctId
      }
    }
  }

  return card.uuid
}

export function getTrialCardId(card: CdsTrialCard) {
  return getTrialCardNctId(card).toLowerCase()
}

function getTrialCardPerformer(card: CdsTrialCard) {
  const suggestions = card.suggestions ?? []

  for (const suggestion of suggestions) {
    for (const action of suggestion.actions ?? []) {
      const resource = action.resource as Record<string, unknown> | undefined
      const performer = Array.isArray(resource?.performer)
        ? (resource.performer[0] as { display?: string } | undefined)
        : undefined

      if (typeof performer?.display === 'string' && performer.display.trim()) {
        return performer.display.trim()
      }
    }
  }

  return card.source?.label?.trim() || ''
}

export function getTrialCardServiceRequest(card: CdsTrialCard): TrialCardServiceRequest {
  const suggestions = card.suggestions ?? []

  for (const suggestion of suggestions) {
    for (const action of suggestion.actions ?? []) {
      const resource = action.resource as Record<string, unknown> | undefined

      if (resource?.resourceType === 'ServiceRequest') {
        const subject = resource.subject as { reference?: string } | undefined
        const extension = Array.isArray(resource.extension)
          ? (resource.extension[0] as { valueReference?: { reference?: string } } | undefined)
          : undefined

        return {
          authoredOn: typeof resource.authoredOn === 'string' ? resource.authoredOn : '',
          patientReference: typeof subject?.reference === 'string' ? subject.reference : '',
          episodeOfCareReference:
            typeof extension?.valueReference?.reference === 'string'
              ? extension.valueReference.reference
              : '',
          performerDisplay: getTrialCardPerformer(card),
          description: typeof action.description === 'string' ? action.description : '',
        }
      }
    }
  }

  return {
    authoredOn: '',
    patientReference: '',
    episodeOfCareReference: '',
    performerDisplay: getTrialCardPerformer(card),
    description: '',
  }
}

let storedTrialCards: CdsTrialCard[] = []

export function setCdsTrials(cards: CdsTrialCard[]) {
  storedTrialCards = cards
}

export function getCdsTrials() {
  return storedTrialCards
}

export function getCdsBestTrial() {
  return storedTrialCards[0] ?? null
}

export function getCdsTrialById(trialId: string | undefined) {
  if (!trialId) {
    return null
  }

  return storedTrialCards.find((card) => getTrialCardId(card) === trialId) ?? null
}
