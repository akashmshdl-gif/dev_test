export function buildClinicalTrialSearch(instanceKey?: string, trialId?: string) {
  const params = new URLSearchParams()

  if (instanceKey) {
    params.set('instanceKey', instanceKey)
  }

  if (trialId) {
    params.set('trialId', trialId)
  }

  const search = params.toString()

  return search ? `?${search}` : ''
}

export function buildProviderDashboardPath(instanceKey?: string) {
  const search = buildClinicalTrialSearch(instanceKey)

  return `/provider-dashboard${search}`
}
