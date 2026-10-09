# お布団巻き is watching you: night window

## Scene

The owner checks their phone late at night beside an open computer; a bright illustrated window in a quiet ink-colored room lets them and invited visitors glance at today's activity.

## Visual direction

A circular Monitoring-inspired cover with an extreme fisheye eye close-up, silver hair, black glasses and cat-ear cap, surrounded by vivid pink/yellow graphic ribbons, hearts and cartoon eyes. Use `monitoring-juan-cover.png`; it replaces the earlier rainy-corridor portrait. Pair it with large condensed title, tiny warm signal lights, and editorial paper-like statistics below. Full palette strategy: indigo ink, chalk lavender, ice blue, sulfur yellow, occasional raspberry. The theme is character-led, not a technical control panel.

## Character reference

The user's three supplied sheets in `design/reference-sheets/` are the primary visual reference, superseding the earlier small model-showcase thumbnail. The main outfit follows `juan-costume-design.jpg` and `juan-costume-render.jpg`: black cat-ear cap with blue/lavender buttons and silver rings, silvery bob and low twin braids, thick dark glasses, blue eyes, oversized silver-gray jacket with black four-point star pins, blue fish armband and safety-pin detail, black zipped high collar with a circular pull. No bow tie. The first sheet supplies the soft, slightly sleepy expression; its pajamas are an alternative outfit, not combined with the gray jacket. For full-body and chibi art, retain the cat-ear tips and fish armband. The cover instead prioritizes a very tight face crop, matching the Monitoring reference. Source sheets are design references only and are not deployed as website assets.

## Typography

Keep the existing large site title, section headings and large chart percentages. Small copy uses self-hosted LXGW WenKai Screen, with normal weight and darker secondary ink. Activity descriptions are 18px on desktop and 17px on mobile; supporting data, buttons, times and chart axes are generally 14–16px. Keep comfortable line spacing and tabular numerals. Font subsets and both licences are retained in client/src/fonts/wenkai; no external font CDN is required. No decorative English signature beside the statistics.

## Composition

The page is a viewport-sized app with two persistent scenes, 此刻 and 今天, switched through the centered header control. Preserve the cover, palette, typography and funny activity copy. The live scene keeps the hero and device rail in one screen. The Today scene has 概览, 软件, 回放 and 健康 panels instead of a stacked long page. Overview contains the deduplicated total, day ribbons and hourly chart. App and hour selection opens filtered replay. Replay uses adaptive pagination fitted to the available height, with always-visible page controls. Only exceptionally long detail content scrolls inside its panel; there is no long document scroll. Scene changes preserve dates, devices, filters and pagination. Nickname stays read-only and is configured through the Android companion. No outgoing links, deployment material or footer navigation.

## Motion

A short compositor-friendly eyelid shutter closes in 100 ms and opens in 180 ms, settling within 320 ms. Page content does not zoom or fade behind it. Both scenes retain their layout; inactive content is hidden and inert. Memoized statistics and portrait components avoid redrawing on each transition phase. Shared clock formatters and stable timeline keys keep routine data refreshes light. Detail panels use a brief 160 ms reveal. Navigation remains usable during transitions; rapid changes settle on the latest choice. Header scene controls and the effects switch show icons only, with accessible labels and hover titles. Scene controls support arrow keys and browser back/forward. Vertical mouse-wheel and trackpad gestures turn one scene at a time; momentum is consumed until the gesture ends. Scrollable detail content keeps its own scrolling, with a fresh gesture required at its boundary. Page Up and Page Down also work without taking over input fields or browser zoom. Turning off effects or requesting reduced motion switches scenes immediately. Pointer parallax updates at most once per animation frame. Easter-egg images preload once. Keep the lens movement, orbiting highlights and small floating stars. Pie sectors unfold when the chart enters view; selecting one moves it outward and filters the activity feed without navigation. Its decorative orbit pauses offscreen. Effects can be disabled and respect reduced motion. Static content and controls are never blocked by entrance motion.

Touch navigation uses passive single-finger tracking: swipe upward to Today and downward to Now, committing one page turn on release. Snapshot native scroll availability at touch start so a list keeps its whole gesture; a fresh gesture at the boundary can turn a page. Leave taps, horizontal gestures, pinch zoom, zoomed-page panning, selection and form controls to the browser. Suppress a swipe-generated click on its original target. Prevent vertical overscroll from starting browser pull-to-refresh. No touch-action restriction is applied to the page or nested lists.

## Small Juan surprises

The transparent 5-by-2 sprite atlas contains ten poses matching the user's character sheets. The fish-hug outcome uses the standalone transparent `juan-chibi-shark.png`, redrawn with the blue shark plush from the supplied aquarium illustration: rounded head, dark bead eye, pale belly and little zigzag teeth. The other nine poses continue to use the original atlas. The ten outcomes are a ledge peek, left peek, right peek, binoculars, blanket roll, fish hug, wave, hiding under the hat, being caught and shushing. A shuffled deck plays all ten before repeating, with no repeat at the deck boundary. The eye logo, title star, portrait, portrait stamp, pie star and replay fish are deliberate discovery points. Some normal chart/device/date interactions may trigger an occasional guest. Never replace their original action.

