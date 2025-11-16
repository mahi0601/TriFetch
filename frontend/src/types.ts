export interface Event {
  event_id: string
  event_type: string
  is_approved: boolean
  patient_id: string
}

export interface EventMetadata {
  patient_id: string
  event_type: string
  event_time: string
  is_approved: boolean
}

export interface ECGData {
  metadata: EventMetadata
  ecg_data: {
    ch1: number[]
    ch2: number[]
    sampling_rate: number
  }
  event_sample_index: number
  event_time_offset: number
}

