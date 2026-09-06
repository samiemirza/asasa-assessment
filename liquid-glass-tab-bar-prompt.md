# Prompt: reproduce the CookRight liquid-glass tab bar in another app

Paste everything below this line into a fresh Claude Code session inside the
target app. Part 1 is the instruction, Part 2 is the original specification
that produced the effect, Part 3 is the finished reference implementation.
The agent should port Part 3 and use Parts 1 and 2 to judge the result.

---

## Part 1 — Instruction

Implement a floating liquid-glass bottom tab bar in this app that behaves
exactly like the reference implementation in Part 3. The reference is the
source of truth: port it, do not reinterpret it. Read Part 2 only to
understand the intent behind each piece and to run the acceptance criteria.

### What stays from this app, what comes from the reference

Keep this app's tabs, routes, icons, screens, theme and business logic. Do
not redesign navigation. The only things you adapt in the reference files:

- `ICONS` in tab-bar.tsx: this app's route names mapped to its icon set
  (filled variant when focused, outline variant otherwise; any icon library
  works as long as both variants exist).
- `HIDDEN_ROUTE_PARENT`: routes that live inside the tab navigator but are
  not on the bar (flow screens, detail screens) mapped to the tab that
  should stay highlighted while they are focused.
- Theme hooks and tokens: replace `useAppTheme`, `@cookright/brand` and
  `strings` with this app's equivalents. The values that matter are listed
  under "Numbers and colors" and must be carried over unchanged.
- Haptics: `selectFeedback` is a guarded `Haptics.selectionAsync()`.

Everything else in the reference files, in particular every number in
tab-bar-motion.ts and every worklet in tab-bar-scroll.tsx, is copied as is.

### Stack requirements

Verify before writing code. The reference was built and tuned on:

- Expo SDK 57 with expo-router `Tabs` (custom `tabBar` prop)
- react-native-reanimated 4.5 and react-native-worklets 0.10 (Reanimated 4
  needs the worklets package; Reanimated 3 also works with the same code)
- expo-glass-effect (iOS 26+ native Liquid Glass), expo-blur (fallback),
  expo-haptics, react-native-safe-area-context 5, @expo/vector-icons

expo-glass-effect, expo-blur and expo-haptics are native modules: this needs
a development build or a prebuild, not Expo Go. After adding them run the
native build once before judging anything visually.

### Wiring, in order

1. Add the five reference files: `components/glass-surface.tsx`,
   `components/tab-bar.tsx`, `components/tab-bar-indicator.tsx`,
   `lib/tab-bar-scroll.tsx`, `lib/tab-bar-motion.ts`, plus the
   `native-caps.ts` probes they import.
2. In the tabs layout: wrap `<Tabs>` in `<TabBarScrollProvider>` and pass
   `tabBar={(props) => <GlassTabBar {...props} />}`. Set `headerShown: false`.
   Use `lazy: false` and `freezeOnBlur: true` so switching tabs never mounts
   a screen mid-animation. Any flow or detail screen that must keep the bar
   visible is declared inside this navigator with `href: null` (and
   `lazy: true`), never in the root stack.
3. Every tab screen scrolls in an `Animated.ScrollView` (from Reanimated)
   whose `onScroll` is the handler from `useTabBarScrollReporter()` with
   `scrollEventThrottle={16}`. One shared screen wrapper is the right place
   for this (see screen.tsx in the reference). Content gets 92pt of bottom
   padding so the last items clear the bar while still scrolling behind it.
4. Wrap the app in `SafeAreaProvider initialMetrics={initialWindowMetrics}`
   so insets are right on the first frame; without it the bar visibly jumps
   into place after launch.
5. Do not add a tab bar background, border or `tabBarStyle` from the
   navigator; the custom component owns all of it.

### Numbers and colors that define the look

Bar: expanded 62pt high at 93% of window width, compact 53pt at 90% of the
expanded width; row padding 8 expanded, 6 compact; icons 24pt scaling to
0.9 in compact. Pill: 46pt expanded, 40pt compact, inset 4pt from its slot.
Corner radius is 999 on both (React Native clamps to a capsule), so radii
never animate. Scroll: dead zone 0.5pt per frame, contract after 14pt of
accumulated downward travel, expand after 10pt upward, always expanded at
offset 4 or less, relax open when momentum ends within 48pt of the top.
Springs: bar stiffness 260 / damping 24 / mass 0.8; pill 300 / 22 / 0.75.
Pill stretch on travel: 0.07 for one tab plus 0.03 per extra tab, capped at
0.16, with vertical squash 0.2 of the stretch. Bar placement: bottom offset
equals the side margin on iOS (floats over the home indicator); on Android
it is the larger of the bottom inset and the side margin.

Colors: pill fill `rgba(110,105,120,0.18)` on light, `rgba(235,235,245,0.14)`
on dark. Glass fallback fill `rgba(255,255,255,0.6)` with stroke
`rgba(255,255,255,0.45)` on light; `rgba(26,21,38,0.52)` and
`rgba(255,255,255,0.1)` on dark; blur intensity 50, tint matching the
scheme. Shadow: color `#120F1A`, opacity 0.1, radius 24, offset y 8,
elevation 8. Active icon uses the primary text color, inactive the muted
text color.

### Hard-won rules (each one cost a round of fixes the first time)

- Never import `expo-glass-effect` at module scope. Probe the native module
  with `requireOptionalNativeModule('ExpoGlassEffect')`, `require` it only
  when present, and use it only when `Platform.OS === 'ios'` and
  `isLiquidGlassAvailable()` is true. A stale dev client or Android must
  land on the BlurView fallback, never on an "unimplemented component" box.
