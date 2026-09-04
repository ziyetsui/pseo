# Prompt titles — 35 proposed, for review

The library has no titles: authors published a prompt, not a name, so the card
showed the prompt's first 70 characters — raw JSON for eleven of these records.
Below is one written title per record. Each describes what the prompt produces,
in 30–62 characters, sentence case, leading with the subject rather than the
quality adjectives the prompts open with.

Edit the `proposed` column freely; nothing here is wired up yet.

| # | proposed title | chars | what the card shows today |
| --- | --- | --- | --- |
| 01 | Device spec sheet as a product poster | 37 | `Design, high-quality promotional post showcasing the [DEVICE]` |
| 02 | Isometric diorama of [LOCATION] on a round base | 47 | `Concept: A hyper-realistic 3D isometric view of a [INSERT LOCATI…` |
| 03 | Cheek-to-cheek selfie in an industrial venue | 44 | `{ "scene_type": "indoor close-up lifestyle selfie", "setting": {` |
| 04 | Overhead portrait on the LA Walk of Fame | 40 | `{ "prompt": "Portrait photography from above, Ana de Armas with long b` |
| 05 | Arcade motorcycle portrait, red crop top | 40 | `{ "prompt_structure": { "subject": { "appearance": "Young woman with l` |
| 06 | Spider-Man suit portrait, playful expression | 44 | `{ "prompt_description": "Ultra Photorealistic Candid Portrait of a` |
| 07 | 1970s sedan, four-shot street sequence | 38 | `Shot 1: Side profile medium shot of a Black man with an afro, mu…` |
| 08 | Gym mirror selfie under blue-purple LED | 39 | `{ "image_analysis": { "overall_scene": "Provocative gym mirror selfie ` |
| 09 | Synthwave poster with block HEIS type | 37 | `A stylized, retro-futuristic music poster in a synthwave aesthetic` |
| 10 | Double-exposure profile from a reference photo | 46 | `Use the uploaded picture as a reference (Strict identity lock, the fac` |
| 11 | Forensic-detail beauty portrait, hooded eyes | 44 | `{ "subject": { "identity": { "biometric_reference": "Sydney Sweeney",` |
| 12 | Forensic-detail portrait, heart-shaped face | 43 | `{ "subject": { "identity": { "biometric_reference": "Sabrina Carpenter` |
| 13 | Pink neon apartment portrait, shot on iPhone | 44 | `{ “meta”: { “quality”: “ultra_photorealistic, raw style, 8k”, “camera”` |
| 14 | Latex Aquaman cosplay in emerald and gold | 41 | `{ "subject": { "desc": "Young woman with strong resemblance to a reali` |
| 15 | Bedroom phone recording, late afternoon light | 45 | `A realistic young woman sitting casually in a softly lit bedroom…` |
| 16 | Downhill go-karts that launch off the cliff | 43 | `Subject: Downhill Kart Race Style: Hyper-realistic, Action Adven…` |
| 17 | Candid selfie with iPhone-5 grain | 33 | `Photorealistic 3:4 image` |
| 18 | Venetian bridge portrait, everything in focus | 45 | `{ "prompt_details": { "medium": "RAW photograph", "quality_tags": [` |
| 19 | FIFA 2026 player poster in team colours | 39 | `Design a hyper-realistic FIFA 2026 football poster inspired by premium` |
| 20 | Lakeside blue-hour portrait, palace behind | 42 | `{"image_type":"portrait_travel_photography","prompt":"Ultra-realistic` |
| 21 | Country stamp built as a breaking-out miniature | 47 | `国家主题微缩邮票海报` |
| 22 | Premium product campaign poster, 4:5 | 36 | `Create a photorealistic premium product campaign poster in a 4:5 verti` |
| 23 | Italian villa balcony, pinstripe sundress | 41 | `Photorealistic romantic European travel editorial portrait of a beauti` |
| 24 | ICP pain map into seven ranked ad angles | 40 | `produces an ICP pain map plus 7 ad angles ranked by differentiat…` |
| 25 | Convenience-store student, mint polo | 36 | `Japanese girl with long straight black hair and soft wispy bangs, wear` |
| 26 | One take from deep space to a cafe table | 40 | `Scene: A seamless ultra-cinematic one-take shot starting from de…` |
| 27 | Scroll-scripted site build, shot by shot | 40 | `concept + scroll: "read this brief, script the scroll` |
| 28 | Neon dance-studio music video, 15 seconds | 41 | `A cinematic 15-second music video shot in a dark modern dance st…` |
| 29 | A day in New York, filmed by the subject | 40 | `SCENE A day in New York shot entirely by the subject herself: wa…` |
| 30 | The Office mockumentary, conference room | 40 | `The Office (US) mockumentary style` |
| 31 | Seven-shot handheld observational montage | 41 | `Montage, multi-shot candid observational footage` |
| 32 | Korean bedroom evening vlog, 10 seconds | 39 | `Ultra-realistic cinematic vertical video, 10 seconds` |
| 33 | Handheld DV vlog through a stone-street town | 44 | `CAMERA: Handheld DV 16mm daily vlog footage` |
| 34 | Paper world, 30-second cinematic short | 38 | `30-SECOND CINEMATIC SHORT Create a 30-second cinematic sequence…` |
| 35 | Locked product and identity, outfit swapped | 43 | `Use the uploaded reference image as the exact character and prod…` |

## Judgment calls, so you can overrule them

**Celebrity likeness.** Records 04, 06, 08, 11 and 12 name a real person as the
likeness target (Ana de Armas, Sadie Sink, Natalia Dyer, Sydney Sweeney, Sabrina
Carpenter). The titles describe the shot instead of the name. Naming them would
be accurate to the prompt, but it would also make the library index as a
celebrity-likeness catalogue, which is a product decision rather than a copy one.

**Templates keep their placeholders.** 02 and 22 leave `[LOCATION]` and the
product slot visible, because 'this one is a template' is the most useful thing
the title can say about them.

**No quality words.** Every one of these prompts opens with some stack of
`ultra-realistic / hyper-detailed / 8k`. None of it distinguishes one record from
another, so none of it is in a title.

## Where these go

`PromptSummary.summary` — 34 of 35 records have it as `null` today, and the
frontend already renders it where one exists. Filling it makes the derived rule
in `promptTitle()` a fallback for new records rather than the only source.
