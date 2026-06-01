import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

interface LoginResponse {
  url: string
}

async function getLoginUrl(path: string, fallbackMessage: string): Promise<string> {
  try {
    const response = await apiClient.get<LoginResponse>(path)

    if (!response.data?.url) {
      throw new Error('Login URL was not returned by the server.')
    }

    return response.data.url
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : error.message

      throw new Error(message || fallbackMessage)
    }

    throw new Error(fallbackMessage)
  }
}

export function getProviderLoginUrl() {
  return getLoginUrl('/api/auth/provider-login', 'Unable to start provider login.')
}

export function getPatientLoginUrl() {
  return getLoginUrl('/api/auth/patient-login', 'Unable to start patient login.')
}
