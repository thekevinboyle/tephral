# Bitwig Studio 6 - UI / Visual Design Brief
Research date: 2026-10-07. Rule applied: nothing invented; "UNDOCUMENTED" marks gaps. Confidence tags: [OFFICIAL] Bitwig docs, [REVIEW] press, [FORUM] KVR/community, [INFER] my inference from the sources.

## 0. Version status
- Bitwig Studio 6.0 released 11 March 2026 (official release notes header: "What's New in Bitwig Studio 6.0 [released 11 March 2026]"). Beta began Aug 2025.
- Bitwig Studio 6.1 is current: official release 26 Aug 2026 per Gearnews (beta -> release). 6.1 is mostly a rebuilt Sampler (Spectral and Fragments play modes, slicing, per-slice modulation), Bell filter, Tuner analyzer. Bitwig's What's New page says 6.1 is "not comprehensive UI overhauls". So the 6.0 UI is the current visual language.
- Tiers/prices (MusicTech, UK): Essentials GBP79, Producer GBP169, full Studio GBP339. Free upgrade for active Upgrade Plan holders.
- Note: Bitwig says its User Guide is "currently being overhauled"; the 6.0 changelog holds all v6 info and the 5.3 manual covers general topics. So device-panel details below come from older (4.x/5.x) manual pages; no v6 change to them is documented.

## 1. What is new in Bitwig 6's UI (vs 5.x)
Headline features (all UI-relevant): Automation Clips, reworked automation editing, Alias Clips, project Key Signature/scale, Spray Can / Audition / Step Input tools, Clip Launcher status displays, Circular Modulations, touch-screen improvements, Group track meta-clips.

Visual changes, with sources:
- Darker greys and gradient fills. SoS: "Backgrounds are a darker grey, and a few visual features like clip loops and automation curves have acquired gradient colour fills, adding a touch of depth." [REVIEW]
- Rounded edges. Secondary summaries (search-engine summaries of MusicTech/Polarity/KVR) say "rounded edges", "modern". The one official source I could read does not use the phrase "rounded"; treat "rounded" as reviewer/user description, not a Bitwig claim. [REVIEW/FORUM, moderate confidence]
- Tool palette. Official: "All available editing tools appear on the right top edge of each panel." 8 tools: Pointer [1], Time Selection [2], Pencil [3], Spray Can [4], Knife [5], Eraser [6], Audition [7], Step Input [8]. Holding the key temporarily switches tool. When the panel is short, only the active tool shows and opens a menu on click. [OFFICIAL]
- Editor Settings: a "control panel" icon in each editor's bottom-right corner opens a menu with snapping, beat grid and Appearance: Dark Grid Lines (default on: black lines; off: white lines), Grid Intensity (opacity, 0 hides), Timeline Background Level (brightness of empty timeline). [OFFICIAL]
- Global tone control: "Right-clicking the top of the application window offers interactive controls for adjusting the Midtone and Black Level used thru out the interface." [OFFICIAL] This is the closest thing to theming in 6.
- Looping clips: light gradient per loop iteration: "Looping clips tint the start of each loop slightly lighter (and the end slightly darker). Non-looping clips are shown in their solid color." [OFFICIAL]
- Clip headers are smaller so content shows at tiny heights; sizes adjustable (Arranger/Launcher Clip Header Size). Mixer channels can be smaller. [OFFICIAL]
- Arranger track headers redesigned: dynamic. They "can flatten to a single line showing essential controls", more controls appear as height grows (volume as numeric dB with integrated vertical meter-fader by default, or horizontal slider; I/O choosers at tallest), names can wrap to multiple lines. Hovering a header shows icons at the bottom of the track's colour stripe: [+] add automation lane, [>] unfold, [v] fold; non-hover shows a blended circle hint when automation is hidden. [OFFICIAL]
- Group tracks: meta clips on the group lane, header colour is "a blend of the present child clips, relative to their lengths"; unfolded group tints child track backgrounds with the group colour. [OFFICIAL]
- Detail Editor Panel now does note + audio + automation editing (dedicated Automation Editor Panel removed). Press [F] to cycle editors. Automation Mode [A] overlays clips in an "x-ray" style with one automation type per track. Flying Automation Lane previews the last-touched parameter. [OFFICIAL]
- Automation state colours: Global Automation Behavior button in transport: Follow = green, Lock = red. [OFFICIAL]
- Alias clips marked by a paperclip icon; pattern chooser in Inspector shows mini-visualisations and use counts; selected pattern has a bright white frame; unique clips show a fingerprint icon. [OFFICIAL]
- Key signature: scale/root menus in transport; piano roll background can "Adapt to Key" (coloured lanes in-key, dark lanes out-of-key) or traditional piano pattern; parameters affected by Use Global Key are "tinted blue" and unused ones disabled. [OFFICIAL]
- Info readout moved into the window title bar (MusicRadar-style reviewer note via MusicTech/other, [REVIEW]). Transport display is centred by default (option). [OFFICIAL]
- Browser previews Curve and Wavetable files visually. Audio waveform painting improved. [OFFICIAL]
- Circular Modulations: phase/pitch-class params wrap instead of clipping; Interactive Help shows a "wrapping modulation annotation" on such ranges. [OFFICIAL]
- Overdub indicator: Launcher clips overdubbing show a white plus (+) where play/record normally is. [OFFICIAL]

