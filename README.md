# rn-differ-zindex-flatten-repro

![Build](https://github.com/pawicao/rn-differ-zindex-flatten-repro/workflows/Pre%20Merge%20Checks/badge.svg)

Reproducer for a bug in the Fabric differ (`Differentiator.cpp`). The differ creates a view that is
already mounted, or deletes a view that only moves. On iOS, the app crashes on the first update.

All the code is in [`ReproducerApp/App.tsx`](ReproducerApp/App.tsx).

## The tree

```tsx
<View style={{opacity: 0.9}}>                          // Q
  <View style={swapped ? {opacity: 0.9} : undefined}>   // U
    <View style={swapped ? undefined : {opacity: 0.9}}> // F
      <View style={first} />                            // A
      <View style={{...raised, zIndex: -1}} />          // K
      <View style={second} />                           // B
```

Every 500 ms, the opacity moves from F to U, or from U to F. Thus, in one commit, U unflattens and F
flattens (or the opposite). The children of F move to U. K has a negative `zIndex`, thus it is sorted
before the other children.

## Result

| Platform       | Result                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| iOS, Debug     | Crash on the first swap: `RCTComponentViewRegistry: Attempt to dequeue already registered component.`    |
| iOS, Release   | Crash on the first swap: `SIGSEGV` in `-[RCTMountingManager performTransaction:]` (seen on 0.88.0-rc.2) |
| Android, Debug | No crash. The Android mounting layer ignores a `Create` for a tag that it already has.                  |

If you remove `zIndex: -1` from K, the differ output is correct and the app does not crash.

The mutations from the differ (the tags are from a trace of the same tree):

```
U unflattens, F flattens:
Remove 146 <- 148 @2 | Remove 142 <- 148 @1 | Remove 144 <- 148 @0 | Create 150 | Create 144 | Insert 150 -> 152 @1 | Insert 144 -> 150 @0 | ... | Delete 148
                                                                                  ^^^^^^^^^^ K is mounted

U flattens, F unflattens:
Remove 182 <- 186 @2 | Remove 178 <- 186 @1 | Remove 180 <- 186 @0 | Remove 186 <- 188 @0 | Delete 186 | Delete 180 | Create 184 | Insert 180 -> 184 @0 | ...
                                                                                                          ^^^^^^^^^^ K moves, but the differ deletes it
```

## Cause

In `calculateShadowViewMutationsFlattener`, the differ sorts the children of the view that flattens
or unflattens by `orderIndex`. Thus it visits K before F. At that time, nothing has matched K, so K
becomes a delete or create candidate. Then the nested (un)flattening of F matches K through a
different `ShadowViewNodePair` (a new slice of F) and records K in `subVisitedNewMap` or
`subVisitedOldMap`. But the last loop over the candidates only checks `treeChildPair.inOtherTree()`
on the outer pair. Thus the differ deletes or creates K.

A related bug is in the same function. In the "flatten parent, unflatten child" branch,
`auto unvisitedItPair = *unvisitedOtherNodesIt->second;` keeps the address of a copy that is local to
the loop in `unvisitedRecursiveChildPairs`.

[`docs/differentiator-fix.patch`](docs/differentiator-fix.patch) fixes the two bugs. It applies to
`react-native@0.87.1` and `0.88.0-rc.2`. With React Native built from source and the patch applied, this
reproducer does not crash.

## Run

```sh
cd ReproducerApp
yarn install
cd ios && bundle install && bundle exec pod install && cd ..
yarn ios
```

> [!NOTE]
> On an iOS 27 simulator, the 0.87.1 template app stops at launch because it does not use the UIScene
> life cycle. Use an iOS 26 (or earlier) simulator.

# Reproducer TODO list

- [x] 1. Create a new reproducer project.
- [x] 2. Git clone your repository locally.
- [x] 3. Edit the project to reproduce the failure you're seeing.
- [x] 4. Push your changes, so that Github Actions can run the CI.
- [x] 5. Make sure the repository is public and share the link with the issue you reported.

# How to use this Reproducer

This project has been created with `npx @react-native-community/cli init` and is a vanilla React Native app.

> [!IMPORTANT]  
> Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/set-up-your-environment) so that you have a working environment locally.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

First, make sure you install dependencies with:

```bash
cd ios && bundle install && bundle exec pod install
```

Then you can run the iOS app with:

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!