- Never animate opacity on the GlassView or its parent. The parent animates
  width and height; the glass fills it.
- The bar renders only routes that have an icon; a focused hidden route
  highlights its parent tab, and tapping that parent from the hidden route
  still navigates (compare against the truly focused route, not the
  highlighted one).
- Landing on a tab calls `expand()` so the bar always relaxes open on a
  fresh screen.
- Reduce Motion swaps springs for 120 to 150ms timings and drops the pill
  deformation. Reduce Transparency swaps the glass for a solid raised
  surface (Liquid Glass handles this itself).
- On Android expo-blur does not blur unless a `blurMethod` is set; the
  fallback is a translucent tint. That is accepted; do not fake it with
  stacked views.
- Touch targets stay at least 44pt in compact: the Pressable fills the
  slot and carries vertical hitSlop; only the icon scales.

### Done means

All sixteen acceptance criteria in Part 2 section 16 pass on a physical iOS
26 device (native glass) and on one iOS or Android device without it
(fallback), with identical motion on both. No routing change, no dropped
frames while scrolling, no first-frame jump on launch.

---

## Part 2 — Original specification (verbatim)

I want you to replace/refactor the existing bottom navigation bar so that its interaction and visual behavior closely matches the attached reference video.

IMPORTANT:
Do not redesign the navigation structure, routing, destinations, or existing business logic. Only change the visual component and animation behavior.

The target effect has THREE independent systems:

1. NATIVE GLASS SURFACE
2. SCROLL-RESPONSIVE COMPACT/EXPANDED NAV BAR
3. FLUID SPRING-ANIMATED SELECTED TAB INDICATOR

First inspect the existing project, navigation implementation, Expo/React Native version, Reanimated version, and the scroll containers used by each tab. Then implement the feature using the project's existing architecture rather than building a parallel navigation system.

--------------------------------------------------
1. NAVIGATION BAR VISUAL DESIGN
--------------------------------------------------

Create a floating rounded capsule navigation bar positioned above the bottom safe-area.

It should NOT look like a flat translucent white rectangle.

Target appearance:
- floating pill/capsule
- highly rounded radius: radius = approximately half the bar height
- real backdrop translucency/blur
- content behind the navigation should visibly influence the glass
- subtle white inner edge/highlight
- extremely soft shadow underneath
- no hard border
- icons remain high contrast and crisp
- navigation should work over white, colorful and dark content

On iOS 26+, if this project supports it, prefer:

    expo-glass-effect
    GlassView
    GlassContainer

Use:
    npx expo install expo-glass-effect

Prefer the native glass effect rather than trying to fake Liquid Glass entirely using rgba().

Check:
    isGlassEffectAPIAvailable()
    isLiquidGlassAvailable()

For unsupported iOS versions / Android:
use an appropriate BlurView + translucent surface fallback while preserving the exact same layout and animations.

Do NOT animate opacity directly on GlassView or its parent, because this can break the native glass rendering. Animate dimensions/transforms instead.

Approximate expanded dimensions:

bar horizontal margin: 16-22
bar height: 60-64
bar radius: height / 2
internal horizontal padding: 6-10

Do not hard-code based on one screen width. Calculate the available width.

The outer bar should use approximately 92-94% of the available width in expanded mode.

--------------------------------------------------
2. COMPACT / EXPANDED SCROLL BEHAVIOR
--------------------------------------------------

The reference navigation slightly SHRINKS while the user is actively scrolling downward.

It does not hide.

Implement two states:

EXPANDED:
- width: 100% of configured nav width
- height: ~62
- icon size: ~24
- normal item spacing
- selected pill normal size

COMPACT:
- approximately 88-92% of expanded width
- height: ~52-55
- icons approximately 21-22
- tighter tab spacing
- selected pill becomes proportionally smaller

The bar must stay horizontally centered while shrinking.

Do not simply use:
    scale: 0.9

That makes the entire surface/icons look artificially scaled.

Instead animate:
- container width
- container height
- internal horizontal padding
- tab slot width if necessary
- selected pill width/height
- icon scale very subtly

This should feel like the layout compresses rather than like a screenshot was zoomed out.

Use react-native-reanimated.

All animation should stay on the UI thread.

Create a shared value such as:

    compactProgress

where:
    0 = fully expanded
    1 = compact

Animate compactProgress using withSpring().

Suggested initial spring values:
    stiffness: 260
    damping: 24
    mass: 0.8

Tune after testing against the reference.

--------------------------------------------------
3. DETECTING SCROLL DIRECTION
--------------------------------------------------

Do not drive the animation directly from absolute scrollY.

Use scroll direction + accumulated movement + hysteresis.

Track:
    currentY
    previousY
    deltaY
    accumulated downward distance
    accumulated upward distance

Desired behavior:

At top of screen:
    always expanded

Scrolling downward:
    after roughly 10-16px of meaningful accumulated downward movement,
    transition to COMPACT

Scrolling upward:
    after roughly 8-12px of meaningful upward movement,
    immediately transition toward EXPANDED

When scrolling ends / momentum ends:
    allow it to return to expanded unless there is a strong reason to remain compact

There must be a deadzone so tiny scroll noise does not constantly toggle the state.

Example conceptual logic:

if scrollY <= 4:
    expanded

else if downward movement exceeds threshold:
    compact

else if upward movement exceeds threshold:
    expanded

Do NOT repeatedly call React setState from onScroll.

Use Reanimated shared values / animated scroll handlers.

The transition should feel slightly elastic rather than linear.

--------------------------------------------------
4. SELECTED TAB PILL
--------------------------------------------------

