// GhostPay Agent — Responsive Utilities
// Scales sizes based on device dimensions for consistent UI across all devices.

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design dimensions (iPhone 14 Pro equivalent)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

/**
 * Scale a value based on screen width (horizontal scaling)
 */
export function wp(widthPercent) {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * widthPercent) / 100);
}

/**
 * Scale a value based on screen height (vertical scaling)
 */
export function hp(heightPercent) {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * heightPercent) / 100);
}

/**
 * Scale a size value proportionally to screen width
 */
export function scale(size) {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
}

/**
 * Scale a size value proportionally to screen height
 */
export function verticalScale(size) {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size);
}

/**
 * Moderate scaling — applies a resize factor for less aggressive scaling.
 * factor = 0.5 (default) means 50% of the proportional difference is applied.
 */
export function moderateScale(size, factor = 0.5) {
  return PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);
}

/**
 * Scale font size with minimum/maximum clamping
 */
export function fontSize(size) {
  const scaled = moderateScale(size, 0.4);
  const minSize = size * 0.8;
  const maxSize = size * 1.3;
  return Math.max(minSize, Math.min(maxSize, scaled));
}

/**
 * Get responsive padding based on screen size
 */
export function responsivePadding() {
  if (SCREEN_WIDTH < 360) return 14;      // Small phones
  if (SCREEN_WIDTH < 400) return 18;      // Medium phones
  if (SCREEN_WIDTH < 430) return 20;      // Large phones
  return 24;                               // Tablets / XL phones
}

/**
 * Get responsive border radius
 */
export function responsiveRadius(base = 16) {
  if (SCREEN_WIDTH < 360) return base * 0.8;
  if (SCREEN_WIDTH >= 430) return base * 1.1;
  return base;
}

/**
 * Check if device is a small screen
 */
export function isSmallScreen() {
  return SCREEN_WIDTH < 375;
}

/**
 * Check if device is a tablet
 */
export function isTablet() {
  return SCREEN_WIDTH >= 768;
}

/**
 * Screen dimensions
 */
export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 375,
  isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 430,
  isLarge: SCREEN_WIDTH >= 430,
  isTablet: SCREEN_WIDTH >= 768,
};
