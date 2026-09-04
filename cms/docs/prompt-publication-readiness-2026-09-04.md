# 生产 Prompt 发布就绪核对 — 2026-09-04

核对时间：2026-09-04T14:02:14.712Z。使用已授权 Neon profile，经精确生产分支/endpoint校验后执行 REPEATABLE READ READ ONLY；会话默认只读。没有修改内容、审批、权利、snapshot、GitHub 或部署。本报告不是发布授权。

## 结论

CMS 的 36 条不是 36 条可发布内容：35 条采集/视觉 seed 均为 needs_review、rights review_required、zh-CN draft，均没有内容审批；另 1 条是独立 golden 示例，有 zh-CN revision-bound approval。后台和前端部署成功不改变这些内容资格。

拟正式整理的真实内容目标可先界定为 34 条：35 条 seed 中的 prm_2066531004924436614 是已被前端明确排除的教程/营销截图；golden 也不属于这 34 条。筛选范围仍需 owner决定，不能据此自动审批或发布。

这 34 条也不是只需补字段和人工审核就能全部发布。Day-1 工程合同目前仅支持 `models=['model-agnostic']` 且 `media/examples` 为空；真实模型与媒体的发布支持尚未覆盖这些样本。需要先扩展并审核相应的模型/媒体发布合同与实现，或采用真实且已获批准的无媒体投影合同。不得把真实模型改成 `model-agnostic`，也不得直接删除媒体来绕过现有门禁。

## 只读实测与缺项分类

- 数据量：36 artifacts、36 locale variants、37 source/evidence、1 approval、0 withdrawals；所有 locale 均为 zh-CN，没有 en版本。
- 35 条 seed均缺 canonical bodyMarkdown、独立 evidence记录、人工 locale reviewer及 ready状态、revision-bound approval。全部 primary source为 review_required。
- 34 条 seed无变量/参数声明，34 条无 workflow，34 条 summary短于当前合同24字符最低要求。国家主题微缩邮票海报有部分结构，但其他共同缺项仍阻断。
- 34 条 seed带媒体；当前 public v1 validator要求 media/examples为空并报 UNVERIFIED_MEDIA。这反映 Day-1 工程能力限制，不单独证明媒体权利有问题，也不能把预览图片已显示视为媒体公开权利已审核。
- 13 条 seed缺来源发布日期。当前 validator将其作为 REQUIRED/INVALID_DATE错误；不是仅供参考的信息缺失，也不能编造日期通过检查。
- 全部36条 locale保留 indexable=false/noindex,nofollow，这是draft治理设置，本身不代表已审批记录不能进入snapshot；公开投影由不可变审批单独决定。

分类代码：R=权利审核未完成；A=缺revision-bound人工审批；L=locale仍draft且缺reviewer；B=缺canonical Markdown正文；E=缺独立来源evidence；V=缺变量/参数；W=缺workflow；S=summary不足24字符；M=当前public v1尚不支持媒体发布；D=缺来源发布日期。各项是当前观察到的阻断下界，O=缺 sourceLocale=en 对应的源语言记录；T=当前public v1尚不支持该模型taxonomy；G=slug不合法；P=变量/参数映射不匹配。M/T标记工程合同能力限制，不是认定真实模型分类或媒体本身错误。

所有35条 seed 的 cleared路径字段均缺 basis、reviewed_by、reviewed_at、evidence_url、license_reference。若 owner选择 community_attributed路径，目前也均缺 author_name、author_identity、original_post_url、policy_version、reviewed_by、reviewed_at、risk_accepted_by、risk_accepted_at、takedown_url。两条是可选择的权利政策路径，不要求同时填两套，也不授权 Agent自行选择/填写。来源URL存在不等于已获得重发许可。

## 逐条清单

标题按当前CMS原样列出；英文截断标题挂在zh-CN draft下，不表示翻译已经完成。状态列中的“待审”统一表示 needs_review / review_required / zh-CN draft / approval=0。

