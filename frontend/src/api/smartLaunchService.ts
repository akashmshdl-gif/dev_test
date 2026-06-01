import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

interface SmartLaunchResponse {
  success: boolean
  url: string
  state: string
}

/**
 * Sends the iss and launch parameters to the backend to initiate
 * the SMART on FHIR EHR launch flow. Returns the authorization URL
 * that the browser should redirect to.
 */
export async function initiateSmartLaunch(
  iss: string,
  launch: string,
): Promise<string> {
  try {
    const response = await apiClient.post<SmartLaunchResponse>(
      '/api/auth/smart-launch',
      { iss, launch },
    )

    if (!response.data?.url) {
      throw new Error('Authorization URL was not returned by the server.')
    }

    return response.data.url
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : error.message

      throw new Error(message || 'SMART EHR launch failed.')
    }

    throw new Error('SMART EHR launch failed.')
  }
}
