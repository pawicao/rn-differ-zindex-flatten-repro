import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

// Q > U > F > [A, K, B]. Every toggle moves the opacity from F to U or back, so
// the children of F move between the two views, and K sorts before them because
// of its negative zIndex.
export default function App() {
  const [swapped, setSwapped] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSwapped((value) => !value);
      setCount((value) => value + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text testID="swaps">swaps: {count}</Text>
      <View style={styles.stacking}>
        <View style={swapped ? styles.stacking : undefined}>
          <View style={swapped ? undefined : styles.stacking}>
            <View style={styles.first} />
            <View style={styles.raised} />
            <View style={styles.second} />
          </View>
        </View>
      </View>
    </SafeAreaView>
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
