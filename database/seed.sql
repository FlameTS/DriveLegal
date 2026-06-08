-- Insert States
INSERT INTO states (code, name) VALUES
('IN', 'National Rules (India)'),
('MP', 'Madhya Pradesh'),
('DL', 'Delhi'),
('MH', 'Maharashtra'),
('TN', 'Tamil Nadu'),
('UP', 'Uttar Pradesh'),
('KA', 'Karnataka')
ON CONFLICT (code) DO NOTHING;

-- Insert Common Violations
INSERT INTO violations (code, name, category, fine_first_national, fine_repeat_national) VALUES
('no_helmet', 'Riding motorcycle without protective helmet (Section 129/194D)', 'safety', 1000, 1000),
('no_seatbelt', 'Driving light motor vehicle without wearing seatbelt (Section 194B)', 'safety', 1000, 1000),
('overspeeding', 'Exceeding the permissible speed limit (Section 183)', 'behavior', 1000, 2000),
('drunk_driving', 'Driving under the influence of alcohol or drugs (Section 185)', 'behavior', 10000, 15000),
('using_phone', 'Using mobile phones while driving/riding (Section 184)', 'behavior', 1000, 10000),
('expired_insurance', 'Driving vehicle without active third-party insurance (Section 196)', 'documents', 2000, 4000),
('no_puc', 'Driving without valid Pollution Under Control (PUC) certificate (Section 190(2))', 'documents', 10000, 10000),
('no_license', 'Driving without a valid Driving License (Section 181)', 'documents', 5000, 5000),
('triple_riding', 'Riding two-wheeler with more than one pillion rider (Section 128/194C)', 'safety', 1000, 1000),
('dangerous_driving', 'Driving dangerously / jumping red lights (Section 184)', 'behavior', 1000, 10000)
ON CONFLICT (code) DO NOTHING;

-- Insert State Fine Overrides
INSERT INTO state_fines (state_code, violation_code, fine_first_override, fine_repeat_override) VALUES
-- MP overrides
('MP', 'no_helmet', 250, 500),
('MP', 'triple_riding', 500, 1000),
-- Delhi overrides
('DL', 'no_puc', 10000, 10000), -- Delhi is extremely strict about PUC, matching national
-- Maharashtra overrides
('MH', 'no_seatbelt', 200, 200),
('MH', 'no_helmet', 500, 1500),
-- Karnataka overrides
('KA', 'no_helmet', 1000, 1000),
-- Tamil Nadu overrides
('TN', 'no_helmet', 1000, 1000)
ON CONFLICT (state_code, violation_code) DO NOTHING;

-- Insert National/Core Laws
INSERT INTO laws (id, section, title, description, category, vehicle_type) VALUES
(1, 'Section 129', 'Wearing of protective headgear', 'Every person driving or riding on a motorcycle of any class shall, while in a public place, wear protective headgear conforming to the standards of Bureau of Indian Standards. Exemptions apply for Sikhs wearing turbans.', 'safety', 'motorcycle'),
(2, 'Section 194B', 'Use of safety belts and seating of children', 'Whoever drives a motor vehicle without wearing a safety belt or carries passengers not wearing safety belts shall be punishable with a fine of one thousand rupees.', 'safety', 'car'),
(3, 'Section 185', 'Driving by a drunken person or by a person under the influence of drugs', 'Whoever, while driving, or attempting to drive, a motor vehicle, has in his blood, alcohol exceeding 30 mg. per 100 ml. of blood, shall be punished for the first offence with imprisonment for a term which may extend to six months, or with fine of ten thousand rupees.', 'behavior', 'all'),
(4, 'Section 130', 'Duty to produce licence and certificate of registration', 'The driver of a motor vehicle in any public place shall, on demand by any police officer in uniform, produce his licence, certificate of registration, insurance, and pollution certificate for examination.', 'documents', 'all'),
(5, 'Section 190(2)', 'Violation of standards relating to road safety and pollution', 'Any person who drives or causes to be driven in any public place a motor vehicle which violates the standards prescribed in relation to road safety, control of noise and air pollution (valid PUC certificate missing) shall be punishable for the first offence with imprisonment for a term which may extend to three months, or with fine which may extend to ten thousand rupees.', 'documents', 'all')
ON CONFLICT (id) DO NOTHING;