## 2. Colour system
### Published / widely cited values (treat as approximate and unverified for v6)
| Item | Value | Source / confidence |
|---|---|---|
| Bitwig orange | #FC790A | KVR theme thread cited via search summary; only one source seen [FORUM, medium] |
| Window background (example theme file) | #2A2A2A | KVR theme-editor thread sample; may be an example/custom theme, not guaranteed default |
| Panel body / Button background | #3A3A3A | same |
| Light text | #E8E8E8 | same; another cited "Medium Light Text" #D0D0D0 |
| Selection | #F2F2F2 | same (selection is a near-white, not orange) |
| Record button | #F75C4C | same |
| Meter normal | #8CCB2A (one thread) vs #5A8F3A (another) | CONFLICT between threads |
| Meter yellow / clipping / hitech | #FFDE42 / #FF0000 / #23D1D4 | one thread |
| Linux default theme example | RGB 0.2314 = ~#3B3B3B grey | KVR (old) |
Theme files exist as hidden/unsupported mechanisms (community "Bitwig Theme Editor" on GitHub claims 4.x, 5.x, 6.x support; its README gives no defaults). Using it can trip Bitwig's anti-piracy detection per the KVR thread. No official published palette or hex list exists. Bitwig 6's darker greys are not hex-documented anywhere I found.

### Modulation colours (official)
- Mono modulation: blue (routing buttons, parameter highlighting). Poly (per-voice) modulation: green. [OFFICIAL user guide]
- While routing: "the button itself begins flashing, all currently assigned destinations become brightly colored, and all potential destinations are shaded." [OFFICIAL]
- Official guide (older edition) also says: the distance from the current value is shown as a live-modulated blue outline [via search summary of guide; moderate].
- CONFLICT: a third-party tutorial (audeobox) says an "orange ring" appears around the parameter showing modulation range. I could not confirm that against official text; official says blue (mono) / green (poly). Do not use orange for mod rings on the basis of that source. Exact ring hexes: UNDOCUMENTED.

### Track / clip palette
- Each track gets a colour at creation; right-click header to change. Since 4.1, palettes exist for tracks, clips, layers; users can add palettes by dragging a PNG/JPG onto the window. Factory palette hexes: UNDOCUMENTED publicly (KVR threads discuss "more colors on the palette" but I found no list).
- Visually (from official descriptions): a saturated colour hue is carried by the track stripe, clip header, and clip body; chrome is neutral grey.

### How colour is used
- SoS (via MusicTech review text): "muted dark grey screen furniture with vibrantly coloured controls and objects". [REVIEW] This is the core principle: neutral chrome, colour only for content (clips, tracks), state (record red, follow green, lock red), and modulation (blue/green).
- Orange is the brand/accent; one KVR user: "The color scheme is fantastic, I don't mind the orange at all"; another asked for "less orange lights... too much colors" (a minority view).

