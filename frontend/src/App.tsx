import { useState, useEffect, useCallback } from 'react'
import EventList from './components/EventList'
import ECGPlot from './components/ECGPlot'
import { Event, ECGData } from './types'
import { apiService } from './services/api'
import './App.css'

function App() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [ecgData, setEcgData] = useState<ECGData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true)
    setError(null)
    try {
      const data = await apiService.getEvents()
      setEvents(data)
      setRetryCount(0)
      if (data.length === 0) {
        setError('No events found. Please ensure data is placed in backend/data/ directory.')
      }
    } catch (err: any) {
      const errorMessage = err.response?.status === 404 
        ? 'Backend API not found. Please ensure the backend server is running on port 8000.'
        : err.response?.status >= 500
        ? 'Backend server error. Please check backend logs and ensure the server is healthy.'
        : err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')
        ? 'Cannot connect to backend. Please ensure the backend server is running.'
        : 'Failed to load events. Please check your connection and ensure backend is running.'
      setError(errorMessage)
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleEventSelect = useCallback(async (event: Event) => {
    if (selectedEvent?.event_id === event.event_id && ecgData) {
      return
    }

    setSelectedEvent(event)
    setLoading(true)
    setError(null)
    setEcgData(null)
    
    try {
      const data = await apiService.getEventData(event.event_id)
      if (!data || !data.ecg_data) {
        throw new Error('Invalid ECG data received')
      }
      setEcgData(data)
    } catch (err: any) {
      const errorMessage = err.response?.status === 404
        ? `Event "${event.event_id}" not found.`
        : err.response?.status >= 500
        ? 'Server error while loading ECG data. Please try again.'
        : 'Failed to load ECG data. Please check your connection.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedEvent, ecgData])

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1)
    loadEvents()
  }, [loadEvents])

  const renderMainContent = () => {
    if (loading && !ecgData) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading ECG data...</p>
        </div>
      )
    }

    if (error && !loadingEvents && !ecgData) {
      return (
        <div className="error-container">
          <div className="error-title">Error</div>
          <div className="error-message">{error}</div>
          {retryCount < 3 && (
            <button 
              className="retry-button" 
              onClick={handleRetry}
              style={{ marginTop: '1rem' }}
            >
              Retry
            </button>
          )}
        </div>
      )
    }

    if (ecgData && !loading) {
      return (
        <ECGPlot
          ecgData={ecgData}
          eventSampleIndex={ecgData.event_sample_index}
          eventType={ecgData.metadata.event_type}
        />
      )
    }

    if (!ecgData && !loading && !error && !loadingEvents) {
      return (
        <div className="placeholder">
          <div className="placeholder-icon">📈</div>
          <div className="placeholder-title">
            {events.length === 0 
              ? 'No Events Available'
              : 'Select an Event to View'}
          </div>
          <div className="placeholder-text">
            {events.length === 0 
              ? 'Please add ECG data to the backend/data/ directory and restart the backend server to view events.'
              : 'Choose an event from the sidebar to view its ECG waveform and event details.'}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ECG Viewer</h1>
      </header>
      <div className="app-content">
        <aside className="sidebar">
          <EventList
            events={events}
            selectedEvent={selectedEvent}
            onEventSelect={handleEventSelect}
            loading={loadingEvents}
            error={error && events.length === 0 ? error : null}
            onRetry={handleRetry}
          />
        </aside>
        <main className="main-content">
          {renderMainContent()}
        </main>
      </div>
    </div>
  )
}

export default App
