import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MENU_WIDTH = 168;
const MENU_ROW_HEIGHT = 48;
const MENU_GAP = 8;
const DIM = 'rgba(12, 41, 92, 0.14)';

/**
 * Anchored message context menu (iMessage/Telegram-style).
 * Uses a full uniform light dim; the highlighted message is rendered
 * above the dim at its measured position (no rectangular hole/plate).
 */
export default function MessageContextMenu({
  visible,
  anchor,
  showReport = false,
  align = 'left',
  onCopy,
  onReport,
  onClose,
  floatingMessage = null,
}) {
  const menuLayout = useMemo(() => {
    if (!anchor) {
      return { top: 0, left: 0, placeAbove: false };
    }

    const rowCount = showReport ? 2 : 1;
    const menuHeight = MENU_ROW_HEIGHT * rowCount;
    const belowTop = anchor.y + anchor.height + MENU_GAP;
    const aboveTop = anchor.y - MENU_GAP - menuHeight;
    const spaceBelow = SCREEN_HEIGHT - belowTop;
    const placeAbove = spaceBelow < menuHeight + 12 && aboveTop > 12;

    let left =
      align === 'right'
        ? anchor.x + anchor.width - MENU_WIDTH
        : anchor.x;
    left = Math.max(12, Math.min(left, SCREEN_WIDTH - MENU_WIDTH - 12));

    let top = placeAbove ? aboveTop : belowTop;
    top = Math.max(12, Math.min(top, SCREEN_HEIGHT - menuHeight - 12));

    return { top, left, placeAbove, menuHeight };
  }, [anchor, showReport, align]);

  if (!visible || !anchor) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={styles.dim} onPress={onClose} />

        {floatingMessage ? (
          <View
            pointerEvents="none"
            style={[
              styles.floatingMessage,
              {
                top: anchor.y,
                left: anchor.x,
                width: anchor.width,
              },
            ]}
          >
            {floatingMessage}
          </View>
        ) : null}

        <View
          style={[
            styles.menu,
            {
              top: menuLayout.top,
              left: menuLayout.left,
              width: MENU_WIDTH,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.menuRow}
            onPress={onCopy}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={18} color="#0C295C" />
            <Text style={styles.menuLabel}>Copy</Text>
          </TouchableOpacity>

          {showReport ? (
            <>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuRow}
                onPress={onReport}
                activeOpacity={0.7}
              >
                <Ionicons name="flag" size={18} color="#E53935" />
                <Text style={[styles.menuLabel, styles.menuLabelDanger]}>
                  Report
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DIM,
  },
  floatingMessage: {
    position: 'absolute',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: MENU_ROW_HEIGHT,
  },
  menuLabel: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
  },
  menuLabelDanger: {
    color: '#E53935',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8EEF5',
    marginHorizontal: 12,
  },
});