### Themes / light mode
- Bitwig 6 has NO selectable themes. CDM: "But no themes yet! Come on, Bitwig!" [REVIEW]
- Bitwig has been dark-only for years. The Arranger background in 6 is darker by default; users can lighten via Timeline Background Level and Dark Grid Lines. KVR users report liking/disliking the new darker arranger and adjusting it. Midtone and Black Level (right-click window top) are the only global tone controls.
- One search summary claimed "permanent dark theme"; the Bitwig changelog does not say this in those words. Safe statement: dark-only, with brightness sliders, no light mode.

## 3. Typography
- Font: Source Sans Pro is cited in a KVR-era font-merge script (jhorology/bitwig-studio-japanese-font) as the font Bitwig uses. Dated (3.x era); not confirmed for 6. [FORUM, low-medium]
- Sizes: UNDOCUMENTED. Case: UNDOCUMENTED officially; from the manual's naming, parameter and device names are in mixed/title case ("Mix", "Remote Controls", "Dark Grid Lines"). Clip headers' text/size is user-adjustable. [INFER for case]
- Bitwig's marketing site uses Montserrat (visible in release-notes CSS) - this is web branding, not the app.

## 4. Layout conventions [OFFICIAL, user guide "window body"]
- Window = header, body, footer. "The central panel cannot be hidden" - with nothing else enabled it fills the body.
- Secondary panel area sits below the central panel; most secondary panels are vertically resizable (this is where the Device Panel / Detail Editor / Mixer live).
- Access panel area on the RIGHT holds Browser, Project, Output Monitoring, Mappings Browser; horizontally resizable; when unused the central and secondary panels "reclaim the space".
- Inspector Panel is on the LEFT, not resizable (in some display profiles it moves into the right access area).
- Footer: "contains various buttons that determine which parts of Bitwig Studio are visible" plus status messages; content depends on the display profile. The Inspector toggle is the "i" icon. Footer also shows contextual hover info (e.g. Drum Machine cell hover shows the trigger note in the footer).
- Views: Arrange, Mix, Edit (fullscreen Edit View [Shift-Tab]); Display Profiles adapt arrangement to screen size.
- Transport/header across top: tempo, signature, centred transport display, key signature menus, Global Automation Behavior.
- Panels resize by dragging edges and collapse by footer toggles, giving space back to neighbours. Exact pixel sizes/dividers: UNDOCUMENTED.
- Reviewer caveat (MusicRadar/Medium-style comparisons): "additional windows can leave Bitwig's UI feeling a little cluttered at times" on a single monitor; some find Ableton more minimal. Weak sources (blog-level).

## 5. Device and parameter UI (priority section)
### Device in the chain [OFFICIAL, older guide, no v6 change documented]
- "Signal always flows from left (input) to right (output)". Between devices: a narrow column with note indicators, an Add Device button, and audio meters.
- Each device has a vertical header on its left edge with: Device Enable (on/bypass), Device Name (renamable), Remote Controls button (reveals pane), Modulators button (reveals pane). The Mix (wet/dry) parameter is typically in the bottom-right of the device. Some devices have docked/floating expanded views (EQ-5, Spectrum etc.).
- Remote Controls: a pane of 8 knobs per page, paged, each page labelled; the pane toggles open below/beside the device; a wrench icon next to the page name edits pages (KVR). Knobs can be colour-coded when a hardware controller is attached (SoS Bitwig 2: "rainbow colours are to remind me of the parameter order"). A small modulation arrow icon appears above a Remote knob mapped to modulation macro. Replaced the earlier macro system.
- Knob style (arc thickness, readout font size, tick marks): UNDOCUMENTED. Press descriptions: modulation shown as a coloured ring/outline around the knob, larger ring = larger range (dragging the ring adjusts depth).

