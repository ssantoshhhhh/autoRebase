import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Leaflet vanilla imports
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function StationManagement() {
  const { policeUser } = useAuth();
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    stationName: '',
    district: '',
    state: '',
    latitude: 12.9716,
    longitude: 77.5946,
    radiusKm: 5,
    contactNumber: '',
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (policeUser?.role !== 'GLOBAL_ADMIN') {
      navigate('/police/dashboard');
      return;
    }
    fetchStations();
  }, [policeUser, navigate]);

  const fetchStations = async () => {
    try {
      const res = await api.get('/api/stations');
      setStations(res.data.stations);
    } catch (err) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  // Manual Leaflet Initialization
  useEffect(() => {
    if (showAddForm && mapContainerRef.current && !mapInstanceRef.current) {
      // Fix Leaflet icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current).setView([form.latitude, form.longitude], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const marker = L.marker([form.latitude, form.longitude], {
        draggable: false,
      }).addTo(map);
      const circle = L.circle([form.latitude, form.longitude], {
        radius: form.radiusKm * 1000,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    }

    return () => {
      if (!showAddForm && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showAddForm]);

  // Sync Map Visuals with Form State
  useEffect(() => {
    if (mapInstanceRef.current) {
      const pos = [form.latitude, form.longitude];
      markerRef.current.setLatLng(pos);
      circleRef.current.setLatLng(pos);
      circleRef.current.setRadius(form.radiusKm * 1000);
    }
  }, [form.latitude, form.longitude, form.radiusKm]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        setForm((prev) => ({
          ...prev,
          district:
            addr.city_district || addr.suburb || addr.district || addr.city || prev.district,
          state: addr.state || prev.state,
        }));
      }
    } catch (err) {}
  };

  const handleAddStation = async () => {
    if (!form.stationName || !form.district || !form.state) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/stations', form);
      toast.success('Station created!');
      setShowAddForm(false);
      fetchStations();
    } catch (err) {
      toast.error('Failed to create station');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080c14',
        padding: '24px',
        color: '#f1f5f9',
      }}
    >
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Police Station Management</h1>
            <p style={{ color: '#94a3b8' }}>Define geofences and coverage areas</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ Cancel' : '+ Create New Station'}
          </button>
        </div>

        {showAddForm && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '24px',
              marginBottom: '40px',
              animation: 'fadeIn 0.4s ease',
            }}
          >
            {/* Manual Map Container */}
            <div
              className="card"
              style={{
                padding: 0,
                height: '500px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                ref={mapContainerRef}
                style={{ height: '100%', width: '100%', background: '#0d1420' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1000,
                  background: 'rgba(13,20,32,0.85)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  pointerEvents: 'none',
                }}
              >
                🖱️ Click map to set center location
              </div>
            </div>

            {/* Registration Form */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  paddingBottom: '12px',
                }}
              >
                Register Station
              </h3>

              <div className="form-group">
                <label className="label">Station Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Koramangala Station"
                  value={form.stationName}
                  onChange={(e) => setForm({ ...form, stationName: e.target.value })}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div className="form-group">
                  <label className="label">District *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">State *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                }}
              >
                <div className="form-group">
                  <label className="label">Lat</label>
                  <input
                    type="text"
                    className="input"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    value={form.latitude.toFixed(4)}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label className="label">Lng</label>
                  <input
                    type="text"
                    className="input"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    value={form.longitude.toFixed(4)}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label className="label">Radius (km)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.radiusKm}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        radiusKm: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Contact Number</label>
                <input
                  type="text"
                  className="input"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                />
              </div>

              <button
                className="btn btn-primary w-full"
                style={{ padding: '14px' }}
                onClick={handleAddStation}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Register Station →'}
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {stations.map((station) => (
            <div key={station.id} className="card" style={{ transition: 'all 0.2s' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{station.stationName}</h4>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {station.district}, {station.state}
                  </div>
                </div>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: station.status ? '#10b981' : '#475569',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                    }}
                  >
                    Geofence
                  </div>
                  <div style={{ color: '#60a5fa', fontWeight: 600 }}>{station.radiusKm} km</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                    }}
                  >
                    Location
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    {station.latitude.toFixed(3)}, {station.longitude.toFixed(3)}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-outline btn-sm w-full"
                onClick={() => navigate(`/police/officers?stationId=${station.id}`)}
              >
                Manage Station Officers
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
