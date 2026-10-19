# Original X Article covers — 2026-10-19

Owner request: fetch original post covers for all 105 existing X Article cases and replace the beta website's typographic covers.

95 source articles have `cover_media`; 10 return no original cover and retain the existing text poster. The exact tweet ID and original article title were checked against the existing case snapshot for all 105 responses. No article text, captured metrics, author attribution, rights status or CMS state was changed.

Acquisition used the installed twitter-cli client and its existing authenticated `TweetResultByRestId` article request, capturing the response before the CLI parser drops the cover field. Original images come only from `article.article_results.result.cover_media.media_info.original_img_url` on `pbs.twimg.com`. Raw responses remain local at `~/.agent-reach/research/x-article-covers-2026-10-19/raw/`; no authentication material is included.

`manifest.json` maps each case to its source URL and original image, dimensions, byte count and SHA-256, or to an observed `no_cover` result. Public assets are in `frontend/public/x-article-covers/` and the display manifest is `frontend/src/data/x-article-covers.json`. Export gates validate complete classification, paths and hashes; static checks verify original images on both locale galleries, author pages and details. Cards use `object-fit: contain`; details retain the natural image ratio.

Independent code review found no important correctness or security issues. Final build, static and live validation are recorded separately in frontend evidence.
