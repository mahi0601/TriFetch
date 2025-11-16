import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Plot from 'react-plotly.js'
import { ECGData } from '../types'
import './ECGPlot.css'

interface ECGPlotProps {
  ecgData: ECGData
  eventSampleIndex: number
  eventType: string
}

export default function ECGPlot({ ecgData, eventSampleIndex, eventType }: ECGPlotProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [plotError, setPlotError] = useState<string | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)

  const { ch1, ch2, sampling_rate } = ecgData.ecg_data || { ch1: [], ch2: [], sampling_rate: 200 }
  
  const numSamples = Math.min(ch1?.length || 0, ch2?.length || 0)
  const timeAxis = useMemo(() => {
    if (numSamples === 0) return []
    return Array.from({ length: numSamples }, (_, i) => i / sampling_rate)
  }, [numSamples, sampling_rate])

  const eventIndex = useMemo(() => {
    if (!eventSampleIndex || eventSampleIndex < 0) {
      return Math.floor(numSamples / 2)
    }
    return Math.min(eventSampleIndex, numSamples - 1)
  }, [eventSampleIndex, numSamples])

  const eventTime = useMemo(() => {
    return eventIndex / sampling_rate
  }, [eventIndex, sampling_rate])

  const minY = useMemo(() => {
    if (numSamples === 0) return 0
    const allValues = [...(ch1 || []), ...(ch2 || [])]
    return Math.min(...allValues) * 0.95
  }, [ch1, ch2, numSamples])

  const maxY = useMemo(() => {
    if (numSamples === 0) return 1000
    const allValues = [...(ch1 || []), ...(ch2 || [])]
    return Math.max(...allValues) * 1.05
  }, [ch1, ch2, numSamples])

  useEffect(() => {
    if (numSamples === 0) {
      setPlotError('No ECG data available')
      return
    }

    if (!ch1 || !ch2 || ch1.length === 0 || ch2.length === 0) {
      setPlotError('Invalid ECG data format')
      return
    }

    setPlotError(null)
  }, [ch1, ch2, numSamples])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!plotRef.current) return
    
    const plotElement = plotRef.current.querySelector('.js-plotly-plot')
    if (!plotElement) return

    const rect = (plotElement as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    
    if (x < 0 || x > rect.width) {
      setHoveredIndex(null)
      return
    }
    
    const relativeX = Math.max(0, Math.min(1, x / rect.width))
    const sampleIndex = Math.floor(relativeX * numSamples)
    setHoveredIndex(Math.max(0, Math.min(sampleIndex, numSamples - 1)))
  }, [numSamples])

  useEffect(() => {
    const plotElement = plotRef.current?.querySelector('.js-plotly-plot')
    if (plotElement) {
      plotElement.addEventListener('mousemove', handleMouseMove)
      plotElement.addEventListener('mouseleave', () => setHoveredIndex(null))
      return () => {
        plotElement.removeEventListener('mousemove', handleMouseMove)
        plotElement.removeEventListener('mouseleave', () => setHoveredIndex(null))
      }
    }
  }, [handleMouseMove])

  const traces = useMemo(() => {
    if (numSamples === 0 || plotError) return []

    const baseTraces = [
      {
        x: timeAxis,
        y: ch1,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Channel 1',
        line: { 
          color: '#3b82f6', 
          width: 1.5,
          shape: 'linear' as const
        },
        hovertemplate: 'Time: %{x:.3f}s<br>Amplitude: %{y:.1f}<extra></extra>',
      },
      {
        x: timeAxis,
        y: ch2,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Channel 2',
        line: { 
          color: '#10b981', 
          width: 1.5,
          shape: 'linear' as const
        },
        hovertemplate: 'Time: %{x:.3f}s<br>Amplitude: %{y:.1f}<extra></extra>',
      },
    ]

    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < numSamples) {
      const hoverTime = hoveredIndex / sampling_rate
      baseTraces.push({
        x: [hoverTime, hoverTime],
        y: [minY, maxY],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Hover',
        line: { 
          color: '#6366f1', 
          width: 2, 
          dash: 'dash' as const 
        },
        showlegend: false,
        hovertemplate: `Time: ${hoverTime.toFixed(3)}s<extra></extra>`,
      })
    }

    if (eventIndex >= 0 && eventIndex < numSamples) {
      baseTraces.push({
        x: [eventTime, eventTime],
        y: [minY, maxY],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Event: ${eventType}`,
        line: { 
          color: '#ef4444', 
          width: 3 
        },
        hovertemplate: `Event: ${eventType}<br>Time: ${eventTime.toFixed(3)}s<extra></extra>`,
      })
    }

    return baseTraces
  }, [timeAxis, ch1, ch2, hoveredIndex, eventIndex, eventTime, eventType, minY, maxY, numSamples, sampling_rate])

  const layout = useMemo(() => ({
    title: {
      text: `ECG Data - ${eventType} Event`,
      font: { size: 20, family: 'Inter, sans-serif', color: '#1e293b' },
      x: 0.5,
      xanchor: 'center' as const,
    },
    xaxis: {
      title: {
        text: 'Time (seconds)',
        font: { size: 14, color: '#64748b' }
      },
      showgrid: true,
      gridcolor: '#e2e8f0',
      gridwidth: 1,
      zeroline: false,
      showline: true,
      linecolor: '#cbd5e1',
    },
    yaxis: {
      title: {
        text: 'Amplitude',
        font: { size: 14, color: '#64748b' }
      },
      showgrid: true,
      gridcolor: '#e2e8f0',
      gridwidth: 1,
      zeroline: false,
      showline: true,
      linecolor: '#cbd5e1',
    },
    hovermode: 'x unified' as const,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(255, 255, 255, 0.9)',
      bordercolor: '#e2e8f0',
      borderwidth: 1,
      font: { size: 12 },
    },
    margin: { l: 70, r: 30, t: 80, b: 60 },
    height: 650,
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    font: {
      family: 'Inter, -apple-system, sans-serif',
      color: '#1e293b'
    },
  }), [eventType])

  const config = useMemo(() => ({
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: `ecg-${eventType}-${Date.now()}`,
      height: 600,
      width: 1200,
      scale: 2
    }
  }), [eventType])

  if (plotError) {
    return (
      <div className="ecg-plot-container">
        <div className="plot-error">
          <div className="error-title">Error Loading Plot</div>
          <div className="error-message">{plotError}</div>
        </div>
      </div>
    )
  }

  if (numSamples === 0) {
    return (
      <div className="ecg-plot-container">
        <div className="plot-loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Preparing ECG data...</p>
        </div>
      </div>
    )
  }

  const duration = numSamples / sampling_rate

  return (
    <div className="ecg-plot-container" ref={plotRef}>
      <div className="ecg-plot-info">
        <div className="info-item">
          <span className="info-label">Event Type</span>
          <span className="info-value event-type">{eventType || 'N/A'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Event Time</span>
          <span className="info-value">{eventTime.toFixed(3)}s</span>
        </div>
        <div className="info-item">
          <span className="info-label">Duration</span>
          <span className="info-value">{duration.toFixed(1)}s</span>
        </div>
        <div className="info-item">
          <span className="info-label">Sampling Rate</span>
          <span className="info-value">{sampling_rate} Hz</span>
        </div>
        <div className="info-item">
          <span className="info-label">Samples</span>
          <span className="info-value">{numSamples.toLocaleString()}</span>
        </div>
      </div>
      <div className="plot-wrapper">
        <Plot
          data={traces}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '650px' }}
          useResizeHandler={true}
        />
      </div>
    </div>
  )
}