The selected-tab background is a separate rounded capsule inside the navigation bar.

It should NOT simply fade between tabs.

There should be ONE animated indicator that physically moves between tab positions.

Structure conceptually:

FloatingGlassTabBar
    Glass background
    AnimatedSelectionPill
    Tab icon
    Tab icon
    Tab icon
    Tab icon
    Profile/avatar

The indicator should be absolutely positioned behind the icons.

Calculate its target X from:
    selected tab index
    available bar width
    internal padding
    number of tabs

Do not use magic X coordinates.

--------------------------------------------------
5. FLUID / LIQUID PILL MOVEMENT
--------------------------------------------------

This is a major part of the reference.

When changing tabs, the selected capsule should:

1. start moving toward the new tab
2. stretch slightly horizontally while moving
3. optionally compress vertically by a tiny amount
4. overshoot very slightly
5. settle back to its normal rounded capsule dimensions

The effect should be subtle.

It should NOT look like jelly, rubber or a cartoon bounce.

Suggested behavior:

rest:
    scaleX = 1
    scaleY = 1

during movement:
    scaleX ≈ 1.08 - 1.18
    scaleY ≈ 0.96 - 0.98

settle:
    spring back to 1

The amount of horizontal stretch should preferably depend on indicator velocity.

Fast movement across several tabs:
    more stretch

Moving one adjacent tab:
    less stretch

Example idea:

stretch =
    clamp(abs(indicatorVelocity) * factor, 0, 0.16)

scaleX = 1 + stretch
scaleY = 1 - stretch * 0.2

Do not allow scaleX to exceed approximately 1.18-1.2.

The visual should feel as though the leading edge of the glass pill pulls toward the destination before the rear catches up.

If velocity-derived deformation becomes overly complex or unstable, use:
    withSequence(
        withTiming(1.12, { duration: 80 }),
        withSpring(1, ...)
    )

for scaleX while position itself uses withSpring().

Position spring starting point:

stiffness: 300
damping: 22
mass: 0.75

Tune from there.

--------------------------------------------------
6. SELECTED PILL APPEARANCE
--------------------------------------------------

The selected item in the video uses a slightly darker translucent glass/gray surface.

It should look embedded in / interacting with the outer glass rather than like a solid gray button.

Approximate appearance:

light mode:
    rgba(120,120,120,0.16-0.22)

dark mode:
    translucent light gray / material appropriate for dark glass

If GlassContainer can produce the proper interaction between the outer glass surface and selected pill, use it.

GlassContainer's spacing should be tuned so the surfaces visually influence/merge with each other without turning into one undefined blob.

Try a spacing around:
    8-14

but test visually.

Selected pill:
    height ≈ 44-48 expanded
    radius ≈ height / 2

Compact:
    height ≈ 38-42

Do not add a visible hard stroke around the selected pill.

--------------------------------------------------
7. ICON TRANSITION
--------------------------------------------------

Selected tab:
- selected/filled variant of icon when available
- slightly stronger visual weight
- no excessive scale animation

Unselected:
- outline version

When switching:
- icon state can change around the midpoint of the pill transition
- optionally animate scale:
      1 -> 0.94 -> 1
  very quickly
- avoid bouncing icons independently

The pill should provide most of the motion.

Profile/avatar tab:
- preserve the actual circular avatar
- selected state should be the glass pill behind the avatar
- preserve notification/status dot behavior if already present

--------------------------------------------------
8. POSITIONING
--------------------------------------------------

The bar should remain a floating overlay.

Use safe area bottom inset.

Approximate positioning:

bottom:
    safeArea.bottom + 8 to 14

Do not let changing bar height move its center excessively.

The compact animation should look like the bar contracts around its center.

Use absolute positioning and keep zIndex/elevation high enough that scroll content travels BEHIND the glass surface.

Do not place an opaque footer underneath it.

The visual effect depends on content actually passing under the navigation bar.

Ensure each ScrollView / FlatList has enough bottom content inset/padding so content remains usable behind the floating bar.

--------------------------------------------------
9. SHADOW / EDGE DETAIL
--------------------------------------------------

Keep this subtle.

Target:
- tiny bright glass rim
- soft ambient shadow
- no Material-style strong elevation shadow

Something roughly equivalent to:

border:
    white at ~0.18-0.35 alpha

shadow:
    offsetY around 6-10
    radius around 20-30
    very low opacity

Treat these only as starting values.

Native glass should provide most of the visual depth.

--------------------------------------------------
10. DARK/LIGHT BACKGROUND ADAPTATION
--------------------------------------------------

The reference becomes darker automatically when displayed over dark content.

Do not manually swap the whole navigation to solid black based on the screen.

Let native material / backdrop glass handle this where supported.

The bar should work over:
- white feed
- photos
- colored cards
- video
- dark content

Test against all four.

--------------------------------------------------
11. PERFORMANCE
--------------------------------------------------

This needs to remain 60/120fps.

Avoid:
- React state updates every scroll frame
- layout measurement every frame
- JS-thread scroll calculations
- repeatedly mounting/unmounting GlassView
- huge blur regions
- unnecessary rerenders of tab screens

Use:
- Reanimated shared values
- useAnimatedScrollHandler
- useAnimatedStyle
- interpolate / interpolateColor if required
- withSpring
- useDerivedValue where appropriate

--------------------------------------------------
12. ARCHITECTURE
--------------------------------------------------

Prefer separating the implementation approximately as:

components/
    FloatingGlassTabBar.tsx
    AnimatedTabIndicator.tsx
    GlassSurface.tsx

