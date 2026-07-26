// Text-to-Speech using Lovable AI Gateway (Google TTS) — no API key required.
// Falls back to ElevenLabs only if LOVABLE_API_KEY is missing AND a valid ELEVENLABS_API_KEY is set.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  return btoa(binary);
}

async function ttsViaLovable(text: string): Promise<{ audioContent: string; mimeType: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-tts",
      input: text,
      voice: "Kore", // warm female voice that handles French well
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lovable TTS ${res.status}: ${errText}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await res.json();
    const b64 = json.audio || json.audioContent || json.data;
    if (!b64) throw new Error("No audio in JSON response");
    return { audioContent: b64, mimeType: "audio/mpeg" };
  }
  const buf = await res.arrayBuffer();
  return { audioContent: base64Encode(buf), mimeType: "audio/mpeg" };
}

async function ttsViaElevenLabs(text: string, voiceId: string): Promise<{ audioContent: string; mimeType: string }> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true, speed: 1.0 },
      }),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText}`);
  }
  const buf = await res.arrayBuffer();
  return { audioContent: base64Encode(buf), mimeType: "audio/mpeg" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, voiceId } = await req.json();
    if (!text || typeof text !== "string" || text.length > 4000) {
      return new Response(JSON.stringify({ error: "Invalid 'text' (1-4000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { audioContent: string; mimeType: string } | null = null;
    let lastErr: string | null = null;

    // Primary: Lovable AI Gateway (free, no key needed)
    if (LOVABLE_API_KEY) {
      try {
        result = await ttsViaLovable(text);
      } catch (e) {
        lastErr = (e as Error).message;
        console.error("Lovable TTS failed, will try ElevenLabs:", lastErr);
      }
    }

    // Fallback: ElevenLabs (only if a real key exists)
    if (!result && ELEVENLABS_API_KEY) {
      try {
        result = await ttsViaElevenLabs(text, voiceId || "XB0fDUnXU5powFXDhCwa");
      } catch (e) {
        lastErr = (e as Error).message;
        console.error("ElevenLabs TTS failed:", lastErr);
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: lastErr || "No TTS provider available" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("TTS exception", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
