# Request Sidebar Drag-and-Drop Design

## Summary

This change improves request reordering in the left sidebar so the drop target is visually clear and the resulting move is reliable.

Today, request items only expose a narrow valid drop zone and the drop position is recalculated again on mouse release. That combination causes two user-facing problems:

- request rows do not show a collection-style insertion cue, so the destination is ambiguous
- request reordering frequently does nothing because the pointer can drift into an invalid zone between `hover` and `drop`

The proposed fix introduces explicit drop placements and aligns the visual indicator with the actual reorder semantics.

## Current Behavior

### Relevant Files

- `packages/bruno-app/src/components/Sidebar/Collections/Collection/index.js`
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/index.js`
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/StyledWrapper.js`
- `packages/bruno-app/src/providers/ReduxStore/slices/collections/actions.js`
- `packages/bruno-app/src/utils/collections/index.js`

### Existing Drag Model

- Collection rows accept `collection` and `collection-item` drags.
- Collection-to-collection moves use a line-style adjacent indicator.
- Collection-item-to-collection moves use a full-row inside highlight.
- Collection item rows currently model drops as either `adjacent` or `inside`.
- For request targets, `adjacent` only applies when the pointer is in the upper half of the row.
- For folder targets, the upper portion means `adjacent` and the lower portion means `inside`.

### Root Cause

There are two separate issues:

1. Request rows have no explicit "drop below" state.
   - A request can only act as "insert before this item".
   - The user gets no clear signal for "insert after this item" or "append after the last sibling".

2. Drop resolution is unstable.
   - `hover` calculates one drop state.
   - `drop` recalculates the state from the live pointer position.
   - A small cursor movement between those two moments can turn a seemingly valid drop into `null`.

The net effect is a drag interaction that looks permissive while behaving inconsistently.

## Goals

- Show a clear insertion cue when dragging over request rows.
- Support both "insert above" and "insert below" for request targets.
- Preserve folder and collection "drop inside" behavior.
- Make drag success deterministic by using the last valid hover result at drop time.
- Keep the implementation compatible with existing move and persist flows.

## Non-Goals

- Rebuilding the entire sidebar tree drag-and-drop architecture.
- Changing collection-to-collection reorder behavior outside of the new placement vocabulary.
- Redesigning drag preview visuals.

## Proposed Design

### Placement Vocabulary

Replace the ambiguous `adjacent` drop type with explicit placements:

- `before`
- `inside`
- `after`

These placements represent actual insertion intent rather than a visual approximation.

### Placement Rules

#### Request Targets

Request rows support:

- `before` when the pointer is in the upper half of the row
- `after` when the pointer is in the lower half of the row

Request rows do not support `inside`.

#### Folder Targets

Folder rows support:

- `before` in the upper zone
- `inside` in the middle zone
- `after` in the lower zone

The current "folder lower portion means inside" behavior will be replaced with a three-zone model so users can insert after a folder as well as into it.

#### Collection Targets

Collection rows support:

- `before` near the top edge for collection-to-collection moves
- `inside` for collection-item drops into the collection root
- `after` near the bottom edge for collection-to-collection moves

For collection-item drags over the collection root, the UI should continue to communicate an inside drop, because the collection root is a container rather than a sibling row within the request tree.

### Stable Hover-to-Drop Contract

Each droppable sidebar row will store the most recent valid placement derived during `hover`.

`drop` will consume that cached placement instead of recalculating from the live pointer. This removes the race where a valid-looking target turns invalid at the moment of release.

If no valid placement has been established, the drop is ignored.

### Visual Mapping

The row-level CSS classes become:

- `drop-target-above` for `before`
- `drop-target` for `inside`
- `drop-target-below` for `after`

This mapping keeps the displayed cue directly aligned with the semantic placement.

For request rows this means:

- upper hover shows a top insertion line
- lower hover shows a bottom insertion line

For folder rows this means:

- upper hover shows a top insertion line
- middle hover shows an inside highlight
- lower hover shows a bottom insertion line

## Reorder Semantics

### Same Directory Reorder

Sequence updates should be computed from insertion intent, not just by copying the target sequence.

Instead of treating every non-inside drop as "move to target sequence", the reorder helper will:

- remove the dragged item from the sibling list
- determine the insertion index from the target item plus placement
- insert the dragged item at that index
- normalize `seq` values from the resulting list order

This directly supports:

- insert before target
- insert after target
- append after the last sibling

### Cross-Directory Move

For moves across folders or collections:

- the source directory still needs sequence compaction
- the target directory needs insertion by placement-aware index
- pathname calculation still decides whether the move changes directories
- `inside` moves use the target container path
- `before` and `after` moves use the target item's parent directory path

The move pipeline in `handleCollectionItemDrop` remains the orchestrator, but the target reorder helper will accept placement-aware inputs.

## Implementation Plan

### Component Layer

Update sidebar drag targets so they emit and consume explicit placements.

Expected files:

- `packages/bruno-app/src/components/Sidebar/Collections/Collection/index.js`
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/index.js`
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/StyledWrapper.js`
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/StyledWrapper.js`

Key changes:

- replace `dropType` state with placement state
- use per-row placement detection functions
- cache the latest valid placement during hover
- render top and bottom indicators for request rows

### Data Layer

Update reorder helpers and drop orchestration.

Expected files:

- `packages/bruno-app/src/utils/collections/index.js`
- `packages/bruno-app/src/providers/ReduxStore/slices/collections/actions.js`

Key changes:

- add placement-aware reorder helper logic
- preserve existing inside-drop pathname behavior
- use `before` and `after` when deciding target insertion index
- keep source-directory resequencing for moved items

## Testing Strategy

### Logic Tests

Add unit tests for collection reorder helpers covering:

- moving a request before another request in the same directory
- moving a request after another request in the same directory
- moving a request after the last sibling
- moving an item across directories with placement-aware insertion
- keeping inside-drop behavior unchanged for folder and collection roots

These tests should live with the existing collection utility tests.

### Component Tests

Add a focused component test for sidebar item placement classes so request rows can distinguish:

- top-half hover -> `drop-target-above`
- bottom-half hover -> `drop-target-below`

The component test can stay minimal and does not need to exhaustively simulate the full filesystem move flow.

### Manual Verification

Verify in the running app:

- request over request, upper half
- request over request, lower half
- request over folder, upper/middle/lower zones
- request to last position in a folder
- folder over request and folder over folder
- cross-collection request move

Success means the visual indicator matches the final location every time.

## Risks and Mitigations

- Risk: changing placement semantics could regress folder drops.
  - Mitigation: keep `inside` behavior explicit and cover it with logic tests.

- Risk: same-directory reorder bugs can silently corrupt sequence ordering.
  - Mitigation: normalize sequences from final array order instead of incrementally patching ad hoc values.

- Risk: collection root behavior could become visually inconsistent with request rows.
  - Mitigation: preserve collection-root inside highlighting for collection-item drops and limit before/after usage there to collection-to-collection reorder.

## Recommendation

Implement the new `before` / `inside` / `after` placement model end to end, then validate it with both helper-level tests and a short manual drag pass in the app.
