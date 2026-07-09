import { Stack } from 'expo-router';

/** Login é a tela inicial; "Criar conta" empilha /signup por cima. */
export const unstable_settings = { initialRouteName: 'login' };

/** Grupo de autenticação — telas sem header, exibidas quando não há sessão. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
