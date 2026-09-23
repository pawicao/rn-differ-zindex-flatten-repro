/**
 * Reproducer: the differ creates a mounted view again, or deletes a view that
 * only moves, when a view with a negative zIndex is a child of a view that
 * flattens in the same commit in which its parent unflattens.
 *
 * @format
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// Q > U > F > [A, K, B]. Every 500 ms the opacity moves from F to U or back, so
// the children of F move between the two views. K sorts before them because of
// its negative zIndex.
function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [swapped, setSwapped] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSwapped(value => !value);
      setCount(value => value + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top + 16 }]}>
      <Text testID="swaps">swaps: {count}</Text>
      {/* Q */}
      <View style={styles.stacking}>
        {/* U */}
        <View style={swapped ? styles.stacking : undefined}>
          {/* F */}
          <View style={swapped ? undefined : styles.stacking}>
            {/* A */}
            <View style={styles.first} />
            {/* K */}
            <View style={styles.raised} />
            {/* B */}
            <View style={styles.second} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  stacking: {
    opacity: 0.9,
  },
  first: {
    height: 40,
    backgroundColor: 'tomato',
  },
  raised: {
    height: 40,
    backgroundColor: 'gold',
    zIndex: -1,
  },
  second: {
    height: 40,
    backgroundColor: 'skyblue',
  },
});

export default App;