hooks/
    useTabBarScrollBehavior.ts

Do not force these exact filenames if the project's current architecture has a more appropriate location.

The important requirement is that visual presentation, scroll behavior and selected-tab animation are not tangled into one monolithic component.

--------------------------------------------------
13. MULTIPLE TAB SCROLL VIEWS
--------------------------------------------------

The shrinking behavior must work consistently regardless of which tab is selected.

Inspect whether the screens use:
- ScrollView
- Animated.ScrollView
- FlatList
- Animated.FlatList
- FlashList

Create one reusable mechanism for reporting scroll movement to the tab bar.

Do not duplicate animation logic separately inside every screen.

When switching to a new tab:
- indicator moves fluidly
- bar should settle into expanded state unless the new screen is actively scrolling
- there should be no one-frame jump in bar dimensions

--------------------------------------------------
14. ACCESSIBILITY
--------------------------------------------------

Respect Reduce Motion:
- remove/stretch deformation
- use shorter/simple transitions

Respect Reduce Transparency:
- provide a more opaque fallback surface.

Do not compromise touch target sizes even when the visual bar becomes compact.
The visual icon may shrink, but the Pressable hitSlop / interaction target should remain at least approximately 44x44.

--------------------------------------------------
15. FALLBACK
--------------------------------------------------

If native Liquid Glass is unavailable:

Create a fallback with:
- BlurView
- semi-transparent material overlay
- subtle border/highlight
- same Reanimated motion

The animations must be identical across platforms even if the optical glass fidelity differs.

--------------------------------------------------
16. ACCEPTANCE CRITERIA
--------------------------------------------------

I should be able to verify the following:

A. At rest:
   the bottom bar is wide and relaxed.

B. Scroll down:
   after a small threshold it smoothly contracts.

C. Continue scrolling:
   it remains compact and stable; no jitter.

D. Scroll upward:
   it quickly and smoothly returns to full size.

E. Release scrolling:
   it settles naturally.

F. Tap another tab:
   one selected pill physically travels from the old tab to the new tab.

G. During pill movement:
   the capsule subtly elongates in the direction of travel and settles back.

H. The glass visibly responds to content passing behind it.

I. There are no dropped frames or navigation rerenders.

J. Existing navigation/routing behavior remains unchanged.

Once implemented, expose the important tuning constants in one object so we can visually tune the effect without digging through component code:

const TAB_BAR_MOTION = {
  expandedHeight: ...,
  compactHeight: ...,
  expandedWidthRatio: ...,
  compactWidthRatio: ...,
  downwardThreshold: ...,
  upwardThreshold: ...,
  barSpring: {...},
  indicatorSpring: {...},
  maxIndicatorStretch: ...,
  bottomGap: ...,
};

Do not stop at a rough approximation. Compare the resulting interaction against the supplied reference and tune the motion until the transitions feel similarly restrained, fluid and physical.


---

## Part 3 — Reference implementation

Expo SDK 57, Reanimated 4.5.1, worklets 0.10.1, expo-glass-effect 57.0.1, expo-blur 57.0.2, safe-area-context 5.7. Files are verbatim from CookRight (`apps/mobile`).

### `lib/tab-bar-motion.ts`

```ts
/**
 * Every tuning knob for the floating glass tab bar in one place: geometry of
 * the expanded/compact states, the scroll thresholds that flip between them,
 * and the springs that carry the bar and the selection pill. Visual tuning
 * happens here, not inside the components.
 *
 * Geometry rules the components rely on:
 * - the bar and pill are true capsules — corner radius is always height / 2
 *   (via `radius.pill`, which React Native clamps to the capsule radius), so
 *   radii never need to animate;
 * - compact never drops the bar below 44pt, so touch targets survive intact.
 */
export const TAB_BAR_MOTION = {
  /* bar geometry */
  expandedHeight: 62,
  compactHeight: 53,
  /** Expanded bar width as a fraction of the window width. */
  expandedWidthRatio: 0.93,
  /** Compact bar width as a fraction of the *expanded* width. */
  compactWidthRatio: 0.9,
  /** Row padding between the bar edge and the first/last tab slot. */
  expandedPadding: 8,
  compactPadding: 6,
  iconSize: 24,
  /** Icons shrink only a touch — the layout does the compressing. */
  compactIconScale: 0.9,

  /* selection pill */
  pillHeightExpanded: 46,
  pillHeightCompact: 40,
  /** Horizontal gap between the pill and its tab slot's edges. */
  pillInset: 4,

  /* scroll behaviour */
  /** At or above this offset the bar is always expanded. */
  topZone: 4,
  /** Momentum ending inside this zone relaxes the bar back open. */
  restExpandZone: 48,
  /** Per-frame movement below this is sensor noise; ignored entirely. */
  scrollDeadzone: 0.5,
  /** Accumulated downward travel before the bar contracts. */
  downwardThreshold: 14,
  /** Accumulated upward travel before the bar relaxes open. */
  upwardThreshold: 10,

  /* motion */
  barSpring: { stiffness: 260, damping: 24, mass: 0.8 },
  indicatorSpring: { stiffness: 300, damping: 22, mass: 0.75 },
  /** Cap on the pill's horizontal stretch while travelling (scaleX − 1). */
  maxIndicatorStretch: 0.16,
  /** Stretch for a one-tab hop; each extra tab of travel adds `stretchPerTab`. */
  stretchBase: 0.07,
  stretchPerTab: 0.03,
  /** Vertical squash as a fraction of the horizontal stretch. */
  verticalSquash: 0.2,

  /* placement: the bar sits the same distance from the screen bottom as
     from the sides — computed from expandedWidthRatio in the tab bar (on
     Android, lifted above system navigation when that needs more). */
} as const;

```

