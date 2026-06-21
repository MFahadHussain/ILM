import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// AI-ASSISTED AUTHORING — spec §6.
// Grounded generation: the actual reviewed TextUnit text is injected into the
// prompt. The model is told to base the exercise ONLY on that text and to cite
// it. The result is saved as status=draft (aiAssisted=true) and is NEVER served
// to students until a reviewer publishes it. AI speeds up authoring; it does
// not bypass the review gate.

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { textUnitId, lessonId, type = "mcq" } = body as {
    textUnitId?: string;
    lessonId?: string;
    type?: "mcq" | "fill_blank";
  };
  if (!textUnitId) {
    return NextResponse.json({ error: "textUnitId required" }, { status: 400 });
  }

  const unit = await db.textUnit.findUnique({
    where: { id: textUnitId },
    include: { book: true },
  });
  if (!unit) return NextResponse.json({ error: "unit not found" }, { status: 404 });

  // HARD RULE: never generate from an unreviewed unit.
  if (!unit.isReviewed) {
    return NextResponse.json(
      { error: "Cannot draft from an unreviewed TextUnit. Source must pass review first." },
      { status: 422 }
    );
  }

  const zai = await ZAI.create();
  const sys =
    "You are an authoring assistant for ILM, a Shia Islamic Studies learning platform. " +
    "You draft interactive exercises GROUNDED STRICTLY in a provided primary-source text. " +
    "You must NOT use outside knowledge of Islam. You must NOT invent rulings, gradings, or " +
    "attributions. If the text does not support a question, say so. Always cite the source locator. " +
    "Respond with valid JSON only — no markdown, no commentary.";

  const userMsg =
    `Source TextUnit (the ONLY permissible basis):\n` +
    `---\n` +
    `Locator: ${unit.locator}\n` +
    `Book: ${unit.book.title}\n` +
    `Arabic: ${unit.arabicText}\n` +
    `Translation: ${unit.translationText}\n` +
    `Authenticity grade: ${unit.authenticityGrade}\n` +
    `---\n\n` +
    (type === "fill_blank"
      ? `Draft a single fill-in-the-blank exercise testing comprehension of the ABOVE text. ` +
        `Return JSON: {"prompt": string, "accept": string[], "sourceLocator": string}. ` +
        `"accept" should list 1-4 acceptable answers (English).`
      : `Draft a single multiple-choice exercise (4 options) testing comprehension of the ABOVE text. ` +
        `Exactly one option must be correct and must be directly supported by the text. ` +
        `Return JSON: {"prompt": string, "options": [string,string,string,string], "correctIndex": number, "sourceLocator": string}. ` +
        `"correctIndex" is 0-based.`);

  let parsed: Record<string, unknown> | null = null;
  let raw = "";
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: sys },
        { role: "user", content: userMsg },
      ],
      thinking: { type: "disabled" },
    });
    raw = completion.choices[0]?.message?.content ?? "";
    // extract first {...} block
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : null;
  } catch (e) {
    console.error("AI draft failed:", e);
  }

  if (!parsed) {
    return NextResponse.json(
      { error: "AI generation failed to produce a valid draft. Please author manually.", raw },
      { status: 502 }
    );
  }

  // Build a DRAFT exercise (status=draft, aiAssisted=true). NOT served to students.
  const payload =
    type === "fill_blank"
      ? JSON.stringify({ accept: (parsed.accept as string[]) ?? [] })
      : JSON.stringify({
          options: (parsed.options as string[]) ?? [],
          correctIndex: Number(parsed.correctIndex ?? 0),
        });

  const prompt = String(parsed.prompt ?? "Untitled draft exercise");
  const draft = await db.exercise.create({
    data: {
      lessonId: lessonId ?? (await db.lesson.findFirst({ where: { citedUnits: { some: { textUnitId: unit.id } } } }))?.id ?? (await db.lesson.findFirst())!.id,
      type: type === "fill_blank" ? "fill_blank" : "mcq",
      prompt,
      payload,
      xpReward: 10,
      difficulty: "beginner",
      sourceTextUnitId: unit.id,
      status: "draft", // <-- review gate: not "published"
      aiAssisted: true,
      order: 999,
    },
  });

  return NextResponse.json({
    draft,
    sourceLocator: unit.locator,
    sourceGrade: unit.authenticityGrade,
    note: "Saved as DRAFT. It will NOT be shown to students until a reviewer publishes it.",
  });
}
