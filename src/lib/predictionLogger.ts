import { supabase } from "@/integrations/supabase/client";
import type { PredictionResult } from "./predictions";

/**
 * Persist a generated prediction (input + results) to the prediction_logs table
 * for internal audit. Failures are silent so they never block the UI.
 */
export async function logPrediction(params: {
  mode: string;
  inputParams: Record<string, unknown>;
  results: PredictionResult[];
  customPredictionId?: string | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const reliabilityAvg =
      params.results.length > 0
        ? params.results.reduce((sum, r) => sum + (r.reliability ?? 0), 0) / params.results.length
        : null;

    await supabase.from("prediction_logs").insert([{
      user_id: user.id,
      mode: params.mode,
      custom_prediction_id: params.customPredictionId ?? null,
      input_params: params.inputParams as never,
      results: params.results as never,
      reliability_avg: reliabilityAvg ?? undefined,
    }]);
  } catch (e) {
    // Silent: audit log must never break UX.
    console.warn("[predictionLogger] failed:", e);
  }
}