### `lib/native-caps.ts`

```ts
/**
 * Native-capability probes. The Ember chrome leans on three native modules
 * (gradient, blur, haptics) that only exist after a native rebuild. A stale
 * dev client or Expo Go must degrade to solid fills — never render React
 * Native's "Unimplemented component" placeholder blocks.
 *
 * `requireOptionalNativeModule` returns null instead of throwing when the
 * module isn't in the running binary.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

export const hasNativeGradient = requireOptionalNativeModule('ExpoLinearGradient') != null;
export const hasNativeGlassEffect = requireOptionalNativeModule('ExpoGlassEffect') != null;
export const hasNativeBlur = requireOptionalNativeModule('ExpoBlur') != null;
export const hasNativeHaptics = requireOptionalNativeModule('ExpoHaptics') != null;
export const hasNativeSpeech = requireOptionalNativeModule('ExpoSpeech') != null;
export const hasNativeAudio = requireOptionalNativeModule('ExpoAudio') != null;

/** The pantry camera needs both halves — the picker to get a photo and the
 *  manipulator to shrink it before it leaves the device. Missing either one
 *  hides the scan affordance entirely rather than offering a button that
 *  throws; typing ingredients in still works, which is the whole screen's
 *  fallback. */
export const hasNativeCamera =
  requireOptionalNativeModule('ExponentImagePicker') != null &&
  requireOptionalNativeModule('ExpoImageManipulator') != null;

```

### `lib/haptics.ts`

```ts
/**
 * Safe haptics: no-ops on binaries without the ExpoHaptics module, and never
 * lets a feedback call reject into an unhandled promise.
 */
import * as Haptics from 'expo-haptics';
import { hasNativeHaptics } from './native-caps';

export function tapFeedback(): void {
  if (!hasNativeHaptics) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectFeedback(): void {
  if (!hasNativeHaptics) return;
  void Haptics.selectionAsync().catch(() => {});
}

```

### `lib/tab-bar-scroll.tsx`

```tsx
/**
 * Scroll-responsive tab bar state, shared by every tabbed screen and the
 * floating glass tab bar. One provider owns a single `compactProgress`
 * shared value (0 = expanded, 1 = compact) plus one animated scroll handler;
 * each tab's scroll view attaches the same handler, so the behaviour is
 * identical no matter which tab is scrolling and nothing crosses back to the
 * JS thread per frame.
 *
 * Direction, not position, drives the state: per-frame deltas accumulate
 * into downward/upward travel with a small deadzone, and only crossing a
 * threshold flips the target — so scroll noise never toggles the bar, and
 * `withSpring` is only ever started on an actual state change.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import {
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { TAB_BAR_MOTION as M } from './tab-bar-motion';

type ScrollHandler = ReturnType<typeof useAnimatedScrollHandler>;

interface TabBarMotionState {
  /** 0 = fully expanded, 1 = compact. Springs between the two. */
  compactProgress: SharedValue<number>;
  /** Attach to every tabbed screen's Animated.ScrollView `onScroll`. */
  scrollHandler: ScrollHandler;
  /** Relax the bar open (tab switch, programmatic scroll-to-top). */
  expand: () => void;
}

const TabBarMotionContext = createContext<TabBarMotionState | null>(null);

export function TabBarScrollProvider({ children }: { children: React.ReactNode }) {
  const compactProgress = useSharedValue(0);
  /** Current resting target (0/1) — springs start only when this flips. */
  const target = useSharedValue(0);
  const prevY = useSharedValue(0);
  const accumDown = useSharedValue(0);
  const accumUp = useSharedValue(0);
  // Reduce Motion trades the elastic spring for a short plain transition.
  const reduceMotion = useReducedMotion();

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: (e) => {
      prevY.value = e.contentOffset.y;
      accumDown.value = 0;
      accumUp.value = 0;
    },
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - prevY.value;
      prevY.value = y;

      // At (or rubber-banding past) the top: always expanded.
      if (y <= M.topZone) {
        accumDown.value = 0;
        accumUp.value = 0;
        if (target.value !== 0) {
          target.value = 0;
          compactProgress.value = reduceMotion
            ? withTiming(0, { duration: 150 })
            : withSpring(0, M.barSpring);
        }
        return;
      }

      if (dy > M.scrollDeadzone) {
        accumUp.value = 0;
        accumDown.value += dy;
        if (accumDown.value >= M.downwardThreshold && target.value !== 1) {
          target.value = 1;
          compactProgress.value = reduceMotion
            ? withTiming(1, { duration: 150 })
            : withSpring(1, M.barSpring);
        }
      } else if (dy < -M.scrollDeadzone) {
        accumDown.value = 0;
        accumUp.value += -dy;
        if (accumUp.value >= M.upwardThreshold && target.value !== 0) {
          target.value = 0;
          compactProgress.value = reduceMotion
            ? withTiming(0, { duration: 150 })
            : withSpring(0, M.barSpring);
        }
      }
    },
    onMomentumEnd: (e) => {
      // Settling near the top relaxes the bar open; deep in content it
      // stays compact until the reader scrolls back up.
      if (e.contentOffset.y <= M.restExpandZone && target.value !== 0) {
        target.value = 0;
        compactProgress.value = reduceMotion
          ? withTiming(0, { duration: 150 })
          : withSpring(0, M.barSpring);
      }
    },
  });

  const expand = useCallback(() => {
    accumDown.value = 0;
    accumUp.value = 0;
    if (target.value === 0 && compactProgress.value === 0) return;
    target.value = 0;
    compactProgress.value = reduceMotion
      ? withTiming(0, { duration: 150 })
      : withSpring(0, M.barSpring);
  }, [accumDown, accumUp, target, compactProgress, reduceMotion]);

  const value = useMemo(
    () => ({ compactProgress, scrollHandler, expand }),
    [compactProgress, scrollHandler, expand],
  );

  return <TabBarMotionContext.Provider value={value}>{children}</TabBarMotionContext.Provider>;
}

/** The tab bar's view of the shared motion state. Requires the provider. */
export function useTabBarMotion(): TabBarMotionState {
  const ctx = useContext(TabBarMotionContext);
  if (!ctx) throw new Error('useTabBarMotion must be used inside TabBarScrollProvider');
  return ctx;
}

/**
 * The scroll handler for a tabbed screen's scroll view, or undefined outside
 * the tab navigator (settings, sheets, …) where the bar doesn't exist.
 */
export function useTabBarScrollReporter(): ScrollHandler | undefined {
  return useContext(TabBarMotionContext)?.scrollHandler;
}

```

