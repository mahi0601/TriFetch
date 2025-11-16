from typing import List, Dict, Optional
from pathlib import Path
from app.data.data_loader import DataLoader
from app.config import settings


class DataRepository:
    def __init__(self, data_path: str = None):
        self.loader = DataLoader(data_path)
        self._events_cache: Optional[List[Dict]] = None
    
    def get_all_events(self, force_reload: bool = False) -> List[Dict]:
        if self._events_cache is None or force_reload:
            self._events_cache = self.loader.scan_dataset()
        return self._events_cache
    
    def get_event_by_id(self, event_id: str) -> Optional[Dict]:
        events = self.get_all_events()
        for event in events:
            if event.get('event_id') == event_id or event.get('folder_name') == event_id:
                return event
        return None
    
    def get_events_by_type(self, event_type: str) -> List[Dict]:
        events = self.get_all_events()
        return [e for e in events if e['metadata'].Event_Name == event_type]
    
    def get_event_ids(self) -> List[str]:
        events = self.get_all_events()
        return [e.get('event_id', e.get('folder_name', '')) for e in events]

