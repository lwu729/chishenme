import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

export default function CustomScrollView({ children, contentContainerStyle, style }: Props) {
  const [scrollY, setScrollY] = useState(0);
  // contentH = total scrollable content height (from onContentSizeChange)
  const [contentH, setContentH] = useState(0);
  // viewportH = visible height of the ScrollView (from onLayout on ScrollView)
  const [viewportH, setViewportH] = useState(0);
  // trackH = actual rendered height of the thumb track (from onLayout on track)
  const [trackH, setTrackH] = useState(0);

  // Thumb is sized as the visible fraction of total content, clamped to min 32
  const thumbH =
    trackH > 0 && contentH > trackH
      ? Math.max(32, (viewportH / contentH) * trackH)
      : trackH;

  const maxScroll = Math.max(0, contentH - viewportH);
  const thumbTop =
    maxScroll > 0 && trackH > thumbH
      ? (scrollY / maxScroll) * (trackH - thumbH)
      : 0;

  return (
    <View style={[styles.wrap, style]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={e => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        onContentSizeChange={(_, h) => setContentH(h)}
        onLayout={e => setViewportH(e.nativeEvent.layout.height)}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScrollView>
      <View style={styles.bar}>
        <View
          style={styles.track}
          onLayout={e => setTrackH(e.nativeEvent.layout.height)}
        >
          <View
            style={[
              styles.thumb,
              {
                height: Math.min(thumbH, trackH),
                top: Math.max(0, Math.min(thumbTop, trackH - thumbH)),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
  },
  scroll: {
    flex: 1,
  },
  bar: {
    width: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  track: {
    width: 5,
    flex: 1,
    backgroundColor: colors.g100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  thumb: {
    width: 5,
    backgroundColor: colors.g400,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },
});
