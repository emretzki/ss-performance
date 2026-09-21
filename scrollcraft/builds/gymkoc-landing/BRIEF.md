# gymkoc — platform landing page — BRIEF

Interviewed via the main conversation (user gave a full written brief unprompted,
plus two follow-up clarifying answers). Not self-authored.

## Interview answers

1. **Vibe / references.** User's words: "enerjik, güvenilir, premium ama
   soğuk/kurumsal değil — butik bir stüdyo gibi." Explicit anti-references: no
   purple/blue gradients or blurred blobs, no centered/symmetric hero, no
   Inter/system-ui, no glassmorphism/neumorphism, no uniform corner-radius/shadow
   everywhere, no generic 3D-render or stock illustration. No named film/album/
   shop/magazine reference given — the "editorial spor dergisi" (sports
   magazine) direction stands in for one.
2. **Journey, in their words.** "antrenman sahnesi → ekipman detayı →
   PT/danışman görseli → CTA."
3. **Energy curve.** Not stated explicitly; inferred from "enerjik ama
   sofistike, soğuk değil" — opens confident and quiet (masthead), rises into
   intensity (training), holds for a surprise (equipment → live product), warms
   into trust (the trainer), resolves calm (CTA).
4. **Feeling stage-by-stage + the one moment.** Not stated by the user directly;
   designed by me from the above (see Feeling curve below), flagged here for
   correction.
5. **The one thing no other site does.** User's own proposal, which I am using:
   the equipment-detail section's photographed object hard-cuts into the app's
   real calendar-cell UI (the actual product, not a mockup) at the same screen
   position — marketing becomes product mid-scroll.
6. **Aesthetic range.** User said "editoryal spor dergisi hissi" explicitly →
   **Editorial** family (paper/print logic, folios, measure, restraint) from
   uniqueness.md §5, adapted to the brand's dark-navy ground rather than paper.
7. **One world or distinct scenes.** User's journey list reads as distinct
   scenes ("antrenman sahnesi", "ekipman detayı", "PT görseli" are separate
   places/subjects, not one continuous space) → **distinct chapters**, not
   worldflight.
8. **Assets.** None of the user's own; confirmed fully generated via kie.ai
   (budget: 80 credits, stills only — no video clips this pass).

Additional clarifications gathered outside the 8-question format:
- This is gymkoc's own platform marketing page (root gymkoc.com), not a
  tenant gym's page.
- Brand asset: `design/gymkoc_logo.png` — deep navy `#101830` ground, neon-lime
  accent `#B8F028` (sampled directly from the file), a soft slate `#384858` for
  secondary shadow/depth. This becomes the palette; no invented accent.

## Grammar

**Chaptered editorial** (uniqueness.md §2.2). It is the only grammar the brief
asks for by name ("editoryal spor dergisi hissi... fotoğraf ağırlıklı... cesur
kontrast") and it is what makes the anti-cliché list easy to satisfy for free:
no fixed nav bar, no centered symmetric hero, no crossfade drift, hard cuts
between grounds, media in its own column with a caption rather than bled under
type. First build in this workspace, so no grammar precedent to react against.

## Feeling curve

```
1  Confidence     title page, masthead only, no media, quiet and certain
2  Intensity      Chapter I — training, full-bleed photograph, hard cut in
3  Recognition    Chapter II — equipment macro, quiet material detail, THEN
                  the hard-cut reveal into the real product calendar UI (peak)
4  Trust          Chapter III — the trainer, portrait, intimate, after-the-surprise calm
5  Resolve         Close — colophon, running-text CTA, quiet
```

Two adjacent acts never share a feeling. The peak (act 3) is the only one that
changes register mid-act (quiet detail → surprise), which is why it gets the
longest span and the silence-before treatment.

## The peak

> "You're looking at a photo of a kettlebell, then it just... becomes the app.
> The actual booking screen, right there."

Lives in Chapter II (Ekipman). Gets the largest `data-sc-span`, the asset
budget priority, and a beat of stillness immediately before the cut.

## Tell-someone sentence

**"It's the site where a photo of the equipment turns into the real booking
calendar while you're scrolling."**

## Authored silence

A half-viewport-height quiet beat at the start of Chapter II, before the
reveal cuts — the macro shot holds still with only a caption, no motion, so the
cut has something to be a cut from. Not dead scroll: intentional held frame.

## Signature move

**Object-to-interface hard cut.** The equipment photograph (kettlebell, shot
square-on, centered in its column) is pinned in place; at a specific `--sc-p`
threshold the photograph is replaced — same position, same bounding box, one
frame — by a live, real (not screenshotted) instance of the app's actual
calendar slot component (avatar chips, capacity state, the exact CSS the
product uses), then the cut reverses on scroll-back. Coded once, only in this
build, driven by `--sc-p` and a `data-sc-object-swap` attribute of my own
naming.

## Fingerprint gate

`FINGERPRINTS.md` in this workspace is freshly seeded and empty (first build).
Gate trivially passes; nothing to differ against yet. This build's own row will
be appended after shipping.
