# Differentiator: spurious Create / Delete of a mounted view with zIndex and nested (un)flattening

Minimal repro for a React Native differ bug. It is a fresh `react-native@0.88.0-rc.2` app with nothing
added: everything is in [`App.tsx`](App.tsx).

```tsx
<View style={{opacity: 0.9}}>                          // Q
  <View style={swapped ? {opacity: 0.9} : undefined}>   // U
    <View style={swapped ? undefined : {opacity: 0.9}}> // F
      <View style={first} />
      <View style={{...raised, zIndex: -1}} />          // K
      <View style={second} />
```

Every 500 ms the opacity moves from F to U or back. In one commit U stops being flattened while F gets
flattened (or the other way round), so the children of F move to U, and K is ordered before them
because of its negative `zIndex`.

## Result

| Platform | Result |
| --- | --- |
| iOS, Debug | Crashes on the first swap: `RCTComponentViewRegistry: Attempt to dequeue already registered component.` |
| iOS, Release | Crashes on the first swap: `SIGSEGV` in `-[RCTMountingManager performTransaction:]` |
| Android, Debug | Does not crash; the Android mounting layer skips a Create for a tag it already allocated |

The mutations the differ produces (tags from a Reanimated trace of the same tree):

```
U unflattens, F flattens:
Remove 146 <- 148 @2 | Remove 142 <- 148 @1 | Remove 144 <- 148 @0 | Create 150 | Create 144 | Insert 150 -> 152 @1 | Insert 144 -> 150 @0 | ... | Delete 148
                                                                                  ^^^^^^^^^^ K is mounted

U flattens, F unflattens:
Remove 182 <- 186 @2 | Remove 178 <- 186 @1 | Remove 180 <- 186 @0 | Remove 186 <- 188 @0 | Delete 186 | Delete 180 | Create 184 | Insert 180 -> 184 @0 | ...
                                                                                                          ^^^^^^^^^^ K is moved, not deleted
```

Without the `zIndex` on K the same tree produces a correct stream.

## Run

```sh
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npx react-native run-ios
```

## Cause

In `calculateShadowViewMutationsFlattener`, the list of the node being flattened or unflattened is sorted
by `orderIndex`, so K is visited before F. Nothing has matched K yet at that point, so it becomes a
delete/create candidate. The nested (un)flattening of F then matches K through a different
`ShadowViewNodePair` instance (a fresh slice of F) and records it in `subVisitedNewMap` /
`subVisitedOldMap`, but the final candidate loop only checks `treeChildPair.inOtherTree()` on the outer
pair, so it deletes or creates K anyway.

A related bug in the same function: in the "flatten parent, unflatten child" branch,
`auto unvisitedItPair = *unvisitedOtherNodesIt->second;` stores the address of a loop-local copy in
`unvisitedRecursiveChildPairs`.

[`docs/differentiator-fix.patch`](docs/differentiator-fix.patch) fixes both. With React Native built
from source and the patch applied, this repro runs without errors.
