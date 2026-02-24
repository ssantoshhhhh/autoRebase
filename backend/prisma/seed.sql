-- Enable Row-Level Security for complaints table
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Default policy: deny everything (except superuser)
CREATE POLICY complaints_isolation ON complaints
  USING (
    station_id = current_setting('app.current_station_id', true)::UUID
    OR current_setting('app.user_role', true) = 'SUPER_ADMIN'
  );

-- Create read-only role for officers
CREATE ROLE officer_role;
GRANT SELECT, UPDATE ON complaints TO officer_role;

-- Indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complaints_station_id ON complaints(station_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complaints_priority ON complaints(priority_level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complaints_emergency ON complaints(is_emergency) WHERE is_emergency = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_otp_mobile ON otp_verifications(mobile);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Seed initial police station for development
INSERT INTO police_stations (id, station_name, district, state, latitude, longitude, radius_km, contact_number, status)
VALUES 
  (gen_random_uuid(), 'Bengaluru Central', 'Bengaluru Urban', 'Karnataka', 12.9716, 77.5946, 8, '080-22943222', true),
  (gen_random_uuid(), 'Chennai Commissioner', 'Chennai', 'Tamil Nadu', 13.0827, 80.2707, 10, '044-23452345', true),
  (gen_random_uuid(), 'Delhi Police HQ', 'New Delhi', 'Delhi', 28.6139, 77.2090, 12, '011-23490000', true),
  (gen_random_uuid(), 'Mumbai Commissioner', 'Mumbai', 'Maharashtra', 19.0760, 72.8777, 10, '022-22620111', true)
ON CONFLICT DO NOTHING;