### `components/glass-surface.tsx`

```tsx
/**
 * The glass ground under the floating tab bar. On iOS 26+ with the
 * ExpoGlassEffect module in the binary this is true Liquid Glass — the
 * system material refracts whatever scrolls beneath it and adapts to light
 * and dark content on its own. Everywhere else (older iOS, Android, stale
 * dev client) it degrades to the app's established BlurView + translucent
 * fill recipe, keeping identical layout and motion.
 *
 * The surface always fills its (animated) parent and is shaped by
 * `radius.pill`, which React Native clamps to a perfect capsule at any
 * height — so the compact/expanded animation never has to touch the glass
 * itself. Never animate opacity here: native glass breaks under it. The
 * parent animates dimensions instead.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as brand from '@cookright/brand';
import { hasNativeBlur, hasNativeGlassEffect } from '@/lib/native-caps';
import { useAppTheme } from '@/lib/theme-context';

// Only touched when the native module exists — a stale dev client must fall
// back to blur, never render an unimplemented-component placeholder.
type GlassEffectModule = typeof import('expo-glass-effect');
const glassEffect: GlassEffectModule | null = hasNativeGlassEffect
  ? (require('expo-glass-effect') as GlassEffectModule)
  : null;

export const hasLiquidGlass =
  Platform.OS === 'ios' && glassEffect != null && glassEffect.isLiquidGlassAvailable();

/** Reduce Transparency: swap translucency for a solid, legible surface. */
function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function GlassSurface() {
  const { name, colors } = useAppTheme();
  const reduceTransparency = useReduceTransparency();

  if (hasLiquidGlass && glassEffect) {
    // The system handles Reduce Transparency for Liquid Glass itself.
    const { GlassView } = glassEffect;
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        colorScheme={name === 'cook' ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { borderRadius: brand.radius.pill, overflow: 'hidden' }]}
      />
    );
  }

  const translucent = hasNativeBlur && !reduceTransparency;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: brand.radius.pill,
          overflow: 'hidden',
          // The faint bright rim that stands in for the native glass edge.
          borderWidth: 1,
          borderColor: colors.glass.stroke,
          backgroundColor: translucent ? 'transparent' : colors.surfaceRaised,
        },
      ]}
    >
      {translucent ? (
        <>
          <BlurView tint={colors.glass.tint} intensity={50} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass.fill }]} />
        </>
      ) : null}
    </View>
  );
}

```

### `components/tab-bar-indicator.tsx`

```tsx
/**
 * The one selection pill that physically travels between tab slots, behind
 * the icons. Position rides a spring on the *tab index* (so geometry can be
 * derived per-frame from compactProgress without measurement); while moving
 * it stretches horizontally and squashes vertically a touch — more for a
 * longer hop — then springs back to a resting capsule.
 *
 * All geometry is computed inside useAnimatedStyle from the same numbers the
 * bar itself animates with (TAB_BAR_MOTION), so pill and bar can never be a
 * frame apart.
 */
import { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { TAB_BAR_MOTION as M } from '@/lib/tab-bar-motion';

export function AnimatedTabIndicator({
  index,
  count,
  compactProgress,
  expandedWidth,
  color,
}: {
  /** Selected tab index. */
  index: number;
  /** Total number of tab slots. */
  count: number;
  /** The bar's shared 0→1 compact progress. */
  compactProgress: SharedValue<number>;
  /** Bar width in the expanded state; compact width derives from it. */
  expandedWidth: number;
  /** Pill fill — a translucent gray that reads as embedded glass. */
  color: string;
}) {
  const reduceMotion = useReducedMotion();
  const position = useSharedValue(index);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const prevIndex = useRef(index);

  useEffect(() => {
    const distance = Math.abs(index - prevIndex.current);
    prevIndex.current = index;
    if (distance === 0) return;

    if (reduceMotion) {
      // No deformation, one short simple move.
      position.value = withTiming(index, { duration: 120 });
      return;
    }

    position.value = withSpring(index, M.indicatorSpring);
    // A longer hop stretches more; capped so it never turns cartoonish.
    const stretch = Math.min(
      M.stretchBase + M.stretchPerTab * (distance - 1),
      M.maxIndicatorStretch,
    );
    scaleX.value = withSequence(
      withTiming(1 + stretch, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, M.indicatorSpring),
    );
    scaleY.value = withSequence(
      withTiming(1 - stretch * M.verticalSquash, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, M.indicatorSpring),
    );
  }, [index, reduceMotion, position, scaleX, scaleY]);

  const style = useAnimatedStyle(() => {
    const p = compactProgress.value;
    const barWidth = interpolate(p, [0, 1], [expandedWidth, expandedWidth * M.compactWidthRatio]);
    const barHeight = interpolate(p, [0, 1], [M.expandedHeight, M.compactHeight]);
    const pad = interpolate(p, [0, 1], [M.expandedPadding, M.compactPadding]);
    const slot = (barWidth - pad * 2) / count;
    const pillH = interpolate(p, [0, 1], [M.pillHeightExpanded, M.pillHeightCompact]);
    const pillW = Math.max(slot - M.pillInset * 2, pillH);
    return {
      width: pillW,
      height: pillH,
      borderRadius: pillH / 2,
      transform: [
        { translateX: pad + position.value * slot + (slot - pillW) / 2 },
        { translateY: (barHeight - pillH) / 2 },
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
      ],
    };
  }, [expandedWidth, count]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, backgroundColor: color }, style]}
    />
  );
}

```