One guest at a time, 2.8-second lifetime, no pointer interception or sound. Escape, hiding the page, resizing or turning off effects removes the guest. Utility interactions have a lower probability and longer cooldown. Honour reduced motion. Keep discovery instructions and counters off the page.

## Copy

Feature headings and labels stay short. Preserve original humorous activity descriptions (including 喵~) in live status, connected devices, the pie readout and activity replay. Time phrases are also playful: 午后冒泡喵, 溜达了2分钟喵, 窝了54分钟喵. Keep start/end times visible and exact duration available; tiny sessions show seconds instead of a vague duration alone. No made-up character quotes, song lyrics or explanatory feature subtitles. No ornamental numbering, numbered introductions, decorative live clock/signal labels, portrait captions or repeated character name around the artwork. Keep the portrait eye button as an icon-only easter-egg trigger.

## Sources

- Character profile and self-published model art: https://space.bilibili.com/19206492
- Official Monitoring PV: https://www.bilibili.com/video/BV1qDUPYKEzf/
- Keep references and attribution in the repository documentation, not as outgoing links or footer copy on the website. Generated artwork is this site's fan-theme illustration, not official artwork.

Cover reference: DECO*27 official Monitoring video https://www.youtube.com/watch?v=kbNdx0yqbZE and https://otoiro.co.jp/topics/104605/ . The source cover is a design reference, not a bundled website asset. The replacement is generated character-theme artwork without lettering.

## Time calculation

## Playback

Keep live playback separate from the foreground application. A compact row above the device rail lists each reporting device's song or video, source app and artist/creator. Normalize Android package IDs as well as desktop labels; classify music and video separately. Device selection does not hide another device's playback. Offline, stale or cleared metadata disappears. Browser video compatibility only extracts titles with an identified media-site suffix, while general page titles, document names and local file paths stay hidden. On small screens the artwork makes room for playback; exceptionally long playback lists scroll inside their own area. Never auto-play sound or video.

Daily total and hourly activity merge confirmed active intervals across the selected devices. Overlap counts once, idle is excluded, unknown gaps remain empty, and ongoing sessions stop at the last confirmed heartbeat. Per-app durations also merge simultaneous use of the same app across devices. Different apps retain their own observed durations; the app pie compares those app durations and is not an exclusive partition of the deduplicated daily total. Device ribbons preserve the original per-device events. Replay defaults to compact sessions and has a 细分记录 switch for the original fragments.

## Replay grouping

Group only the same device, app ID, mapped app name and local day. A return gap must be at most two minutes, and confirmed app use must occupy at least 80% of the proposed group span. Read the unfiltered device timeline to reject idle boundaries and unobserved gaps longer than two seconds, even when the app/hour filter hides the intervening records. Keep other applications as their own records. Group duration is the union of its actual constituent intervals; never charge the interruption. Daily totals, app statistics, hourly charts and day ribbons use the original intervals unchanged.

Merged rows display their overall time range, a compact fragment-count tag and cumulative actual duration. Fine-grained mode restores the source rows. Short standalone intervals show seconds so crossing a minute boundary does not imply a full minute of activity.

## Activity categories and reaction stickers

Classify public app identities into work, game, entertainment, study, browse, social, tools and other. The live scene adds a compact reaction strip with one chibi sticker, a category label and one conversational meme caption. Keep the Monitoring cover and all original per-app activity descriptions. The category follows the same selected device as the live status. Offline, idle, loading and connection errors use the simple shrugging pose and never infer work or sleep. Device rows and replay entries carry small category badges.

Eight independent transparent images named `juan-mood-<category>.png` cover typing furiously with tiny flames, gaming, popcorn and video, studying, browsing, phone chatting, repairing with a wrench and gear, and shrugging in confusion. Every category has its own image. Their visual reference is the user's GIF, inspected across all ten frames, especially the front-facing open-eye frames: light animation-style outlines, simplified pale flat colors, clearly visible rounded pale-blue eyes with the original small upper-edge highlight, fine rectangular glasses and relaxed brows. Per the user's final approved sample, these eight reaction illustrations have no hats or animal ears; this does not change the existing cover or older easter eggs. Do not add separate large dark pupils or fierce angled eyebrows. Avoid the rejected densely shaded anime-painting treatment. These are static reaction stickers; no animation of the source GIF is bundled. Captions are HTML text for readability, accessibility and easy editing. They are site-written meme copy, not quotations attributed to the character's creator. Work uses the user's supplied “妹妹，我不是闲人，我也要工作。” No looping animation is added; the text has a short state-change reveal, respecting the effects switch and reduced motion.

The Today overview has a segmented category meter. Each label opens the matching replay; changing the date/device or clearing filters resets the category filter. Classify from app name/package/executable only, never from private titles or browser URLs. Unrecognized apps remain other. Deployment overrides live in `deployment/app-categories.json`; there is no website editor.

Category time partitions the union of confirmed active intervals. At each overlapping interval, divide time equally among the distinct active categories. Multiple devices in the same category do not increase its weight. Exclude idle and unobserved gaps. Category totals therefore sum to the same deduplicated daily total. Existing per-app statistics and exact replay durations remain unchanged.
