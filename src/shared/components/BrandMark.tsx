import { Group, Image, Text } from '@mantine/core';
import mark from '../../assets/brand/latk-mark.png';

export function BrandMark({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Group gap={8} wrap="nowrap">
      <Image src={mark} alt="L.A TK" w={size} h={size} fit="contain" />
      {withText && (
        <Text fw={800} size="lg" style={{ letterSpacing: 0.5 }}>
          L.A TK
        </Text>
      )}
    </Group>
  );
}
