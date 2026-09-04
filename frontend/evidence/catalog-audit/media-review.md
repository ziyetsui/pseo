# 34 条展示样本的媒体类型审查

审查日期：2026-09-04。范围仅 `frontend/src/data/prototype.json` 中当前 34 条活动样本及其媒体映射；只读代码/完整 Prompt/本地来源记录，未运行 build、e2e、浏览器或外网可用性检查。链接 HTTP 探测与页面运行验收由主任务单独记录。本报告不证明媒体实拍内容、生成模型真实性、权利许可或 CMS 公开状态。

本次数据文件 SHA-256：`6b394630e399f3a1ca9ae411a534da40adb464b0eb1dec744ddfece42298cb9b`。活动样本为 **22 image、11 video、1 unknown**；共有 **36 个不同媒体 URL**（25 个普通图片 URL、11 个视频封面 URL）。此前明确移除的 `2066531004924436614` 不在当前34条中。

结论：34/34 `kind` 与历史来源 `contentType` 一致；34/34 来源 URL 的 status ID 与 immutable id 一致；36/36 活动媒体 URL 均属于同一 id 的 `WIREFRAME_PROMPTS.media.src`。31 条类型证据和正文意图直接一致；2 条（1、13）媒体证据支持当前类型，但正文用途有歧义；1 条（18）仍缺媒体证据，保留 unknown。没有足够依据自动改任何一条的类型。

完整正文逐条审读，并与来源 `promptText` 比较：规范化空白后34/34相同。本结论只说明语义材料一致，不把格式空白差异称为逐字一致。历史来源在若干图片条目记有×2/×3/×4，但仅保存第一张URL；当前按真正可用URL计数。只有第32条有4个媒体URL，不能虚构缺失图片。

## 逐条判定

“确认”指本地来源标签、媒体URL形态和全文意图的一致性，不是远端事实认证。V 表示 `amplify_video_thumb/...jpg` 视频封面；I 表示 `media/...jpg` 图片资产；两者虽均为JPEG，Prompt类型不能依据扩展名统一改为image。表中原帖链接已检查ID关联，未在本子任务做HTTP探测。

