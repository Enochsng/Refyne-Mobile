import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animated values for floating particles
  const particles = useRef(
    Array.from({ length: 8 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0.3),
      scale: new Animated.Value(1),
    }))
  ).current;

  // Animated values for rotating circles
  const circles = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      rotate: new Animated.Value(0),
      scale: new Animated.Value(0.8),
    }))
  ).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 30,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation for decorative circles
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    // Pulse animation for logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Animate floating particles
    particles.forEach((particle, index) => {
      const delay = index * 200;
      const duration = 3000 + Math.random() * 2000;
      const translateYValue = -100 - Math.random() * 200;
      const translateXValue = (Math.random() - 0.5) * 100;

      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(particle.translateY, {
              toValue: translateYValue,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateX, {
              toValue: translateXValue,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.7,
                duration: duration / 2,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.3,
                duration: duration / 2,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      ).start();
    });

    // Animate rotating circles
    circles.forEach((circle, index) => {
      const rotateAnimation = Animated.loop(
        Animated.timing(circle.rotate, {
          toValue: 1,
          duration: 15000 + index * 5000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();

      const scaleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(circle.scale, {
            toValue: 1.2,
            duration: 2000 + index * 500,
            useNativeDriver: true,
          }),
          Animated.timing(circle.scale, {
            toValue: 0.8,
            duration: 2000 + index * 500,
            useNativeDriver: true,
          }),
        ])
      );
      scaleAnimation.start();
    });

    // Hide splash screen after 3 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      rotateAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F0F4F8', '#E8F0F5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Animated background circles */}
      {circles.map((circle, index) => {
        const circleRotate = circle.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        const sizes = [200, 300, 400];
        const positions = [
          { top: -100, right: -100 },
          { bottom: -150, left: -150 },
          { top: height / 2 - 200, right: width / 2 - 200 },
        ];

        return (
          <Animated.View
            key={`circle-${index}`}
            style={[
              styles.decorativeCircle,
              {
                width: sizes[index],
                height: sizes[index],
                ...positions[index],
                transform: [
                  { rotate: circleRotate },
                  { scale: circle.scale },
                ],
                opacity: 0.1,
              },
            ]}
          />
        );
      })}

      {/* Floating particles */}
      {particles.map((particle, index) => {
        const positions = [
          { top: '20%', left: '15%' },
          { top: '30%', right: '20%' },
          { top: '50%', left: '10%' },
          { top: '60%', right: '15%' },
          { bottom: '30%', left: '20%' },
          { bottom: '20%', right: '25%' },
          { top: '40%', left: '50%' },
          { bottom: '40%', right: '10%' },
        ];

        return (
          <Animated.View
            key={`particle-${index}`}
            style={[
              styles.particle,
              positions[index],
              {
                transform: [
                  { translateY: particle.translateY },
                  { translateX: particle.translateX },
                  { scale: particle.scale },
                ],
                opacity: particle.opacity,
              },
            ]}
          />
        );
      })}

      {/* Rotating ring decoration - behind logo */}
      <Animated.View
        style={[
          styles.rotatingRing,
          {
            transform: [{ rotate: rotateInterpolate }],
            opacity: fadeAnim,
          },
        ]}
      />

      {/* Main logo container - on top */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        {/* Subtle glow effect behind logo */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: 0.03,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        
        {/* Logo with shadow for visibility */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/Refyne Logo Design Concept png 1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 100,
    elevation: 100, // For Android
  },
  logoWrapper: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10, // For Android shadow
  },
  logo: {
    width: 280,
    height: 280,
    backgroundColor: 'transparent',
  },
  glowEffect: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#0C295C',
    zIndex: -1,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: '#0C295C',
    zIndex: 1,
    elevation: 1,
  },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0C295C',
    zIndex: 2,
    elevation: 2,
  },
  rotatingRing: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: '#0C295C',
    borderStyle: 'dashed',
    opacity: 0.15,
    zIndex: 5,
    elevation: 5,
  },
});