### `components/tab-bar.tsx`

```tsx
/**
 * The floating liquid-glass tab bar: a capsule of real glass hovering above
 * the home indicator, one translucent pill travelling behind the icons to
 * mark the active tab. Icon-only by design — each tab still carries its name
 * as the accessibility label; interaction targets stay ≥44pt even compact.
 *
 * Three independent systems, deliberately kept apart:
 * - GlassSurface: the native Liquid Glass / blur-fallback ground;
 * - TabBarScrollProvider (lib/tab-bar-scroll): the shared compactProgress
 *   that contracts the bar while the reader scrolls down;
 * - AnimatedTabIndicator: the spring-driven selection pill.
 * All numbers live in lib/tab-bar-motion — tune there, not here.
 *
 * Compact never scales the bar as a bitmap: width, height, row padding and
 * pill geometry each interpolate on compactProgress so the layout compresses
 * around its vertical center (the positioner keeps expanded height and
 * centers the bar inside it).
 */
import { useEffect } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as brand from '@cookright/brand';
import { selectFeedback } from '@/lib/haptics';
import { useAppTheme } from '@/lib/theme-context';
import { useTabBarMotion } from '@/lib/tab-bar-scroll';
import { TAB_BAR_MOTION as M } from '@/lib/tab-bar-motion';
import { GlassSurface } from './glass-surface';
import { AnimatedTabIndicator } from './tab-bar-indicator';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'flame',
  pantry: 'basket',
  household: 'people',
  history: 'book',
};

/** Routes that live inside the tab navigator but off the bar (href: null);
 *  while one is focused, the bar highlights its parent tab. */
const HIDDEN_ROUTE_PARENT: Record<string, string> = {
  'pantry-ideas': 'pantry',
  tonight: 'index',
};

/** Translucent gray that reads as a darker patch of the glass, per scheme. */
const PILL_FILL = {
  light: 'rgba(110, 105, 120, 0.18)',
  dark: 'rgba(235, 235, 245, 0.14)',
} as const;

/** Structural subset of @react-navigation/bottom-tabs' BottomTabBarProps —
 *  typed locally so the tab bar doesn't depend on a transitive package. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { name, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { compactProgress, expand } = useTabBarMotion();

  const expandedWidth = Math.round(windowWidth * M.expandedWidthRatio);
  // The bar floats the same distance from the bottom as from the sides —
  // over the home indicator on iOS (the iOS 26 dock look); on Android it
  // rises just enough to clear system navigation when that needs more.
  const sideMargin = Math.round((windowWidth - expandedWidth) / 2);
  const bottomOffset = Platform.OS === 'ios' ? sideMargin : Math.max(insets.bottom, sideMargin);

  // Only real tabs render slots; a focused hidden route (pantry-ideas)
  // keeps its parent tab highlighted so the bar never loses its selection.
  const barRoutes = state.routes.filter((r) => ICONS[r.name] != null);
  const focusedName = state.routes[state.index]!.name;
  const activeName = ICONS[focusedName] != null ? focusedName : HIDDEN_ROUTE_PARENT[focusedName];
  const activeIndex = Math.max(
    barRoutes.findIndex((r) => r.name === activeName),
    0,
  );
  const count = barRoutes.length;

  // Landing on a tab relaxes the bar open — the new screen isn't scrolling
  // yet, and the reset also clears any half-accumulated scroll travel.
  useEffect(() => {
    expand();
  }, [state.index, expand]);

  const barStyle = useAnimatedStyle(() => {
    const p = compactProgress.value;
    return {
      width: interpolate(p, [0, 1], [expandedWidth, expandedWidth * M.compactWidthRatio]),
      height: interpolate(p, [0, 1], [M.expandedHeight, M.compactHeight]),
    };
  }, [expandedWidth]);

  const rowStyle = useAnimatedStyle(() => ({
    paddingHorizontal: interpolate(
      compactProgress.value,
      [0, 1],
      [M.expandedPadding, M.compactPadding],
    ),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(compactProgress.value, [0, 1], [1, M.compactIconScale]) }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: bottomOffset,
        // Fixed-height positioner: the bar contracts around its own center
        // instead of hanging off a moving bottom edge.
        height: M.expandedHeight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            borderRadius: brand.radius.pill,
            // Soft ambient lift only — the glass carries the depth.
            shadowColor: brand.color.night,
            shadowOpacity: 0.1,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          },
          barStyle,
        ]}
      >
        <GlassSurface />
        <AnimatedTabIndicator
          index={activeIndex}
          count={count}
          compactProgress={compactProgress}
          expandedWidth={expandedWidth}
          color={PILL_FILL[name === 'cook' ? 'dark' : 'light']}
        />
        <Animated.View style={[{ flex: 1, flexDirection: 'row' }, rowStyle]}>
          {barRoutes.map((route, index) => {
            const { options } = descriptors[route.key]!;
            const label = options.title ?? route.name;
            const focused = index === activeIndex;
            const icon = ICONS[route.name] ?? 'ellipse';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              // Compare against the truly focused route, not the highlight:
              // from pantry-ideas, tapping the (highlighted) pantry tab must
              // still navigate back to pantry.
              if (focusedName !== route.name && !event.defaultPrevented) {
                selectFeedback();
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={typeof label === 'string' ? label : route.name}
                onPress={onPress}
                // The slot fills the bar; even compact (~53pt) it exceeds the
                // 44pt target, and hitSlop covers the shrunken visuals.
                hitSlop={{ top: 6, bottom: 6 }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Animated.View style={iconStyle}>
                  <Ionicons
                    name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
                    size={M.iconSize}
                    color={focused ? colors.text : colors.textMuted}
                  />
                </Animated.View>
              </Pressable>
            );
          })}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

```

