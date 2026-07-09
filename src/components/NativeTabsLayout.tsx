import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

/**
 * Real native tab bar. On iOS 26 the system renders it as Liquid Glass (the true
 * "like Apple" material, with the active-tab highlight and transitions handled by
 * the OS). Used ONLY in development / standalone builds — Expo Go can't mount the
 * native views, so it falls back to the JS tab bar in {@link ../app/(tabs)/_layout}.
 *
 * Icons are SF Symbols (iOS); the `sf` names are type-checked against SFSymbol.
 */
export function NativeTabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="bubble.left.and.bubble.right.fill" />
        <Label>Conversas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="funnel">
        <Icon sf="line.3.horizontal.decrease.circle.fill" />
        <Label>Funil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="contacts">
        <Icon sf="person.2.fill" />
        <Label>Contatos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="companies">
        <Icon sf="building.2.fill" />
        <Label>Empresas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gearshape.fill" />
        <Label>Ajustes</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
