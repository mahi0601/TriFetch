import { Event } from '../types'
import './EventList.css'

interface EventListProps {
  events: Event[]
  selectedEvent: Event | null
  onEventSelect: (event: Event) => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function EventList({ 
  events, 
  selectedEvent, 
  onEventSelect, 
  loading = false, 
  error = null,
  onRetry 
}: EventListProps) {
  const handleEventClick = (event: Event) => {
    if (!loading) {
      onEventSelect(event)
    }
  }

  const renderEmptyState = () => {
    if (loading && events.length === 0) {
      return (
        <div className="event-list-empty">
          <div className="loading-spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
          <p>Loading events...</p>
        </div>
      )
    }

    if (error && events.length === 0) {
      return (
        <div className="event-list-empty">
          <div className="empty-icon">⚠️</div>
          <p className="error-message">{error}</p>
          {onRetry && (
            <button className="retry-button" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )
    }

    if (!loading && !error && events.length === 0) {
      return (
        <div className="event-list-empty">
          <div className="empty-icon">📂</div>
          <p>No events found</p>
          <p className="help-text">Add data to backend/data/ directory</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="event-list">
      <div className="event-list-header">
        <h2>Events ({events.length})</h2>
        {loading && events.length > 0 && (
          <div className="loading-indicator">Refreshing...</div>
        )}
      </div>
      <div className="event-list-items">
        {renderEmptyState()}
        {events.map((event) => {
          const isSelected = selectedEvent?.event_id === event.event_id
          return (
            <div
              key={event.event_id}
              className={`event-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleEventClick(event)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleEventClick(event)
                }
              }}
              aria-label={`Select event ${event.event_type} ${event.is_approved ? 'approved' : 'rejected'}`}
            >
              <div className="event-item-header">
                <span className="event-type">{event.event_type || 'UNKNOWN'}</span>
                <span className={`event-status ${event.is_approved ? 'approved' : 'rejected'}`}>
                  {event.is_approved ? 'Approved' : 'Rejected'}
                </span>
              </div>
              <div className="event-item-details">
                <div className="event-id">
                  {event.event_id || 'N/A'}
                </div>
                <div className="patient-id">
                  {event.patient_id 
                    ? `${event.patient_id.substring(0, 8)}...`
                    : 'Unknown Patient'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
