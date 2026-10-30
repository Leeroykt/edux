import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../../../server/auth/authMiddleware";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const voiceProfile = {
    id: `vp_${auth.user.id}`,
    ownerId: auth.user.id,
    label: "Academic Research (Oxford)",
    sampleCount: 3,
    strengthScore: 84,
    guideSummary:
      "Prefers active verbs, empirical qualifiers, moderate sentence length (18-24 words), and disciplined transition markers.",
    frequentPatterns: [
      "High variance in sentence cadence (avoids monotonous clause chains)",
      "Prefers 'We observe that...' over 'It is demonstrated that...'",
      "British English spelling conventions ('characterised', 'modelling')",
    ],
  };

  return NextResponse.json(voiceProfile);
}
