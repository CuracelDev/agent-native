import { defineAction } from "@agent-native/core";
import { z } from "zod";

import { getRiskMeetingData } from "../server/lib/risk-meeting";

export default defineAction({
  readOnly: true,
  description:
    "Load HubSpot at-risk renewal deals and Pylon early-warning accounts for the weekly risk meeting review.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => getRiskMeetingData(),
});
