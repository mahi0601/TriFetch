import axios from 'axios'
import { Event, ECGData } from '../types'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  }
)

class ApiService {
  async getEvents(): Promise<Event[]> {
    try {
      const response = await apiClient.get<Event[]>('/events')
      return response.data
    } catch (error: any) {
      throw error
    }
  }

  async getEventData(eventId: string): Promise<ECGData> {
    const response = await axios.get<ECGData>(`${API_BASE_URL}/events/${eventId}`)
    return response.data
  }

  async predictEvent(ch1: number[], ch2: number[]): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/predict`, { ch1, ch2 })
    return response.data
  }
}

export const apiService = new ApiService()

