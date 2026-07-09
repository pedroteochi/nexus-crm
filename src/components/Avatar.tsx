import { memo } from 'react';
import { Text, View } from 'react-native';

import { colorFromString } from '@/utils/color';
import { getInitials } from '@/utils/initials';

interface AvatarProps {
  name: string;
  size?: number;
}

/** Circular avatar with auto initials and a deterministic color derived from the name. */
const AvatarComponent = ({ name, size = 44 }: AvatarProps) => (
  <View
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colorFromString(name),
    }}
    className="items-center justify-center"
  >
    <Text
      allowFontScaling={false}
      style={{ fontSize: Math.round(size * 0.4) }}
      className="font-semibold text-white"
    >
      {getInitials(name)}
    </Text>
  </View>
);

export const Avatar = memo(AvatarComponent);