| # | ID / 标题 / 原帖 | 当前类型 / 媒体证据 | 判定及全文依据 | 活动媒体 |
| --- | --- | --- | --- | --- |
| 1 | [2073529429838696592](https://x.com/zeuuss_01/status/2073529429838696592)<br>Scroll-scripted site build, shot by shot | video；V；14s；1张JPEG封面<br>媒体标签 "视频 14s" | **语义待确认；保留 video**。正文混合建站、滚动脚本、3–5s 动效资产、安装步骤及推广；14s 视频来源标签支持媒体类型，但不能证明它是单一视频生成 Prompt。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2073529353984479232/img/zW1OLkU6lbHMkqFA.jpg?name=small) |
| 2 | [2019849202591789460](https://x.com/KeorUnreal/status/2019849202591789460)<br>Gym mirror selfie under blue-purple LED | image；I；1张JPEG<br>媒体标签 "图片 ×2" | **确认 image**。image_analysis + generated_prompt 描写固定镜面自拍与9:16构图，无时间序列。 | [媒体1](https://pbs.twimg.com/media/HAfyGmXXUAAXUk2.jpg?name=small) |
| 3 | [2071174186978951379](https://x.com/Naiknelofar788/status/2071174186978951379)<br>One take from deep space to a cafe table | video；V；15s；1张JPEG封面<br>媒体标签 "视频 15s" | **确认 video**。明确 TOTAL:15s、0–15s 时间线、一镜到底与音效。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2071173989758828544/img/XrApo3brHZspKnV-.jpg?name=small) |
| 4 | [2015726421990056336](https://x.com/KeorUnreal/status/2015726421990056336)<br>Overhead portrait on the LA Walk of Fame | image；I；1张JPEG<br>媒体标签 "图片 ×3" | **确认 image**。明确 Portrait photography、3:4、俯视固定构图。 | [媒体1](https://pbs.twimg.com/media/G_lMfTjWsAAB7k7.jpg?name=small) |
| 5 | [2078814921756754352](https://x.com/Kiber_Alla/status/2078814921756754352)<br>Neon dance-studio music video, 15 seconds | video；V；15s；1张JPEG封面<br>媒体标签 "视频 15s" | **确认 video**。明确15-second music video、0–15s动作与持续 lip-sync。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2078813993645273089/img/4nQRj3B5LpuYV0XW.jpg?name=small) |
| 6 | [2083168602363150527](https://x.com/higgsfield_ai/status/2083168602363150527)<br>A day in New York, filmed by the subject | video；V；29s；1张JPEG封面<br>媒体标签 "视频 29s" | **确认 video；时长需区分**。8 shots、7 hard cuts、正文30s；来源样本 dur=29。29s 是源媒体标签，30s 是生成指令。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2083165874983424000/img/L7v_JTJr0f72f2Z_.jpg?name=small) |
| 7 | [2029632175482507599](https://x.com/PinodiArt/status/2029632175482507599)<br>Forensic-detail beauty portrait, hooded eyes | image；I；1张JPEG<br>媒体标签 "图片 ×2" | **确认 image**。固定台球桌姿态，9:16、50mm/f2.8静态肖像。 | [媒体1](https://pbs.twimg.com/media/HCqzkiOXEAE3uDT.jpg?name=small) |
| 8 | [2088866007918268515](https://x.com/ChillaiKalan__/status/2088866007918268515)<br>Paper world, 30-second cinematic short | video；V；30s；1张JPEG封面<br>媒体标签 "视频 30s" | **确认 video**。明确30-second cinematic sequence，00:00–00:30镜头时间线。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2088865943921528832/img/ACj33PYyBD5RI7qH.jpg?name=small) |
| 9 | [2008952931484098637](https://x.com/Arminn_Ai/status/2008952931484098637)<br>Isometric diorama of [LOCATION] on a round base | image；I；1张JPEG<br>媒体标签 "图片" | **确认 image**。圆底座3D等距全景、固定比例和静态构图。 | [媒体1](https://pbs.twimg.com/media/G-E77p2WIAAbR1j.jpg?name=small) |
| 10 | [2060203818785370400](https://x.com/AIwithSarah_/status/2060203818785370400)<br>FIFA 2026 player poster in team colours | image；I；1张JPEG<br>媒体标签 "图片" | **确认 image**。明确 football poster、OUTPUT:4:5。 | [媒体1](https://pbs.twimg.com/media/HJdQdAobUAA0Naq.jpg?name=small) |
| 11 | [2084387316286595436](https://x.com/Arminn_Ai/status/2084387316286595436)<br>The Office mockumentary, conference room | video；V；15s；1张JPEG封面<br>媒体标签 "视频 15s" | **确认 video**。对话、snap zoom、cut与hold two seconds连续事件。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2084387230844346368/img/3q3PrcBYVZsGJ3lW.jpg?name=small) |
| 12 | [2085640281941307648](https://x.com/oggii_0/status/2085640281941307648)<br>Seven-shot handheld observational montage | video；V；15s；1张JPEG封面<br>媒体标签 "视频 15s" | **确认 video**。明确7 shots、0–15s时间线、口型及现场声音。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2085640247682224128/img/Wj08brZzXojtfWtv.jpg?name=small) |
| 13 | [2047862141894681076](https://x.com/ChillaiKalan__/status/2047862141894681076)<br>Bedroom phone recording, late afternoon light | image；I；1张JPEG<br>媒体标签 "图片 ×2" | **语义待确认；保留 image**。正文 as if recording / looks like a real phone recording 描述单一静态场景；无时长、运动时间线。来源图片×2支持 image，不能凭 Seedance 标签或 recording 改 video。 | [媒体1](https://pbs.twimg.com/media/HGt3trjbwAA7Bkt.jpg?name=small) |
| 14 | [2063871161998745877](https://x.com/AIwithSarah_/status/2063871161998745877)<br>Premium product campaign poster, 4:5 | image；I；1张JPEG<br>媒体标签 "图片 ×2" | **确认 image**。明确 photorealistic premium product campaign poster，4:5。 | [媒体1](https://pbs.twimg.com/media/HKRX36vbsAAskMp.jpg?name=small) |
| 15 | [2085931701088174312](https://x.com/Aqsahere_/status/2085931701088174312)<br>Korean bedroom evening vlog, 10 seconds | video；V；10s；1张JPEG封面<br>媒体标签 "视频 10s" | **确认 video**。明确 vertical video,10 seconds、5段时间线和24fps。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2085931637343420416/img/HZ3NABsiLrAmXz8m.jpg?name=small) |
| 16 | [2009912753650323721](https://x.com/ZaraIrahh/status/2009912753650323721)<br>Cheek-to-cheek selfie in an industrial venue | image；I；1张JPEG<br>媒体标签 "图片 ×2" | **确认 image**。固定室内近距离情侣自拍、固定镜头与构图。 | [媒体1](https://pbs.twimg.com/media/G-Sk_ERasAMwxXc.jpg?name=small) |
| 17 | [2048450197085474925](https://x.com/IqrasaifiAI/status/2048450197085474925)<br>Downhill go-karts that launch off the cliff | video；V；15s；1张JPEG封面<br>媒体标签 "视频 15s" | **确认 video**。赛车运动、推进追随镜头、悬崖转场、声效；来源15s。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2048449587044855808/img/PNSS3kDNbKbMmysD.jpg?name=small) |
| 18 | [2019109812341207229](https://x.com/higgsfield_ai/status/2019109812341207229)<br>1970s sedan, four-shot street sequence | unknown；无媒体<br>原帖无媒体且未出现在图片页面，类型未知 | **unknown；证据不足**。四镜头、zoom/cut有视频倾向，但没有媒体、模型或时长证据；保持 unknown，不能推断为 video/image。 | — |
| 19 | [2087155737784918460](https://x.com/PhedEU/status/2087155737784918460)<br>Handheld DV vlog through a stone-street town | video；V；15s；1张JPEG封面<br>媒体标签 "视频 15s" | **确认 video；时长需区分**。明确DV vlog和视频动作；正文要求前20–30s手持，源 dur=15，不能宣称示例完成全文时序。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2087155707795607552/img/GvPt7yiUAlXPgSXk.jpg?name=small) |
| 20 | [2089932434351734933](https://x.com/AIwithSynthia/status/2089932434351734933)<br>Locked product and identity, outfit swapped | video；V；30s；1张JPEG封面<br>媒体标签 "视频 30s" | **确认 video**。明确 entire video、0–30s时间线、对白/口型与产品连续性。 | [媒体1](https://pbs.twimg.com/amplify_video_thumb/2089932382531133440/img/k05-QTjlyxToORTd.jpg?name=small) |
| 21 | [1992826251220754540](https://x.com/ShamsAmin56/status/1992826251220754540)<br>Device spec sheet as a product poster | image；I；1张JPEG<br>媒体标签 "PHOTO · ×2" | **确认 image**。生成完整设备宣传海报/规格排版；文字是设计成品的一部分，不能仅因 specification sheet 判为教程截图。 | [媒体1](https://pbs.twimg.com/media/G6fw59VXYAAHd8R.jpg?name=small) |
| 22 | [2016908153284088004](https://x.com/KeorUnreal/status/2016908153284088004)<br>Arcade motorcycle portrait, red crop top | image；I；1张JPEG<br>媒体标签 "PHOTO · ×4" | **确认 image**。固定游戏厅摩托车人物肖像、medium shot与摄影风格。 | [媒体1](https://pbs.twimg.com/media/G_1_Q_MXgAAg26K.jpg?name=small) |
| 23 | [2018792341192990900](https://x.com/KeorUnreal/status/2018792341192990900)<br>Spider-Man suit portrait, playful expression | image；I；1张JPEG<br>媒体标签 "PHOTO · ×3" | **确认 image**。明确 candid portrait/raw photo、85mm/f1.8、固定姿态。 | [媒体1](https://pbs.twimg.com/media/HAQw7YJXgAA4GIV.jpg?name=small) |
| 24 | [2026574551207792783](https://x.com/rovvmut_/status/2026574551207792783)<br>Synthwave poster with block HEIS type | image；I；1张JPEG<br>媒体标签 "PHOTO · ×2" | **确认 image**。明确 synthwave music poster、HEIS typography和静态版式。 | [媒体1](https://pbs.twimg.com/media/HB_W0AYaMAkOKVS.jpg?name=small) |
| 25 | [2027628259467313402](https://x.com/HaniaAi12/status/2027628259467313402)<br>Double-exposure profile from a reference photo | image；I；1张JPEG<br>媒体标签 "PHOTO" | **确认 image**。明确 double exposure portrait、size4:5 image generate。 | [媒体1](https://pbs.twimg.com/media/HCOVJ5QWUAA1DNU.jpg?name=small) |
| 26 | [2031703969882382558](https://x.com/PinodiArt/status/2031703969882382558)<br>Forensic-detail portrait, heart-shaped face | image；I；1张JPEG<br>媒体标签 "PHOTO · ×3" | **确认 image**。固定镜面自拍，35mm/f2.8/RAW、9:16。 | [媒体1](https://pbs.twimg.com/media/HDIP6V5WgAEocdY.jpg?name=small) |
| 27 | [2032169264963338327](https://x.com/KeorUnreal/status/2032169264963338327)<br>Pink neon apartment portrait, shot on iPhone | image；I；1张JPEG<br>媒体标签 "PHOTO · ×3" | **确认 image**。固定公寓自拍/夜间霓虹肖像与手机摄影构图。 | [媒体1](https://pbs.twimg.com/media/HDO3Kb_XUAAs9jz.jpg?name=small) |
| 28 | [2041085548928930146](https://x.com/KeorUnreal/status/2041085548928930146)<br>Latex Aquaman cosplay in emerald and gold | image；I；1张JPEG<br>媒体标签 "PHOTO · ×4" | **确认 image**。固定乳胶Aquaman cosplay肖像、服装与环境摄影结构。 | [媒体1](https://pbs.twimg.com/media/HFNkegpXEAAriop.jpg?name=small) |
| 29 | [2051559171452215583](https://x.com/AIWithRay/status/2051559171452215583)<br>Candid selfie with iPhone-5 grain | image；I；1张JPEG<br>媒体标签 "PHOTO" | **确认 image**。明确 Photorealistic3:4 image、手机颗粒自拍。 | [媒体1](https://pbs.twimg.com/media/HHiaL2FbsAAImQ3.jpg?name=small) |
| 30 | [2052012370373812240](https://x.com/KeorUnreal/status/2052012370373812240)<br>Venetian bridge portrait, everything in focus | image；I；1张JPEG<br>媒体标签 "PHOTO · ×4" | **确认 image**。RAW photograph、固定威尼斯桥肖像、全景深。 | [媒体1](https://pbs.twimg.com/media/HHo2XVdWgAQV_Zd.jpg?name=small) |
| 31 | [2060557083679076537](https://x.com/ZaraIrahh/status/2060557083679076537)<br>Lakeside blue-hour portrait, palace behind | image；I；1张JPEG<br>媒体标签 "PHOTO · ×3" | **确认 image**。image_type=portrait_travel_photography、蓝调时刻湖边固定肖像。 | [媒体1](https://pbs.twimg.com/media/HJiRu4PXoAABMQQ.jpg?name=small) |
| 32 | [2063814043631280180](https://x.com/Naiknelofar788/status/2063814043631280180)<br>Country stamp built as a breaking-out miniature | image；I；4张JPEG<br>媒体标签 "图片 1/4" | **确认 image**。固定宏观摄影邮票微缩景观，提供4张图片；不是动画时间线。 | [媒体1](https://pbs.twimg.com/media/HKQj4k7bkAA0Aov.jpg?name=small) · [媒体2](https://pbs.twimg.com/media/HKQj4khaIAIGhDU.jpg?name=small) · [媒体3](https://pbs.twimg.com/media/HKQj4k5bQAA0ro2.jpg?name=small) · [媒体4](https://pbs.twimg.com/media/HKQj4kkagAA8F13.jpg?name=small) |
| 33 | [2065638647886659855](https://x.com/ZaraIrahh/status/2065638647886659855)<br>Italian villa balcony, pinstripe sundress | image；I；1张JPEG<br>媒体标签 "PHOTO · ×3" | **确认 image**。明确 photorealistic editorial portrait、别墅阳台静态人物构图。 | [媒体1](https://pbs.twimg.com/media/HKqcr_TakAACa5Y.jpg?name=small) |
| 34 | [2068543924055240801](https://x.com/saniaspeaks_/status/2068543924055240801)<br>Convenience-store student, mint polo | image；I；1张JPEG<br>媒体标签 "PHOTO · ×2" | **确认 image**。便利店手机摄影、固定人物服装与场景。 | [媒体1](https://pbs.twimg.com/media/HLTxa8GWAAAPS-S.jpg?name=small) |

## 当前渲染与 API 映射

- [fixture.ts](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/fixture.ts) 把 `record.kind` 的 image/video 原样保留到 `Prompt.kind`，unknown 显式映射为 UI 的 `other`（UI及public DTO无unknown枚举）。所有 `record.imgs` 作为 `Media.kind=image`；对11个JPEG视频封面这是正确资产类型，**不等于把视频Prompt归为图片**。`generationLabel` 分别为 Generate image / Generate video / Generate；`Deck` 和 `query` 按 Prompt.kind 精确筛选，unknown/other不会混入 Images 或 Videos。
- [public.ts](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/public.ts) 从详情的 `summary.contentType` 映射 Prompt.kind，从每个 `summary.media[].type/url/posterUrl` 映射 Media.kind/src/poster，不凭模型名、正文、URL后缀重判。公开 [MediaSchema](/Users/ziye/Desktop/pseo/backend/src/pseo/api/schemas.py:60) 允许 image/video，PromptSummary允许 image/video/text/other；生成的前端类型一致。`img`取第一个image或video poster；真正video的src交给video元素，poster单独使用。
- [PromptMedia.tsx](/Users/ziye/Desktop/pseo/frontend/src/components/PromptMedia.tsx) 有真实 `Media.kind=video` 时使用 `<video controls preload=none>`，否则 `<img>`；当前11个视频样本只提供JPEG封面，所以无可播放控件/视频URL。Recipe同理，caption仍由Prompt.kind显示VIDEO。不能据此声称11条视频可直接播放，也不能把JPEG塞进video.src。
- [RecipeMedia.tsx](/Users/ziye/Desktop/pseo/frontend/src/components/RecipeMedia.tsx) 最多显示4个媒体；[StylePlateReader.tsx](/Users/ziye/Desktop/pseo/frontend/src/components/StylePlateReader.tsx) 最多3个图片，真实video优先。当前32号的4图在Recipe全部展示，Plate显示3图但Extent记录实际4项，符合已选Plate最多3张合同。
- public详情 `examples[]` 独立于 `summary.media[]`，目前UI mapper未消费示例input/caption/output。对本轮34条fixture不产生缺项；若未来公开详情仅在examples放置效果图，Recipe将不能展示该图。属于接口覆盖限制，不能称已验证完整示例映射。

## Preview 与历史数据边界

[server.ts](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/server.ts) / [config.ts](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/config.ts) 当前只有显式 visual-fixture 与 public-api 两种入口，没有活动 cms-preview 前端adapter，不会把Preview DTO强转成public DTO。Preview页面接入尚不能据此报告完成。

[历史 wireframe prompts](/Users/ziye/Desktop/pseo/frontend/src/data/wireframe/prompts.ts) 的11个video `media.kind` 仍是video，而src实际是同一JPEG视频封面；活动fixture通过 `record.imgs→Media.kind=image` 已隔离该历史表达。CMS [Preview mediaProjection](/Users/ziye/Desktop/pseo/cms/src/preview/projectCatalog.ts:190) 将 `artifact.media[].mediaType/url` 直接映射为 `kind/src`；[Preview DTO](/Users/ziye/Desktop/pseo/cms/src/preview/types.ts) 没有独立poster字段。如果承接这类历史video+JPEG记录的未来adapter机械透传给当前PromptMedia，就会产生不可播放的video src。该问题是历史/未来Preview接入风险，不是当前34条活跃页面的播放故障证据；本轮未读取在线CMS内容。

Preview contentType仅image/video/unknown，对其他值保留unknown；public/UI使用image/video/text/other，必须显式适配，不能用默认image兜底。媒体自身的image/video与Prompt整体contentType必须分开建模。

## 需保留的差异与限制

1. **用途歧义不自动改类**：1号是网站+动效工作流且含安装、价格替代和营销文本；本地视频封面支持video，但没有实际播放/像素审查，无法判断视频是最终生成效果还是教程画面。13号的recording是“仿录像”的静态氛围描述，图片来源证据强于模型标签猜测。若执行更严格展示质量剔除，应由内容owner复核原帖/实际画面，不由本报告删除。
2. **时长分开解释**：6号原帖媒体标签29s、正文30s；19号标签15s、正文先20–30s再进入后段。当前dur源自历史标签，不是测量结果，不能改成正文时长或声称输出完整匹配Prompt。
3. **当前文案泛化风险**：PromptMedia真实video加载失败时仍显示“This source image is unavailable”；无媒体时显示“No image on the source post”。Recipe无媒体也写“No image was published…”并断言只发布了文字。对当前unknown记录来源明确无媒体是可解释的；对未来video/text/other数据应使用准确的media状态，尤其不能由读模型缺媒体推断原帖从未发布。
4. **未触发的类别标签风险**：Recipe把所有非video且有媒体的Prompt标为PHOTO；当前unknown无媒体，34条中不触发未知被标PHOTO。Deck多个媒体固定“PHOTO·×n”；当前video仅1个封面也未触发，未来video有多媒体会误标。caption应分别表达Prompt类型和当前资产是否仅封面，不建议仅为这批样本猜类。
5. **远端可用性与发布**：报告检查的是字符串/关联/代码。36媒体、34原帖的HTTP成功、实际画面、视频流MIME、rights/public资格没有在本子任务验证；必须与父任务链接探测和CMS审核证据分别陈述。

本子任务仅新增本报告，没有修改应用、样本数据、CMS、镜像或其他审查文件。
