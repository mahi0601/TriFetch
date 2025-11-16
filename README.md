# ECG Classification System

A full-stack application for visualizing and classifying ECG arrhythmia events. The system loads ECG data from files, displays interactive plots with event markers, and can classify new ECG signals using a trained machine learning model.

## What This Does

The application reads ECG data files organized by event type (AFIB, VTACH, BRADY, etc.) and displays them in an interactive web interface. You can browse events, view their ECG waveforms, and see where the arrhythmia event occurred. There's also a prediction endpoint that can classify new ECG signals.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/          # REST API endpoints
│   │   ├── data/         # Data loading and caching
│   │   ├── ml/           # ML models, feature extraction, event detection
│   │   ├── models/       # Pydantic data models
│   │   ├── config.py     # Configuration settings
│   │   └── main.py       # FastAPI app entry point
│   ├── data/             # ECG dataset directory
│   ├── models/           # Trained model files
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── train_model.py    # Script to train the classifier
│   └── run_server.py     # Server startup script
├── frontend/
│   ├── src/
│   │   ├── components/   # React components (EventList, ECGPlot)
│   │   ├── services/     # API client
│   │   ├── types.ts      # TypeScript type definitions
│   │   └── App.tsx       # Main application component
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## How It Works

### Data Flow

1. **Data Loading**: On startup, the backend scans `backend/data/` for event folders. Each event folder contains:
   - A JSON metadata file (`event_N.json`) with patient ID, event type, timestamp, and approval status
   - One or more CSV files (`chunk1.txt`, `chunk2.txt`, etc.) with ECG channel data

2. **Event Processing**: The `DataLoader` reads each event's metadata and combines all chunk files into a single continuous ECG signal. It calculates where in the signal the event occurred based on the timestamp.

3. **Caching**: Events are cached in memory by `DataRepository` to avoid re-reading files on every request.

4. **Frontend Display**: When you open the app, it fetches the event list and displays them in a sidebar. Clicking an event loads its full ECG data and renders it with Plotly.js, showing both channels and marking the event location with a red vertical line.

### Model Training Flow

1. Load all events from the data directory
2. Extract features from each event's ECG data (statistical features like mean, std, percentiles, frequency domain features)
3. Train a Random Forest classifier on the extracted features
4. Save the trained model to `backend/models/ecg_classifier.pkl`

### Prediction Flow

1. Client sends raw ECG data (ch1 and ch2 arrays) to `/api/predict`
2. Backend extracts the same features used during training
3. Classifier predicts the event type and confidence
4. Event detector finds where in the signal the anomaly likely starts
5. Returns prediction, confidence, and event location

## Setup

### Prerequisites

- Docker and Docker Compose installed
- Or Python 3.9+ and Node.js 18+ for local development

### Quick Start with Docker