### Modulator attach and route [OFFICIAL, Unified Modulation System]
1. Click the Modulators button in the device (bottom-left corner of the device per Bitwig learning page) to open the Modulators pane: initially three slots; when all are filled, another three appear.
2. Each slot has an Add Modulator button that opens a browser filtered to modulators only. Slot shows a square with an animated graphic of the modulator's output. Modulators can be dragged between slots.
3. Click the modulator's routing button (dot with arrow). Official text: "Clicking a modulation routing button switches to a mode where you can select as many destinations as you like, each with its own modulation amount." The button flashes; targets turn blue (mono) or green (poly); assigned destinations brighten; non-targets are shaded.
4. "Click the target parameter and drag its value to set the point of maximum modulation." Direction and depth come from the drag (negative amounts allowed; modulation can exceed the parameter range, display is relative).
5. Remove: right-click the routing button, click the x beside the parameter.
- Works for any Bitwig device, third-party plug-ins, and project-level (master track modulators).
### Nested chains [OFFICIAL]
- Many devices contain their own device chains (FX, Pre FX, Wet FX, FB FX; Layers; Drum Machine chains up to 128). The nested chain is shown inline within the parent device and expands/collapses. Visual details (indent, border, collapse chevron shape): UNDOCUMENTED in sources read.
- Devices can be collapsed to a narrow header; exact behaviour not documented in pages I could retrieve.

## 6. Interaction patterns that read as clean [mix of OFFICIAL and INFER]
- Contextual Inspector (left): shows parameters of whatever is selected (clip, note, event, track, or modulation params of a selected device) - so chrome is not duplicated in the main view.
- Progressive disclosure: Remote Controls and Modulators panes are hidden until toggled; track headers gain controls as they grow; tool palette collapses to the active tool when short; automation lanes fold under a hover icon.
- Hover reveals: track-header automation icons, auto-highlight of draggable automation segments (MusicTech: "draggable segments that highlight on hover"), footer status text.
- Consistent widgets: same mod-routing, same Remote knobs, same browser (previewing Curves/Wavetables) everywhere.
- Mode-based feedback: routing mode flashes + colours targets + shades rest; Follow/Lock green/red; blue tint = Global Key active.
- Tool shortcuts 1-8: press = switch, hold = temporary.
- Information density: high but small; headers can compress to one row; clip headers shrink so content is always visible.

## 7. Why it reads "clean" and "easy" (reviewers)
- SoS (Bitwig 6): "muted dark grey screen furniture with vibrantly coloured controls and objects"; visual refresh "improves clarity when editing data".
- SoS (Bitwig 2): modulators in animated squares, "modular synthesizer" aesthetic that is still organised.
- Polarity/MusicTech 6 comparison: Bitwig's devices "clean, modern, and modular"; UI "fresher and more inspiring... sleeker FX UIs" than Live. Counterpoint (comparison blogs): some find Ableton cleaner and Bitwig overwhelming at first; many panels can feel cluttered on one screen. MusicRadar's 6 review headline: "A massive expansion of its abilities as a modulation and automation powerhouse".
- CDM: Bitwig 6 editing "looks as fresh as other tools"; automation mode overlay is distinct from Logic/Live.
- Takeaway [INFER]: cleanliness = neutral dark chrome + colour reserved for meaning + hide-until-needed panes + one consistent mod-routing gesture.

## 8. Legal / copy-risk notes
- Do NOT use: the Bitwig name, logo (the "BW" mark and wordmark), product names ("Remote Controls", "The Grid", "Unified Modulation System", etc. as brand names), icons/glyphs, the exact device-header glyphs, the factory colour palettes, or screenshots/sample themes. I found no published brand-use guidelines (UNDOCUMENTED); assume all rights reserved.
- Source Sans Pro is SIL OFL (free), so font is not a risk, but it is not confirmed for v6; pick your own.
- Safe to borrow (ideas/conventions, not protectable expression): neutral grey chrome + saturated content colour; left inspector / right browser / bottom device chain; footer toggles; routing mode (arm modulator, drag on a target, shaded non-targets); hover-reveal; wet/dry bottom-right; 8-knob paged remote pane; mono-vs-poly colour split.
- Choose own hex values; do not reuse #FC790A as signature orange (it is a colour, not protectable, but identical orange + grey could read as a clone).