### `components/screen.tsx`

```tsx
/**
 * Standard screen shell: plain themed ground (linen), 20pt gutters, safe
 * areas, and a pinned footer for primary actions (lower third, one-handed
 * reach). Content reads on the ground; glass is reserved for chrome.
 */
import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as brand from '@cookright/brand';
import { useAppTheme } from '@/lib/theme-context';
import { useTabBarScrollReporter } from '@/lib/tab-bar-scroll';

/** Clearance so scroll content ends above the floating glass tab bar
 *  (bottom offset ≈ side margin ~14 + bar 62 puts its top edge ~76pt up).
 *  Content still travels behind the glass; this only keeps the last items
 *  reachable. */
export const TAB_BAR_CLEARANCE = 92;

export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  tabbed = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Pinned to the lower third — primary actions live here (DESIGN.md §5). */
  footer?: React.ReactNode;
  /** Inside the tab navigator: pads content past the floating tab bar. */
  tabbed?: boolean;
}) {
  const { colors } = useAppTheme();
  // Tabbed screens report scroll to the floating tab bar (compact/expand);
  // undefined outside the tab navigator, where no bar is listening.
  const tabBarScrollHandler = useTabBarScrollReporter();
  const pad = padded ? { paddingHorizontal: brand.space.gutter } : null;
  const bottomPad = tabbed ? TAB_BAR_CLEARANCE : brand.space['3xl'];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {scroll ? (
          <Animated.ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[pad, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
            // A focused text field scrolls itself above the keyboard instead
            // of hiding behind it (the search-bar-under-keyboard bug).
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            onScroll={tabbed ? tabBarScrollHandler : undefined}
            scrollEventThrottle={16}
          >
            {children}
          </Animated.ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad]}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              paddingHorizontal: brand.space.gutter,
              paddingTop: brand.space.md,
              // Above the floating glass tab bar (its top edge sits ~100pt up
              // on home-indicator devices) — the primary CTA is never clipped.
              paddingBottom: tabbed ? TAB_BAR_CLEARANCE + brand.space.sm : brand.space.xl,
              gap: brand.space.sm,
            }}
          >
            {footer}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

/** Hairline divider — quiet separation without card borders. */
export function Hairline(props: ViewProps) {
  const { colors } = useAppTheme();
  return <View {...props} style={[{ height: 1, backgroundColor: colors.hairline }, props.style]} />;
}

export function Gap({ size = 'lg' }: { size?: keyof typeof brand.space }) {
  return <View style={{ height: brand.space[size] }} />;
}

```

### `app/(tabs)/_layout.tsx`

```tsx
import { Tabs } from 'expo-router';
import { GlassTabBar } from '@/components/tab-bar';
import { TabBarScrollProvider } from '@/lib/tab-bar-scroll';
import { useAppTheme } from '@/lib/theme-context';
import { strings } from '@/lib/strings';

export default function TabsLayout() {
  const { colors } = useAppTheme();

  return (
    // One provider owns the bar's compact/expand state; every tabbed Screen
    // reports its scrolling into it, the GlassTabBar animates from it.
    <TabBarScrollProvider>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          // All four tabs mount once at startup, behind the splash — a tab tap
          // then only swaps already-built screens instead of building one mid-
          // transition (the switch lag). Frozen while blurred: an inactive tab
          // doesn't re-render on session/locale/theme changes; focus refetches
          // still fire via useFocusEffect on the way back in.
          lazy: false,
          freezeOnBlur: true,
        }}
      >
        <Tabs.Screen name="index" options={{ title: strings.tabs.tonight }} />
        <Tabs.Screen name="pantry" options={{ title: strings.tabs.pantry }} />
        <Tabs.Screen name="history" options={{ title: strings.tabs.cookAgain }} />
        <Tabs.Screen name="household" options={{ title: strings.tabs.household }} />
        {/* Flow screens live INSIDE the tab navigator so the glass tab bar
            never disappears mid-flow — it stays put on every screen. Hidden
            from the bar (which highlights their parent tab instead) and
            lazy: their mounts kick off model calls, which must not run at
            startup. tonight pops its stack when it blurs, so a re-entry
            never lands on a stale mid-flow screen. */}
        <Tabs.Screen name="pantry-ideas" options={{ href: null, lazy: true }} />
        <Tabs.Screen name="tonight" options={{ href: null, lazy: true, popToTopOnBlur: true }} />
      </Tabs>
    </TabBarScrollProvider>
  );
}

```