| Immutable id | 当前 CMS 标题 | 分类 | 状态与缺项 |
| --- | --- | --- | --- |
| prm_1992826251220754540 | Design, high-quality promotional post showcasing the [DEVICE] | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T、P |
| prm_2008952931484098637 | Concept: A hyper-realistic 3D isometric view of a [INSERT LOCATI… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2009912753650323721 | { "scene_type": "indoor close-up lifestyle selfie", "setting": { | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T、G |
| prm_2015726421990056336 | { "prompt": "Portrait photography from above, Ana de Armas with long brown | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2016908153284088004 | { "prompt_structure": { "subject": { "appearance": "Young woman with long, | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2018792341192990900 | { "prompt_description": "Ultra Photorealistic Candid Portrait of a | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2019109812341207229 | Shot 1: Side profile medium shot of a Black man with an afro, mu… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、O、T |
| prm_2019849202591789460 | { "image_analysis": { "overall_scene": "Provocative gym mirror selfie of | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2026574551207792783 | A stylized, retro-futuristic music poster in a synthwave aesthetic | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T、G |
| prm_2027628259467313402 | Use the uploaded picture as a reference (Strict identity lock, the face | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2029632175482507599 | { "subject": { "identity": { "biometric_reference": "Sydney Sweeney", | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T、G |
| prm_2031703969882382558 | { "subject": { "identity": { "biometric_reference": "Sabrina Carpenter", | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2032169264963338327 | { “meta”: { “quality”: “ultra_photorealistic, raw style, 8k”, “camera”: | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T、G |
| prm_2041085548928930146 | { "subject": { "desc": "Young woman with strong resemblance to a realistic | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2047862141894681076 | A realistic young woman sitting casually in a softly lit bedroom… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T、G |
| prm_2048450197085474925 | Subject: Downhill Kart Race Style: Hyper-realistic, Action Adven… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2051559171452215583 | Photorealistic 3:4 image | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2052012370373812240 | { "prompt_details": { "medium": "RAW photograph", "quality_tags": [ | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2060203818785370400 | Design a hyper-realistic FIFA 2026 football poster inspired by premium | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T、G |
| prm_2060557083679076537 | {"image_type":"portrait_travel_photography","prompt":"Ultra-realistic | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2063814043631280180 | 国家主题微缩邮票海报 | 采集seed候选 | 待审；R、A、L、B、E、M、O、T、P |
| prm_2063871161998745877 | Create a photorealistic premium product campaign poster in a 4:5 vertical | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2065638647886659855 | Photorealistic romantic European travel editorial portrait of a beautiful | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T |
| prm_2066531004924436614 | produces an ICP pain map plus 7 ad angles ranked by differentiat… | 教程/营销截图，前端已排除 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2068543924055240801 | Japanese girl with long straight black hair and soft wispy bangs, wearing a | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、D、O、T、G |
| prm_2071174186978951379 | Scene: A seamless ultra-cinematic one-take shot starting from de… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2073529429838696592 | concept + scroll: "read this brief, script the scroll | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2078814921756754352 | A cinematic 15-second music video shot in a dark modern dance st… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T、G |
| prm_2083168602363150527 | SCENE A day in New York shot entirely by the subject herself: wa… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2084387316286595436 | The Office (US) mockumentary style | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2085640281941307648 | Montage, multi-shot candid observational footage | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2085931701088174312 | Ultra-realistic cinematic vertical video, 10 seconds | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T、G |
| prm_2087155737784918460 | CAMERA: Handheld DV 16mm daily vlog footage | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2088866007918268515 | 30-SECOND CINEMATIC SHORT Create a 30-second cinematic sequence… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_2089932434351734933 | Use the uploaded reference image as the exact character and prod… | 采集seed候选 | 待审；R、A、L、B、E、V、W、S、M、O、T |
| prm_80934ec28db44eec9c8a500111072136 | 把模糊目标转化为可执行计划 | golden示例 | validated / cleared / zh-CN ready / approval=1；当前原生validator与snapshot一致性复验通过 |

## 部署源码原生复验

在无 .env临时stage通过现有 Payload Local API、PayloadDraftContentValidator和PublicSnapshotService执行只读验证；连接强制 default_transaction_read_only=on，未创建审批、未运行迁移、未写出公开snapshot或Git镜像。校验36条的zh-CN目标：1条通过、35条失败。

- 35条均实报 NOT_VALIDATED、LOCALE_NOT_READY、REVIEWER_REQUIRED、RIGHTS_NOT_CLEARED、PROMPT_BODY_DRIFT、H1_MISMATCH、SOURCE_EVIDENCE_MISSING。
- 35条 sourceLocale=en，但仅有zh-CN draft；实报 LOCALE_CARDINALITY / SOURCE_LOCALE_MISSING。它们不是已完成的双语内容。
- 35条实报 UNSUPPORTED_PUBLIC_MODEL_TAXONOMY，24条另报 TAXONOMY_UNRESOLVED。前者来自现有v1仅允许 `models=['model-agnostic']` 的工程限制，不表示这35条真实模型分类错误；后者是另需核对的关系完整性问题。
- 34条实报 UNVERIFIED_MEDIA与WORKFLOW_ORDER；9条 INVALID_SLUG，13条来源日期 INVALID_DATE，1条变量/参数映射漂移。除修复真实字段缺项、完成权利与人工审核外，还须先解决受审模型/媒体发布支持，随后重新通过完整合同，不能靠改模型标签或删媒体获取通过。
- Golden `prm_80934ec28db44eec9c8a500111072136` 当前源/内容/权利revision与已审批记录匹配，公共快照服务成功生成1条Prompt。export revision：`sha256:7ea734603e1ca5976d0f35636cb615ffd542c572521ccece86f8eabfe5601114`。manifest的locales=2是站点语言清单，不能解释成golden有两个已审批语言版本；实际approval只有zh-CN。

这证明当前数据库可以生成1条golden的有效快照，不等于本次调用了受保护HTTP导出、刷新GitHub或发布前端。原生脱敏收据：/tmp/pseo-prompt-native-readiness.json。

## 隔离、历史与前端边界

- 当前库没有 restricted/takedown权利记录或withdrawal审计；“教程已从前端排除”是产品筛选，不是数据库中的takedown状态。没有把未发现撤下记录解释成内容安全/许可通过。
- 36条最新artifact version的workflow/status均与当前artifact表相同。本次未据历史Git publication audit字段判断可发布性。
- Golden的primary source为cleared且对应所选rights字段齐备；其附属evidence行仍存旧seed的cleared值，不能用该附属行替代primary审核证明。本次不修复或重写历史数据。
- 前端agent只读确认实际上传产物包含34个视觉样本，构建为visual-fixture、sourceMirrorSha=null；CMS中被排除的是上述教程记录和golden。实际上传产物位于 /tmp/pseo-frontend-deploy-22sqbkh5/site；原始prototype prompt并非最终模板，最终模板还应用了wireframe token edits。本次没有逐条比较最终[data-prompt]文本与CMS prompt.text，更没有反向回填CMS。
- 主任务另行核对GitHub镜像运行状态；本报告只核对CMS发布资格。独立CMS snapshot→GitHub镜像可单独存在，前端目前的视觉样本部署不能用来证明34条已完成CMS审批。

原始脱敏只读收据：/tmp/pseo-prompt-readiness.json。未输出连接串、口令或个人审核身份。
