# All 34 active visual-fixture prompts: taxonomy audit

Read-only source audit on 2026-09-04. Scope: `frontend/src/data/prototype.json` full prompt text, stored source metadata in `frontend/src/data/wireframe/prompts.ts`, and existing taxonomy registry. No thumbnail-only classification, live-X claim, CMS mutation, production update, or content-rights approval.

Input prototype SHA-256: `68aeb1d6a65d26e14242cd56d78df11d20daceb690f99b698cf4c83b6c4725dc`. All 34 full texts agree with stored wireframe text after whitespace normalization; every kind and model relation agrees with its stored source row. Agreement validates local mapping, **not** independent authorship/model truth. `2066531004924436614` is excluded from active audit.

Model policy: preserve stored model relations. Multiple image/video tool labels can describe a pipeline, not necessarily the renderer of every artifact. Particularly #13 has image media with GPT Image/Seedance labels; cannot resolve from prompt alone. Empty models stay empty. #18 stays unknown type because source has no media.

Proposals: 40 high-confidence field corrections/enrichments and 9 review-only field proposals. A record may have multiple fields. Missing labels are distinguished from contradicted labels. The JSON uses existing registry labels only.

Technique audit: Camera movement / shot language legitimately covers lens, angle and framing on still images; do not strip it merely because kind=image. Transition / morph / match cut is a grouped label, so continuous perspective transitions (#3/#17), explicit paper-film transitions (#8) and macro-shot transition (#20) qualify. Static double exposure (#25) should not acquire a temporal-morph tag. No current technique tag was established as a false positive.

## Record-by-record audit

### 01. Scroll-scripted site build, shot by shot — `2073529429838696592`

**Verdict:** Supported; model attribution limited.

- Type: `video`. Stored evidence: 媒体标签 "视频 14s".
- Models: none; matches stored model relation.
- Uses: Web & motion design.
- Styles: Cinematic.
- Techniques: none.
- Subjects: none.
- Stored source: [@zeuuss_01](https://x.com/zeuuss_01/status/2073529429838696592).

Web scaffold, GSAP/Lenis and generated motion clips directly support Web & motion design. Film grain/vignette/b-roll supports cinematic treatment. Mixed workflow contains marketing prose; display-quality owner must judge demonstration media. Model remains empty: Higgsfield platform mention is not proof of Higgsfield Soul.

### 02. Gym mirror selfie under blue-purple LED — `2019849202591789460`

**Verdict:** Incorrect + incomplete.

- Type: `image`. Stored evidence: 媒体标签 "图片 ×2".
- Models: Nano Banana, Nano Banana Pro; matches stored model relation.
- Uses: none.
- Styles: Anime / illustrated, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: none.
- Stored source: [@KeorUnreal](https://x.com/KeorUnreal/status/2019849202591789460).

Anime tag negates the explicit negative prompt. Human subject omission is clear. Camera shot-language tag is valid for a still selfie angle/lens: it does not claim video motion.

- **high / styles**: remove Anime / illustrated; add nothing. Evidence: Positive style is photorealistic; cartoon, illustration, painting occur only inside negative_prompt.
- **high / subjects**: remove nothing; add Person / portrait. Evidence: Two young women are the stated subjects of the gym selfie.

### 03. One take from deep space to a cafe table — `2071174186978951379`

**Verdict:** Supported + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 15s".
- Models: Seedance; matches stored model relation.
- Uses: Food & beverage.
- Styles: Cinematic, Photorealistic.
- Techniques: Camera movement / shot language, Transition / morph / match cut.
- Subjects: none.
- Stored source: [@Naiknelofar788](https://x.com/Naiknelofar788/status/2071174186978951379).

KEEP Food & beverage. Earth is the opening of a 15-second journey to a woman eating hamburger with drink at named cafe. Continuous camera/scale transition are explicit. Add final human and food subjects; do not relabel from thumbnail.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Final subject/character is a young woman in the cafe.
- **high / subjects**: remove nothing; add Food / drink. Evidence: The final cafe shot explicitly centers on eating a hamburger with a drink; this also supports retaining Food & beverage despite Earth thumbnail.

### 04. Overhead portrait on the LA Walk of Fame — `2015726421990056336`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "图片 ×3".
- Models: Nano Banana, Nano Banana Pro; matches stored model relation.
- Uses: Beauty.
- Styles: Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Person / portrait.
- Stored source: [@KeorUnreal](https://x.com/KeorUnreal/status/2015726421990056336).

Portrait, beauty detail, photorealistic camera and overhead shot language all supported. Raw prompt has internal appearance contradictions, but that is source-text quality, not a reason to invent replacement classification.

### 05. Neon dance-studio music video, 15 seconds — `2078814921756754352`

**Verdict:** Supported + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 15s".
- Models: Seedance; matches stored model relation.
- Uses: Fashion.
- Styles: Cinematic.
- Techniques: Camera movement / shot language, Lip sync / dialogue.
- Subjects: none.
- Stored source: [@Kiber_Alla](https://x.com/Kiber_Alla/status/2078814921756754352).

Cinematic dance/music video, lip-sync and moving camera are explicit. High fashion dance energy supports Fashion. Add human subject; a separate music-video use does not exist in registry.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Music video names a woman main subject throughout.

### 06. A day in New York, filmed by the subject — `2083168602363150527`

**Verdict:** Incomplete; use ambiguous.

- Type: `video`. Stored evidence: 媒体标签 "视频 29s".
- Models: Higgsfield Soul, Seedance; matches stored model relation.
- Uses: Food & beverage.
- Styles: Photorealistic.
- Techniques: Camera movement / shot language, Lip sync / dialogue, Multi-shot / storyboard.
- Subjects: none.
- Stored source: [@higgsfield_ai](https://x.com/higgsfield_ai/status/2083168602363150527).

Realistic eight-shot talking selfie vlog validates all current techniques. Add character consistency and human subject. Food exists in two scenes, but primary task is personal travel vlog; Food & beverage is review-only, not a categorical content mismatch.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Eight shots follow the same woman filming herself.
- **high / techs**: remove nothing; add Character consistency. Evidence: Subject must 100% match reference, hair/necklace/ring identical throughout; continuity explicitly required.
- **medium / uses**: remove Food & beverage; add UGC. Evidence: Overall task is personal day-in-New-York vlog. Coffee and diner are two of eight shots, so food relevance is real but not the primary use; requires category scope decision.

### 07. Forensic-detail beauty portrait, hooded eyes — `2029632175482507599`

**Verdict:** Supported + incomplete.

- Type: `image`. Stored evidence: 媒体标签 "图片 ×2".
- Models: Nano Banana, Nano Banana Pro; matches stored model relation.
- Uses: Beauty.
- Styles: Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: none.
- Stored source: [@PinodiArt](https://x.com/PinodiArt/status/2029632175482507599).

Beauty/photorealistic/human forensic portrait and low-angle 50mm shot all explicit. Add Person / portrait.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Portrait explicitly specifies biometric identity and human facial/body features.

### 08. Paper world, 30-second cinematic short — `2088866007918268515`

**Verdict:** Supported + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 30s".
- Models: GPT Image, Seedance; matches stored model relation.
- Uses: none.
- Styles: Cinematic, Photorealistic.
- Techniques: Camera movement / shot language, Transition / morph / match cut.
- Subjects: none.
- Stored source: [@ChillaiKalan__](https://x.com/ChillaiKalan__/status/2088866007918268515).

Paper city is photographed as realistic physical paper; Photorealistic is valid despite imaginary setting. Explicit six-shot miniature film warrants storyboard, miniature technique and architecture subject.

- **high / subjects**: remove nothing; add Architecture / interior. Evidence: The central generated object is a handcrafted paper city: streets, buildings, bridges and skyline.
- **high / techs**: remove nothing; add Multi-shot / storyboard, 微缩摄影. Evidence: Six timed shots with distinct lenses/positions; director explicitly calls it realistic miniature photography.

### 09. Isometric diorama of [LOCATION] on a round base — `2008952931484098637`

**Verdict:** Ambiguous generalization.

- Type: `image`. Stored evidence: 媒体标签 "图片".
- Models: Nano Banana, Nano Banana Pro; matches stored model relation.
- Uses: Food & beverage.
- Styles: Photorealistic, Retro / vintage.
- Techniques: Camera movement / shot language.
- Subjects: Food / drink, Person / portrait.
- Stored source: [@Arminn_Ai](https://x.com/Arminn_Ai/status/2008952931484098637).

Food/wine and vintage Vespa appear only as example values inside a parameterized diorama. Existing Person and photographic/isometric style are supported. Do not automatically infer all instantiations must be Food or Vintage. Miniature technique would be plausible but text explicitly rejects toy/model skin; keep review-only rather than guess.

- **medium / uses**: remove Food & beverage; add nothing. Evidence: Pizza/wine are placeholder examples in a generic location diorama; taxonomy may describe the illustrated example rather than the reusable template.
- **medium / styles**: remove Retro / vintage; add nothing. Evidence: Vintage qualifies optional Vespa prop rather than the whole generic diorama; exact filled output could still be vintage.

### 10. FIFA 2026 player poster in team colours — `2060203818785370400`

**Verdict:** Incorrect use.

- Type: `image`. Stored evidence: 媒体标签 "图片".
- Models: GPT Image, GPT Image 2; matches stored model relation.
- Uses: Advertising, Fashion, Web & motion design.
- Styles: Cinematic, Luxury, Photorealistic, Retro / vintage.
- Techniques: Camera movement / shot language.
- Subjects: Person / portrait.
- Stored source: [@AIwithSarah_](https://x.com/AIwithSarah_/status/2060203818785370400).

FIFA poster is Advertising, not Web & motion design. Cinematic, luxury and vintage texture are explicit positives. Fashion is debatable sports-kit/editorial interpretation, not high-confidence false positive.

- **high / uses**: remove Web & motion design; add nothing. Evidence: Requested output is a static 4:5 FIFA campaign poster. UI-inspired design elements do not constitute a website or motion-design task.

### 11. The Office mockumentary, conference room — `2084387316286595436`

**Verdict:** Supported + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 15s".
- Models: none; matches stored model relation.
- Uses: none.
- Styles: none.
- Techniques: Camera movement / shot language, Lip sync / dialogue.
- Subjects: none.
- Stored source: [@Arminn_Ai](https://x.com/Arminn_Ai/status/2084387316286595436).

Video/dialogue/handheld shot language explicit. Empty model and styles stay unproven. Add human subject and shot sequence. Do not label Cinematic just because it is video; documentary sitcom look is distinct.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Script follows named human sitcom characters speaking and reacting.
- **high / techs**: remove nothing; add Multi-shot / storyboard. Evidence: Camera cuts from Michael/Stanley to Jim and holds; this is a sequenced sitcom script with explicit shot changes.

### 12. Seven-shot handheld observational montage — `2085640281941307648`

**Verdict:** Incorrect use + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 15s".
- Models: Seedance; matches stored model relation.
- Uses: Food & beverage.
- Styles: Photorealistic.
- Techniques: Camera movement / shot language, Lip sync / dialogue, Multi-shot / storyboard.
- Subjects: none.
- Stored source: [@oggii_0](https://x.com/oggii_0/status/2085640281941307648).

Food only appears as delivery dialogue at ending. Actual generated subject/action is woman with cat on bed answering phone. Keep valid video, realistic, shot/lip-sync/storyboard tags; add human subject.

- **high / uses**: remove Food & beverage; add nothing. Evidence: Seven-shot bedroom montage centers on woman, cat and phone call. Food is only the spoken explanation for the doorbell; no food or beverage output is directed.
- **high / subjects**: remove nothing; add Person / portrait. Evidence: Seven shots follow the woman and cat in a bedroom.

### 13. Bedroom phone recording, late afternoon light — `2047862141894681076`

**Verdict:** Incorrect style + incomplete.

- Type: `image`. Stored evidence: 媒体标签 "图片 ×2".
- Models: GPT Image, Seedance; matches stored model relation.
- Uses: Beauty.
- Styles: Cinematic, Photorealistic.
- Techniques: none.
- Subjects: none.
- Stored source: [@ChillaiKalan__](https://x.com/ChillaiKalan__/status/2047862141894681076).

not cinematic explicitly contradicts Cinematic. Add human subject. Image type agrees with stored PHOTO source media despite phrase as if recording a private video; Seedance relation deserves external source verification, not automatic deletion.

- **high / styles**: remove Cinematic; add nothing. Evidence: The positive style ends with an explicit constraint: slightly grainy, not cinematic.
- **high / subjects**: remove nothing; add Person / portrait. Evidence: The entire tight phone-recording composition is a young woman.

### 14. Premium product campaign poster, 4:5 — `2063871161998745877`

**Verdict:** Supported core; template facets ambiguous.

- Type: `image`. Stored evidence: 媒体标签 "图片 ×2".
- Models: GPT Image, GPT Image 2; matches stored model relation.
- Uses: Advertising, Beauty, Food & beverage.
- Styles: Luxury, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Food / drink, Person / portrait, Product.
- Stored source: [@AIwithSarah_](https://x.com/AIwithSarah_/status/2063871161998745877).

Advertising, product marketing, luxury/realistic, human/product hero composition and perspective angle are supported. Beauty/Food/Drink are allowed placeholder options, not actual chosen values; medium-confidence scope review only.

- **high / uses**: remove nothing; add Product marketing. Evidence: Requested output is explicitly a premium product campaign poster with the product in hero focus.
- **medium / uses**: remove Beauty, Food & beverage; add nothing. Evidence: Beauty/Food/Drink are optional values in BRAND style placeholder, so not guaranteed for all executions. Current template can legitimately support these uses.
- **medium / subjects**: remove Food / drink; add nothing. Evidence: The product is unspecified. Food/drink is one possible placeholder choice, not an instantiated subject.

### 15. Korean bedroom evening vlog, 10 seconds — `2085931701088174312`

**Verdict:** Incomplete; luxury ambiguous.

- Type: `video`. Stored evidence: 媒体标签 "视频 10s".
- Models: Seedance; matches stored model relation.
- Uses: Beauty.
- Styles: Cinematic, Luxury, Photorealistic.
- Techniques: Camera movement / shot language, Multi-shot / storyboard.
- Subjects: none.
- Stored source: [@Aqsahere_](https://x.com/Aqsahere_/status/2085931701088174312).

Cinematic, realistic, five shots and selfies are explicit. Add human subject. Luxury may be loose match on premium film color grading; no obvious luxury subject is specified. No spoken dialogue means no lip-sync addition.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Five selfies follow the same young Korean woman.
- **medium / styles**: remove Luxury; add nothing. Evidence: Cozy bedroom personal vlog specifies premium film color grading, not luxury environment/product; premium may have triggered loose style match.

### 16. Cheek-to-cheek selfie in an industrial venue — `2009912753650323721`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "图片 ×2".
- Models: Higgsfield Soul, Nano Banana, Nano Banana Pro; matches stored model relation.
- Uses: Beauty.
- Styles: none.
- Techniques: Camera movement / shot language.
- Subjects: Person / portrait.
- Stored source: [@ZaraIrahh](https://x.com/ZaraIrahh/status/2009912753650323721).

Couple selfie, makeup and camera angle support current labels. Photorealistic could be enrichment from authentic smartphone visual language, but current empty style does not misrepresent source.

### 17. Downhill go-karts that launch off the cliff — `2048450197085474925`

**Verdict:** Supported + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 15s".
- Models: Seedance; matches stored model relation.
- Uses: none.
- Styles: Photorealistic.
- Techniques: Camera movement / shot language, Transition / morph / match cut.
- Subjects: none.
- Stored source: [@IqrasaifiAI](https://x.com/IqrasaifiAI/status/2048450197085474925).

Action GoPro chase and free-fall camera transition are explicit. Add vehicles and human racers. Transition tag is valid even without editorial cut because registry groups transition/morph/match cut.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Lead racers are kids on go-karts, whose expressions are directed.
- **high / subjects**: remove nothing; add Vehicle. Evidence: Go-karts with rocket thrusters and gliders are the central action objects.

### 18. 1970s sedan, four-shot street sequence — `2019109812341207229`

**Verdict:** Supported; type unresolved.

- Type: `unknown`. Stored evidence: 原帖无媒体且未出现在图片页面，类型未知.
- Models: none; matches stored model relation.
- Uses: Automotive.
- Styles: Retro / vintage.
- Techniques: Camera movement / shot language, Multi-shot / storyboard.
- Subjects: none.
- Stored source: [@higgsfield_ai](https://x.com/higgsfield_ai/status/2019109812341207229).

Automotive, vintage and four-shot storyboard all supported. Unknown type must remain: stored source specifically says no media. Text strongly implies moving sequence but cannot independently prove supplied media/output type. Add Vehicle and Person subjects.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: First three shots portray a man driving a 1970s sedan.
- **high / subjects**: remove nothing; add Vehicle. Evidence: 1970s sedan, interior controls, grille and license plate are explicitly featured across all four shots.

### 19. Handheld DV vlog through a stone-street town — `2087155737784918460`

**Verdict:** Incorrect advertising + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 15s".
- Models: Seedance; matches stored model relation.
- Uses: Advertising, Beauty, Food & beverage, UGC.
- Styles: Photorealistic, Retro / vintage.
- Techniques: Camera movement / shot language.
- Subjects: none.
- Stored source: [@PhedEU](https://x.com/PhedEU/status/2087155737784918460).

Source explicitly says authentic everyday footage, not polished commercial. Retain UGC, food coffee-run, realistic, analog retro style and camera. Add dialogue/storyboard and human subject. Beauty is weak but category scope ambiguous.

- **high / uses**: remove Advertising; add nothing. Evidence: Explicit authentic everyday footage, not a polished commercial; the requested output is a personal coffee-run vlog without a product campaign.
- **high / subjects**: remove nothing; add Person / portrait. Evidence: Elena is the explicit named vlogger and recurring subject.
- **high / techs**: remove nothing; add Lip sync / dialogue, Multi-shot / storyboard. Evidence: Vlogger speaks quoted lines in selfie footage; scenes move from handheld walk to propped kiosk wide shot and seawall.
- **medium / uses**: remove Beauty; add nothing. Evidence: Minimal makeup describes vlogger appearance; output purpose is daily coffee-run vlog, not explicitly a beauty tutorial/campaign.

### 20. Locked product and identity, outfit swapped — `2089932434351734933`

**Verdict:** Supported core + incomplete.

- Type: `video`. Stored evidence: 媒体标签 "视频 30s".
- Models: Seedance; matches stored model relation.
- Uses: Advertising, Beauty, Fashion, UGC.
- Styles: Cinematic, Luxury, Photorealistic.
- Techniques: Camera movement / shot language, Transition / morph / match cut.
- Subjects: none.
- Stored source: [@AIwithSynthia](https://x.com/AIwithSynthia/status/2089932434351734933).

UGC commercial product review strongly supports Advertising, Fashion, Luxury, Realistic and Cinematic. Macro transition is a real directed shot transition; KEEP current technique. Add Product marketing/Product, human subject, identity consistency, dialogue and multi-shot. Beauty is weak and medium confidence only.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Woman is explicitly clear visual focus and locked character reference.
- **high / subjects**: remove nothing; add Product. Evidence: Sunglasses, earbuds, packaging and cases are locked product references and final product hero shot.
- **high / uses**: remove nothing; add Product marketing. Evidence: UGC product review demonstrates sunglasses and earbuds and ends with an explicit purchase-oriented endorsement.
- **high / techs**: remove nothing; add Character consistency, Lip sync / dialogue, Multi-shot / storyboard. Evidence: Explicit preserve exact facial identity throughout; perfect lip synchronization; five timed sections plus ending shot.
- **medium / uses**: remove Beauty; add nothing. Evidence: Makeup is a preserved identity attribute; actual advertised products are sunglasses and earbuds, so beauty use is weak.

### 21. Device spec sheet as a product poster — `1992826251220754540`

**Verdict:** Incorrect use + incomplete.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×2".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: Web & motion design.
- Styles: Luxury.
- Techniques: none.
- Subjects: none.
- Stored source: [@ShamsAmin56](https://x.com/ShamsAmin56/status/1992826251220754540).

Static hardware promotional specification poster; referenced website only influences layout style. Replace Web & motion design with existing Advertising/Product marketing, add Product subject. Text-heavy product poster is still generated artwork, not automatically tutorial screenshot.

- **high / uses**: remove Web & motion design; add Advertising, Product marketing. Evidence: High-quality promotional post showcasing [DEVICE], full specification sheet; [DEVICE-WEBSITE] is only a style reference for a static product poster.
- **high / subjects**: remove nothing; add Product. Evidence: [DEVICE] and its hardware specification sheet are the requested promotional subject.

### 22. Arcade motorcycle portrait, red crop top — `2016908153284088004`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×4".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: none.
- Styles: Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Person / portrait.
- Stored source: [@KeorUnreal](https://x.com/KeorUnreal/status/2016908153284088004).

Arcade motorcycle is an amusement cabinet, not proof of Automotive task. Existing portrait/photo/shot language supported; no automotive tag should be added.

### 23. Spider-Man suit portrait, playful expression — `2018792341192990900`

**Verdict:** Incorrect food use.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×3".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: Food & beverage.
- Styles: Cinematic, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Architecture / interior, Person / portrait.
- Stored source: [@KeorUnreal](https://x.com/KeorUnreal/status/2018792341192990900).

Coffee cup is incidental prop in superhero portrait. Keep Cinematic/Photorealistic and human subject. Architecture is visible NYC setting; secondary background tagging scope is ambiguous, not an automatic removal.

- **high / uses**: remove Food & beverage; add nothing. Evidence: The requested output is a candid Spider-Man superhero portrait; a disposable coffee cup is a hand prop, not the intended food/beverage task.

### 24. Synthwave poster with block HEIS type — `2026574551207792783`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×2".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: Fashion.
- Styles: Retro / vintage, Sci-fi / cyberpunk.
- Techniques: none.
- Subjects: Person / portrait.
- Stored source: [@rovvmut_](https://x.com/rovvmut_/status/2026574551207792783).

Explicit synthwave retro-futuristic music poster with high-fashion outfit supports Retro, Sci-fi and Fashion. Lyrics and typography are intended design output, not a tutorial screenshot.

### 25. Double-exposure profile from a reference photo — `2027628259467313402`

**Verdict:** Supported + incomplete.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO".
- Models: Nano Banana 2; matches stored model relation.
- Uses: none.
- Styles: Cinematic, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Person / portrait.
- Stored source: [@HaniaAi12](https://x.com/HaniaAi12/status/2027628259467313402).

Cinematic double-exposure portrait and perspective lines justify current styles and shot-language tag. Add exact reference identity consistency. Do not add temporal morph technique for static double-exposure compositing: registry has no exact double-exposure term.

- **high / techs**: remove nothing; add Character consistency. Evidence: Strict identity lock requires the uploaded reference face, skin tone, expression and hairstyle to match exactly.

### 26. Forensic-detail portrait, heart-shaped face — `2031703969882382558`

**Verdict:** Incomplete.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×3".
- Models: Nano Banana 2; matches stored model relation.
- Uses: none.
- Styles: Luxury, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Architecture / interior.
- Stored source: [@PinodiArt](https://x.com/PinodiArt/status/2031703969882382558).

Primary human mirror-selfie subject is missing while secondary architecture is present. Add Person / portrait. Luxury apartment and realistic detailed skin/lens support current styles and technique.

- **high / subjects**: remove nothing; add Person / portrait. Evidence: Human biometric subject and mirror selfie are the main content, but current subject list only says Architecture / interior.

### 27. Pink neon apartment portrait, shot on iPhone — `2032169264963338327`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×3".
- Models: Higgsfield Soul, Nano Banana 2; matches stored model relation.
- Uses: Beauty.
- Styles: Cinematic, Luxury, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Person / portrait.
- Stored source: [@KeorUnreal](https://x.com/KeorUnreal/status/2032169264963338327).

Explicit cinematic low-angle portrait, modern luxury apartment, realistic skin and makeup/nails support current labels. Text contradictory fingernail colors are source quality issue beyond taxonomy.

### 28. Latex Aquaman cosplay in emerald and gold — `2041085548928930146`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×4".
- Models: Higgsfield Soul, Nano Banana Pro; matches stored model relation.
- Uses: none.
- Styles: Luxury, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Person / portrait.
- Stored source: [@KeorUnreal](https://x.com/KeorUnreal/status/2041085548928930146).

Realistic cosplay portrait in a luxurious ancient Greek room supports portrait, luxury/photo and shot language. Do not add Anime merely for a superhero reference; rendering is explicitly photorealistic.

### 29. Candid selfie with iPhone-5 grain — `2051559171452215583`

**Verdict:** Incorrect style + incomplete.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: Beauty.
- Styles: Anime / illustrated, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Architecture / interior.
- Stored source: [@AIWithRay](https://x.com/AIWithRay/status/2051559171452215583).

Manga lashes describes makeup, not illustrated rendering. Remove Anime, add Person. Existing architecture subject is incidental backdrop and deserves review; Beauty/photo/shot language supported.

- **high / styles**: remove Anime / illustrated; add nothing. Evidence: Photorealistic smartphone selfie; anime/manga qualifies a real makeup eyelash effect, not the image rendering style.
- **high / subjects**: remove nothing; add Person / portrait. Evidence: Close-range selfie with detailed human appearance; current subject list only says Architecture / interior.
- **medium / subjects**: remove Architecture / interior; add nothing. Evidence: Minimal interior is backdrop to close selfie, with no architectural study; retaining secondary setting tags is a policy choice.

### 30. Venetian bridge portrait, everything in focus — `2052012370373812240`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×4".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: Beauty.
- Styles: Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Architecture / interior, Person / portrait.
- Stored source: [@KeorUnreal](https://x.com/KeorUnreal/status/2052012370373812240).

Portrait and architecture both intentionally detailed: infinite focus and named Venice buildings. Deep focus, camera angle, realistic and beauty styling supported.

### 31. Lakeside blue-hour portrait, palace behind — `2060557083679076537`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×3".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: Beauty.
- Styles: Cinematic, Luxury, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Architecture / interior, Person / portrait.
- Stored source: [@ZaraIrahh](https://x.com/ZaraIrahh/status/2060557083679076537).

Luxury travel portrait explicitly names cinematic aesthetic, photorealism, palace architecture, human subject, glamorous makeup and 85mm framing.

### 32. Country stamp built as a breaking-out miniature — `2063814043631280180`

**Verdict:** Supported.

- Type: `image`. Stored evidence: 媒体标签 "图片 1/4".
- Models: GPT Image 2; matches stored model relation.
- Uses: none.
- Styles: Photorealistic.
- Techniques: 微缩摄影.
- Subjects: none.
- Stored source: [@Naiknelofar788](https://x.com/Naiknelofar788/status/2063814043631280180).

Hyperreal macro diorama, tilt-shift and miniature art explicitly support Photorealistic/miniature technique. Architecture could enrich generic landmark, but landmark not necessarily building; no subject added without instantiated COUNTRY.

### 33. Italian villa balcony, pinstripe sundress — `2065638647886659855`

**Verdict:** Incorrect style.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×3".
- Models: Nano Banana Pro; matches stored model relation.
- Uses: Beauty, Fashion.
- Styles: Anime / illustrated, Cinematic, Luxury, Photorealistic, Retro / vintage.
- Techniques: Camera movement / shot language.
- Subjects: Architecture / interior, Person / portrait.
- Stored source: [@ZaraIrahh](https://x.com/ZaraIrahh/status/2065638647886659855).

Cartoon is negative-only; remove Anime. All other positive labels explicitly described: fashion editorial, luxury villa, vintage wallpaper, cinematic/photorealistic atmosphere, architectural setting and portrait.

- **high / styles**: remove Anime / illustrated; add nothing. Evidence: Explicit photorealistic editorial portrait; cartoon is only a negative-prompt exclusion.

### 34. Convenience-store student, mint polo — `2068543924055240801`

**Verdict:** Incorrect style and use.

- Type: `image`. Stored evidence: 媒体标签 "PHOTO · ×2".
- Models: GPT Image 2; matches stored model relation.
- Uses: Food & beverage.
- Styles: Cinematic, Photorealistic.
- Techniques: Camera movement / shot language.
- Subjects: Architecture / interior, Person / portrait.
- Stored source: [@saniaspeaks_](https://x.com/saniaspeaks_/status/2068543924055240801).

Explicit no cinematic color grading contradicts Cinematic. Portrait holding book uses drinks refrigerator as backdrop, not Food & beverage task. Photo/shot language and human subject supported. Secondary interior setting is policy-dependent.

- **high / styles**: remove Cinematic; add nothing. Evidence: Explicit no cinematic color grading, no studio lighting, unedited phone-camera look.
- **high / uses**: remove Food & beverage; add nothing. Evidence: Student portrait holding a book; drink bottles are refrigerator background. No food/beverage campaign or preparation is requested.

## Verification and publication state

Executed: parsed all 34 active JSON records and all matching stored wireframe rows; normalized full-text comparison; local model/type evidence comparison; checked proposed labels against existing taxonomy registry. No lint/build/browser tests needed or run for this read-only evidence artifact. Existing local source data may itself have inherited weak automated classifications; this audit explicitly separates textual contradiction from category-policy ambiguity.

Only evidence files were written. CMS public state, mirror snapshot and deployment were neither read nor modified. This is review guidance for isolated visual fixtures; formal content correction still requires the authorized CMS proposal/review path.
