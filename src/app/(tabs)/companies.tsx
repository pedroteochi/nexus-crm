import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Plus } from 'lucide-react-native';

import { CompanyFormModal } from '@/components/CompanyFormModal';
import { CompanyListItem } from '@/components/CompanyListItem';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonLoading } from '@/components/SkeletonLoading';
import { useCrmStore } from '@/store/crmStore';
import type { Company } from '@/types/models';
import { matchesQuery } from '@/utils/search';

export default function CompaniesScreen() {
  const router = useRouter();
  const companies = useCrmStore((state) => state.companies);
  const hasHydrated = useCrmStore((state) => state.hasHydrated);

  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredCompanies = useMemo(
    () => companies.filter((company) => matchesQuery(`${company.name} ${company.industry}`, query)),
    [companies, query],
  );

  const handleOpenDetail = useCallback((id: string) => router.push(`/company/${id}`), [router]);

  const renderItem: ListRenderItem<Company> = useCallback(
    ({ item }) => (
      <CompanyListItem
        companyId={item.id}
        name={item.name}
        industry={item.industry}
        employees={item.employees}
        onPress={handleOpenDetail}
      />
    ),
    [handleOpenDetail],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-zinc-950">
      <ScreenHeader
        title="Empresas"
        subtitle={`${companies.length} ${companies.length === 1 ? 'empresa' : 'empresas'}`}
        action={
          <IconButton onPress={() => setAddOpen(true)} accessibilityLabel="Adicionar empresa">
            <Plus color="#4f46e5" size={24} />
          </IconButton>
        }
      />

      {!hasHydrated ? (
        <SkeletonLoading />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={<Building2 color="#a1a1aa" size={28} />}
          title="Nenhuma empresa ainda"
          description="Cadastre uma empresa para poder vincular contatos a ela."
          action={<PrimaryButton label="Adicionar empresa" onPress={() => setAddOpen(true)} />}
        />
      ) : (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por nome ou setor" />
          <FlatList
            data={filteredCompanies}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <Text className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
                Nenhuma empresa para “{query}”.
              </Text>
            }
          />
        </>
      )}

      <CompanyFormModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}