```bash
# Build and start both services
docker-compose build
docker-compose up -d

# Train the model (after adding data)
docker-compose exec backend python train_model.py

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The frontend will be at http://localhost:3000 and the API at http://localhost:8000.

### Data Format

Place your ECG dataset in `backend/data/` with this structure:

```
backend/data/
├── AFIB_approved/
│   ├── event_1/
│   │   ├── event_1.json
│   │   ├── chunk1.txt
│   │   ├── chunk2.txt
│   │   └── chunk3.txt
│   └── event_2/
│       └── ...
├── VTACH_rejected/
│   └── ...
└── ...
```

**JSON Metadata Format** (`event_N.json`):
```json
{
  "Patient_IR_ID": "172A46BA-64B9-4A77-AAFA-F674C1B362AF",
  "EventOccuredTime": "2025-11-04 16:41:23.440",
  "Event_Name": "AFIB",
  "IsRejected": "0"
}
```

**ECG Data Format** (`chunk*.txt` - CSV with header):
```
ch1,ch2
1514,11
1516,42
1519,52
...
```

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python train_model.py
python run_server.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### GET /api/events

Returns a list of all available events.

**Response:**
```json
[
  {
    "event_id": "AFIB_approved_event_1",
    "event_type": "AFIB",
    "is_approved": true,
    "patient_id": "172A46BA-64B9-4A77-AAFA-F674C1B362AF"
  },
  ...
]
```

**Response Model:** `List[EventListResponse]`

### GET /api/events/{event_id}

Returns the full ECG data and metadata for a specific event.

**Path Parameters:**
- `event_id` (string): The event identifier (e.g., "AFIB_approved_event_1")

**Response:**
```json
{
  "event_id": "AFIB_approved_event_1",
  "metadata": {
    "patient_id": "172A46BA-64B9-4A77-AAFA-F674C1B362AF",
    "event_type": "AFIB",
    "event_time": "2025-11-04 16:41:23.440",
    "is_approved": true
  },
  "ecg_data": {
    "ch1": [1514, 1516, 1519, ...],
    "ch2": [11, 42, 52, ...],
    "sampling_rate": 200
  },
  "event_sample_index": 6000,
  "event_time_offset": 30.0
}
```

**Errors:**
- `404`: Event not found

### POST /api/predict

Classifies a new ECG signal and detects where the event occurs.

**Request Body:**
```json
{
  "ch1": [1514, 1516, 1519, ...],
  "ch2": [11, 42, 52, ...]
}
```

**Request Model:** `PredictionRequest`
- `ch1` (List[float]): ECG channel 1 data
- `ch2` (List[float]): ECG channel 2 data

**Response:**
```json
{
  "event_type": "AFIB",
  "confidence": 0.95,
  "event_sample_index": 6000,
  "event_time_offset": 30.0
}
```

**Response Model:** `PredictionResponse`
- `event_type` (string): Predicted arrhythmia type
- `confidence` (float): Prediction confidence (0-1)
- `event_sample_index` (int): Sample index where event detected
- `event_time_offset` (float): Time offset in seconds where event detected

**Errors:**
- `503`: Model not trained (need to run `train_model.py` first)

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

### GET /

Root endpoint.

**Response:**
```json
{
  "message": "ECG Classification API"
}
```

## Technical Details

### Backend Stack

- **FastAPI**: Chosen for async support, automatic OpenAPI docs, and type safety with Pydantic
- **Random Forest Classifier**: Good baseline for ECG classification, handles non-linear patterns, provides feature importance
- **Feature Extraction**: 24 features per ECG (12 per channel) including statistical (mean, std, percentiles) and frequency domain features
- **Event Detection**: Window-based anomaly detection using statistical thresholds

### Frontend Stack

- **React + TypeScript**: Type safety and component reusability
- **Plotly.js**: Handles large datasets well (18k+ samples), interactive zoom/pan, medical-grade visualization
- **Axios**: API client with error handling

### Architecture Decisions

The code follows SOLID principles:
- Single responsibility: Each class has one job (DataLoader loads, Classifier classifies, etc.)
- Dependency injection: FastAPI's dependency system for loose coupling
- Interfaces: `IClassifier` and `IEventDetector` allow swapping implementations

Data is cached in memory after first load to keep response times under 8 seconds for episode loading.

## Screenshots

### Main Application View
The application interface displays a sidebar with 62 events and a main content area for ECG visualization. The header shows "ECG Viewer" and the layout is clean and modern.

![Main Application View](screenshots/main-application-view.png)
*Full application view showing event list sidebar (left) with 62 events and ECG plot area (right) ready for event selection*

### Event List Sidebar
The sidebar displays all available events organized by type (AFIB, VTACH, BRADY, PAUSE, TACHY) with their approval status. Each event shows the event type, a status badge (green for approved, red for rejected), event ID, and patient ID.

![Event List](screenshots/event-list-sidebar.png)
*Scrollable event list showing multiple event types with approved (green) and rejected (red) status badges. Events are clickable to view their ECG data.*

### AFIB Event Visualization
AFIB (Atrial Fibrillation) event visualization showing irregular ECG patterns. The red vertical line marks the exact moment the event occurred.

![AFIB Event](screenshots/afib-event.png)
*AFIB event ECG plot displaying both Channel 1 (blue) and Channel 2 (green) waveforms with prominent red event marker. The irregular patterns characteristic of atrial fibrillation are clearly visible.*

### Additional AFIB Event View
Another view of an AFIB event showing different ECG patterns and event marker placement.

![AFIB Event View](screenshots/afib-event-2.png)
*Alternative AFIB event visualization demonstrating the variability in atrial fibrillation patterns across different recordings.*

### VTACH Event with Event Marker
VTACH (Ventricular Tachycardia) event showing rapid ventricular rhythms. The event marker indicates the event occurrence.

![VTACH Event](screenshots/vtach-event.png)
*VTACH event visualization with red event marker. The plot shows rapid, regular ventricular rhythms typical of ventricular tachycardia across both channels.*

### BRADY Event with Event Marker
BRADY (Bradycardia) event displaying slower heart rate patterns. The event marker shows when the bradycardia event was detected.

![BRADY Event](screenshots/brady-event.png)
*BRADY event plot with red event marker. The slower, more spaced-out heartbeats characteristic of bradycardia are visible in both ECG channels.*

### Event Information Panel
The information panel displays key metrics for the selected event including event type, precise event time, recording duration, sampling rate, and total number of samples.

![Event Information](screenshots/event-information-panel.png)
*Event details panel showing: Event Type, Event Time, Duration, Sampling Rate, and Total Samples. This information helps users understand the context of each ECG recording.*

### Multiple Event Types View
The sidebar demonstrates the application's ability to handle various arrhythmia types. Events are clearly categorized and color-coded by their approval status.

![Multiple Event Types](screenshots/multiple-event-types.png)
*Sidebar view showing different event types (AFIB, VTACH, BRADY, PAUSE, TACHY) with their respective status badges. The interface supports both approved and rejected events for comprehensive analysis.*

### API Documentation
FastAPI automatically generates interactive API documentation using Swagger UI, making it easy to test endpoints and understand request/response formats.

![API Documentation](screenshots/api-documentation.png)
*Swagger UI interface showing all available API endpoints including GET /api/events, GET /api/events/{event_id}, POST /api/predict, and GET /api/health. Each endpoint includes detailed request/response schemas and can be tested directly from the browser.*

### Additional Application Views

![Application View 1](screenshots/application-view-1.png)
*Application interface showing event selection and ECG visualization with interactive controls.*

![Application View 2](screenshots/application-view-2.png)
*Another view of the application demonstrating the responsive layout and event browsing interface.*

![Application View 3](screenshots/application-view-3.png)
*ECG plot visualization with zoom and pan capabilities, showing detailed waveform analysis.*

![Application View 4](screenshots/application-view-4.png)
*Event list and ECG visualization interface with multiple events displayed in the sidebar.*

![Application View 5](screenshots/application-view-5.png)
*Initial application view showing the event list and empty ECG plot area ready for event selection.*

## Future Improvements

- Deep learning models (CNN/LSTM) for better feature learning
- Database storage instead of file-based for faster queries
- Real-time streaming for large ECG files
- Advanced filtering and search in the UI
- Export functionality for plots
- Model versioning and A/B testing