## 9. Design guidance for the video-effects instrument (derived, flagged INFER)
- Chrome 3 greys (e.g. window darkest, panel mid, control lightest) with ~1 step between; text near-white at two weights.
- One brand accent (pick non-orange), one modulation hue (blue-ish) for ring/target highlight, red for record, green for follow/active.
- Knob: thin arc, value ring, separate modulation range arc in the mod hue, live-value dot; readout appears on hover/drag.
- Mod routing: modulator "arm" button -> flash; all targets tinted and rest dimmed; drag on target sets depth; right-click to remove; show routings in destination knob ring.
- Chain: left-to-right cards with vertical name rail + bypass; hidden panes for macros (8) and modulators (3-slot grid, grows).
- Panels: left contextual inspector, right library, bottom chain, footer toggles; panels give space back when closed.

## Gaps and conflicts
- No official hex palette; hex values above come from forum posts, with conflicts (meter colours; one sample theme may be custom).
- No documented knob geometry, fonts sizes, or corner radii.
- Rounded edges / dark-only claims are from secondary sources; MusicTech's news article itself does not mention them (verified when fetched).
- MusicRadar full review text could not be retrieved (paywall/nav only); only headline known.
- Orange mod ring (audeobox) conflicts with official blue/green.
- Nested-chain and device collapse visuals not in the pages I could fetch (6.0 user guide is being rewritten).

## Sources
- Bitwig 6.0 release notes (HTML): https://downloads.bitwig.com/6.0/Release-Notes-6.0.html
- Bitwig What's New: https://www.bitwig.com/whats-new/
- Unified Modulation System: https://www.bitwig.com/userguide/latest/the_unified_modulation_system/
- Window body: https://www.bitwig.com/userguide/latest/the_window_body/
- Meet Inspector Panel: https://www.bitwig.com/userguide/latest/meet_inspector_panel/
- Device Panel (4.4 guide): https://www.bitwig.com/userguide/bws44-504/the_device_panel/
- Advanced device concepts (nesting): https://www.bitwig.com/userguide/latest/advanced_device_concepts/
- Intro to Modulators: https://www.bitwig.com/learnings/an-introduction-to-modulators-45/
- Sound on Sound Bitwig 6 review: https://www.soundonsound.com/reviews/bitwig-studio-6
- SoS Bitwig 2 review: https://www.soundonsound.com/reviews/bitwig-studio-2
- SoS beta news: https://www.soundonsound.com/news/bitwig-studio-6-beta-now-live
- MusicRadar review: https://www.musicradar.com/music-tech/daws/bitwig-studio-6-review
- MusicTech first look: https://musictech.com/news/bitwig-studio-6-first-look-new-features/
- MusicTech launch: https://musictech.com/news/gear/bitwig-studio-6/
- MusicTech vs Live 12: https://musictech.com/guides/buyers-guide/bitwig-studio-6-vs-ableton-live-12-which-daw-should-you-choose/
- CDM details: https://cdm.link/bitwig-studio-6-details/
- CDM out of beta: https://cdm.link/bitwig-studio-6-is-out-of-beta-and-the-workflow-update-is-worth-the-wait/
- Gearnews 6.1: https://www.gearnews.com/bitwig-studio-6-studio/
- Synthtopia: https://www.synthtopia.com/content/2026/03/11/bitwig-studio-6-now-available/
- Dubspot: https://blog.dubspot.com/bitwig-studio-6
- Polarity overview: https://polarity.me/posts/polarity-music/2025-08-29-bitwig-6-all-new-features-overview/
- KVR Bitwig 6 thread p15: https://www.kvraudio.com/forum/viewtopic.php?p=9123628
- KVR theme editor thread: https://www.kvraudio.com/forum/viewtopic.php?t=611222
- KVR skin thread: https://www.kvraudio.com/forum/viewtopic.php?t=473588
- KVR GUI colour thread: https://www.kvraudio.com/forum/viewtopic.php?t=423760
- Bitwig theme editor: https://github.com/Berikai/bitwig-theme-editor
- Font script: https://github.com/jhorology/bitwig-studio-japanese-font
- Audeobox (low authority): https://www.audeobox.com/learn/bitwig/modulators-system-guide/