-- Insert State Overrides (Specific Exceptions, Local Amendments)
INSERT INTO state_overrides (state_code, law_id, override_type, description) VALUES
-- MP: Pillion rider women exemption
('MP', 1, 'modify', 'In Madhya Pradesh, wearing a helmet is mandatory for the rider. Pillion riders who are women are exempted from the helmet mandate, though it is highly recommended for safety. Sikhs wearing turbans are also exempted.'),
-- Delhi: Odd-Even Scheme
('DL', 5, 'add', 'Delhi NCT enforces the Odd-Even Scheme periodically to control severe air pollution. Vehicles with registration numbers ending in odd digits are allowed only on odd dates, and even digits on even dates. Violators are fined ₹4,000 under Section 115/194 of the MV Act.'),
-- Maharashtra: Banning 2-wheelers on key express routes
('MH', 1, 'add', 'In Maharashtra, two-wheelers, three-wheelers, and animal-drawn vehicles are strictly banned from entering the Atal Setu (MTHL), Bandra-Worli Sea Link, and the Eastern Freeway in Mumbai. Fines for violations start at ₹1,000.'),
-- Karnataka: Out of state vehicle Lifetime Tax
('KA', 4, 'add', 'In Karnataka, under the Karnataka Motor Vehicles Taxation (Amendment) Act, any vehicle registered in another state that runs in Karnataka for more than 30 days must pay lifetime tax. Failure to pay attracts heavy penalties and vehicle seizure.')
ON CONFLICT DO NOTHING;

-- Insert Travel Rules per State
INSERT INTO travel_checklists (state_code, vehicle_type, documents_required, speed_limit, special_rules) VALUES
('MP', 'car', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 100, ARRAY['Ensure no dark sunfilms on windows (visual transmission must be >70% for front/rear and >50% for sides).', 'Keep physical documents or digilocker versions handy.']),
('MP', 'motorcycle', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 80, ARRAY['Helmet is mandatory for rider. Pillion rider exemption for women.']),
('DL', 'car', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 70, ARRAY['Delhi has extremely strict speed limits monitored by speed cams.', 'Odd-Even restriction may apply depending on pollution alerts.', 'Commercial diesel vehicles are restricted from entering the city during daytime hours.']),
('DL', 'motorcycle', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 50, ARRAY['Helmet mandatory for both rider and pillion rider. Sikhs with turbans exempted.']),
('MH', 'car', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 100, ARRAY['Speed limit on Mumbai-Pune Expressway is 100 km/h.', 'Seat belts mandatory for all passengers (front and rear).', 'Toll charges apply at state entry/exit points and major express bridges.']),
('MH', 'motorcycle', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 80, ARRAY['Two-wheelers banned from Mumbai Trans Harbour Link (Atal Setu), Eastern Freeway, and Bandra-Worli Sea Link.', 'Double helmets (rider + pillion) mandatory in Mumbai/Pune urban areas.']),
('TN', 'car', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 80, ARRAY['Strict checking of original Driving License or DigiLocker copy.', 'Speed limit in municipal limits is 60 km/h, highways 80-100 km/h.']),
('TN', 'motorcycle', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 60, ARRAY['Double helmets (rider + pillion) mandatory. Failure leads to license suspension.']),
('UP', 'car', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 100, ARRAY['High security registration plates (HSRP) mandatory.', 'Speed limit on Yamuna Expressway is 100 km/h.']),
('UP', 'motorcycle', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 80, ARRAY['Helmets mandatory for riders.']),
('KA', 'car', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 100, ARRAY['Out-of-state cars running for more than 30 days must pay lifetime tax.', 'Seat belts mandatory for front occupants.']),
('KA', 'motorcycle', ARRAY['Driving License', 'Registration Certificate (RC)', 'PUC Certificate', 'Insurance Policy'], 80, ARRAY['Double helmets mandatory. Pillion rider helmet must conform to ISI standards.', 'Out-of-state motorcycles running for more than 30 days must pay lifetime tax.'])
ON CONFLICT (state_code, vehicle_type) DO NOTHING;
