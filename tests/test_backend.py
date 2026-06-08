import unittest
import json
import os
import sys

# Add root folder to path so we can import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db import init_db, execute_query
from backend.routes.states import get_state_rules, StateRulesRequest
from backend.routes.challan import calculate_challan, ChallanRequest, ChallanItemRequest
from backend.routes.travel import check_travel_route, TravelRequest

class TestDriveLegalBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Force SQLite for local testing
        os.environ["DATABASE_URL"] = ""
        init_db()

    def test_database_seeded(self):
        # Check states
        states, _ = execute_query("SELECT * FROM states")
        self.assertGreater(len(states), 5)
        codes = [s["code"] for s in states]
        self.assertIn("MP", codes)
        self.assertIn("DL", codes)
        self.assertIn("MH", codes)

        # Check laws
        laws, _ = execute_query("SELECT * FROM laws")
        self.assertGreater(len(laws), 3)

    def test_state_rules_merge(self):
        # MP Motorcycle Rules should include the modified helmet rule
        req = StateRulesRequest(state_code="MP", vehicle_type="motorcycle")
        import asyncio
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(get_state_rules(req))
        
        rules = res.rules
        self.assertGreater(len(rules), 0)
        
        # Verify that MP has a modified helmet rule
        helmet_rule = next((r for r in rules if r.section == "Section 129"), None)
        self.assertIsNotNone(helmet_rule)
        self.assertEqual(helmet_rule.rule_type, "modify")
        self.assertIn("Pillion riders who are women are exempted", helmet_rule.description)

    def test_challan_calculator(self):
        # MP no_helmet (overridden to ₹250) + no_seatbelt (national ₹1000)
        req = ChallanRequest(
            state_code="MP",
            violations=[
                ChallanItemRequest(code="no_helmet", is_repeat=False),
                ChallanItemRequest(code="no_seatbelt", is_repeat=False)
            ]
        )
        import asyncio
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(calculate_challan(req))
        
        self.assertEqual(res.total_fine, 1250) # 250 (override) + 1000 (national)
        
        # Test repeat offence fallback logic:
        # We delete and insert an override with NULL repeat fine to test fallback
        execute_query("DELETE FROM state_fines WHERE state_code='KA' AND violation_code='no_seatbelt'")
        execute_query("INSERT INTO state_fines (state_code, violation_code, fine_first_override, fine_repeat_override) VALUES ('KA', 'no_seatbelt', 500, NULL)")
        
        req_repeat = ChallanRequest(
            state_code="KA",
            violations=[
                ChallanItemRequest(code="no_seatbelt", is_repeat=True)
            ]
        )
        res_repeat = loop.run_until_complete(calculate_challan(req_repeat))
        self.assertEqual(res_repeat.total_fine, 1000) # Falls back to national repeat of 1000


    def test_travel_checker(self):
        # Travel from Bhopal (MP) to Chennai (TN) on motorcycle
        req = TravelRequest(
            from_city="Bhopal",
            to_city="Chennai",
            vehicle_type="motorcycle"
        )
        import asyncio
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(check_travel_route(req))
        
        self.assertIn("MP", res.states_crossed)
        self.assertIn("MH", res.states_crossed)
        self.assertIn("KA", res.states_crossed)
        self.assertIn("TN", res.states_crossed)
        
        # Should flag helmet and speed conflicts
        conflict_types = [c.type for c in res.conflicts]
        self.assertIn("speed", conflict_types)
        self.assertIn("helmet", conflict_types)

if __name__ == "__main__":
    unittest.main()
