import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export default function SentMessageAppear({ children, animate = false }) {
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animate ? 14 : 0)).current;

  useEffect(() => {
    if (!animate) {
      return undefined;
    }

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [animate, opacity, translateY]);

  if (!animate) {
    return children;
  }

  return (
    <Animated.View style={{ width: '100%', opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
