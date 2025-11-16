from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel

from app.data.data_repository import DataRepository
from app.ml.classifier import ECGClassifier
from app.ml.event_detector import EventDetector
from app.ml.feature_extractor import FeatureExtractor
from app.models.ecg_data import ECGData
from app.config import settings

router = APIRouter()


class ECGPlotRequest(BaseModel):
    event_id: str


class PredictionRequest(BaseModel):
    ch1: List[float]
    ch2: List[float]


class PredictionResponse(BaseModel):
    event_type: str
    confidence: float
    event_sample_index: int
    event_time_offset: float


class EventListResponse(BaseModel):
    event_id: str
    event_type: str
    is_approved: bool
    patient_id: str


def get_data_repository() -> DataRepository:
    return DataRepository()


def get_classifier() -> Optional[ECGClassifier]:
    classifier = ECGClassifier()
    from pathlib import Path
    
    if settings.model_path:
        model_path = Path(settings.model_path)
        if model_path.is_dir():
            model_file = model_path / "ecg_classifier.pkl"
        else:
            model_file = model_path
    else:
        model_file = Path("./models/ecg_classifier.pkl")
    
    try:
        if model_file.exists() and model_file.is_file():
            classifier.load(str(model_file))
            return classifier
    except Exception:
        pass
    return None


def get_event_detector() -> EventDetector:
    return EventDetector()


@router.get("/events", response_model=List[EventListResponse])
async def get_events(
    data_repo: DataRepository = Depends(get_data_repository)
):
    try:
        events = data_repo.get_all_events()
        result = [
            EventListResponse(
                event_id=event.get('event_id', event.get('folder_name', '')),
                event_type=event['metadata'].Event_Name,
                is_approved=event['metadata'].is_approved(),
                patient_id=event['metadata'].Patient_IR_ID
            )
            for event in events
        ]
        return result
    except Exception:
        return []


@router.get("/events/{event_id}")
async def get_event_data(
    event_id: str,
    data_repo: DataRepository = Depends(get_data_repository)
):
    event = data_repo.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    combined_ecg = event['combined_ecg']
    metadata = event['metadata']
    
    return {
        "event_id": event_id,
        "metadata": {
            "patient_id": metadata.Patient_IR_ID,
            "event_type": metadata.Event_Name,
            "event_time": metadata.EventOccuredTime,
            "is_approved": metadata.is_approved()
        },
        "ecg_data": {
            "ch1": combined_ecg.ch1,
            "ch2": combined_ecg.ch2,
            "sampling_rate": combined_ecg.sampling_rate
        },
        "event_sample_index": event.get('event_sample_index', 0),
        "event_time_offset": event.get('event_offset_seconds', 0.0)
    }


@router.post("/predict", response_model=PredictionResponse)
async def predict_event(
    request: PredictionRequest,
    classifier: Optional[ECGClassifier] = Depends(get_classifier),
    detector: EventDetector = Depends(get_event_detector)
):
    if not classifier:
        raise HTTPException(
            status_code=503,
            detail="Model not trained. Please train the model first."
        )
    
    ecg_data = ECGData(
        ch1=request.ch1,
        ch2=request.ch2,
        sampling_rate=settings.sampling_rate
    )
    
    features = FeatureExtractor.extract_features(ecg_data)
    predictions = classifier.predict(features)
    probabilities = classifier.predict_proba(features)
    
    event_type = predictions[0]
    confidence = float(max(probabilities[0]))
    
    sample_index, time_offset = detector.detect_event_start(ecg_data)
    
    return PredictionResponse(
        event_type=event_type,
        confidence=confidence,
        event_sample_index=sample_index,
        event_time_offset=time_offset
    )


@router.get("/health")
async def health_check():
    return {"status": "healthy"}

